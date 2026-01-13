const App = {
    config: {
        apiSongs: 'api/songs',
        apiSounds: 'api/sounds',
        apiBackgrounds: 'api/backgrounds',
        imgBaseUrl: 'assets/img/',
        backgroundBaseUrl: 'assets/img/backgrounds/',
        defaultCover: 'assets/img/covers/cover.jpg'
    },
    state: {
        songs: [],
        sounds: [],
        backgrounds: [],

        // State Player
        currentSongIndex: 0,
        mainAudio: new Audio(),
        isPlaying: false,
        ambientAudios: {},

        // State Background Slide
        currentBgIndex: -1,
        bgIntervalTime: 10000,
        bgTimerId: null,

        // State User (Dữ liệu riêng)
        userBackgrounds: [],
        userAlbums: [],
        collections: []
    },

    // --- UTILS: Các hàm tiện ích dùng chung ---
    utils: {
        resolvePath(path) {
            if (!path || path === 'null') return '';
            if (path.startsWith('http')) return path;
            const ctx = window.CURRENT_CONTEXT || '';
            return `${ctx}/${path}`.replace(/\/\//g, '/'); // Fix lỗi 2 dấu //
        },
        getElement(id) { return document.getElementById(id); }
    },

    async init() {
        console.log("App initializing...");
        await this.loadData();

        // 1. Khởi tạo Auth (Check login trước)
        this.Auth.init();

        // 2. Khởi tạo Sidebar
        this.Sidebar.init();

        // 3. Khởi tạo Player & Môi trường
        this.startClock();
        this.renderAmbientControls();
        this.setupMainPlayer();
        this.handleEvents();
        this.setupProgressBar();
        this.setupVolumeControl();

        // 4. Slide nền
        this.changeBackground();
        this.startBackgroundSlideshow();
    },

    async loadData() {
        try {
            const [songs, sounds, bgs] = await Promise.all([
                fetch(this.config.apiSongs).then(r => r.json()),
                fetch(this.config.apiSounds).then(r => r.json()),
                fetch(this.config.apiBackgrounds).then(r => r.json())
            ]);
            this.state.songs = songs || [];
            this.state.sounds = sounds || [];
            this.state.backgrounds = bgs || [];

            // Cập nhật UI bài hát đầu tiên nếu có
            if (this.state.songs.length > 0) this.updateSongUI();
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
            this.state.songs = [];
        }
    },
    // AUTHENTICATION (Xử lý User, Login, Popup)
    Auth: {
        currentUser: null,
        mode: 'login', // 'login' | 'register'

        init() {
            this.setupEvents();
            this.checkSession();
        },

        setupEvents() {
            const bind = (id, fn) => {
                const el = document.getElementById(id);
                if (el) el.onclick = fn;
            };

            // Nút User ở góc
            const userBtn = document.getElementById('user-btn');
            if (userBtn) {
                userBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.togglePopup();
                };
            }

            // Các nút thao tác
            bind('btn-open-login', () => this.showModal('login'));
            bind('btn-open-register', () => this.showModal('register'));
            bind('btn-logout', () => this.logout());
            bind('btn-close-auth', () => this.closeModal());

            // Link chuyển đổi Login <-> Register
            const switchLink = document.getElementById('switch-auth-link');
            if (switchLink) {
                switchLink.onclick = (e) => { e.preventDefault(); this.switchMode(); };
            }

            // Form Submit
            const form = document.getElementById('auth-form');
            if (form) form.onsubmit = (e) => this.handleSubmit(e);

            // Click Overlay để đóng modal
            const overlay = document.getElementById('auth-modal');
            if (overlay) {
                overlay.onclick = (e) => { if (e.target === overlay) this.closeModal(); };
            }

            // Click toàn trang để đóng User Popup
            document.addEventListener('click', (e) => {
                const popup = document.getElementById('user-popup');
                if (popup && popup.classList.contains('active') && !popup.contains(e.target) && userBtn !== e.target) {
                    popup.classList.remove('active');
                }
            });
        },

        async checkSession() {
            try {
                const res = await fetch('api/auth/me');
                if (res.ok) this.onLoginSuccess(await res.json());
                else this.onLogoutSuccess();
            } catch (e) { console.error("Auth check failed", e); }
        },

        async handleSubmit(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const email = document.getElementById('email').value;

            const endpoint = this.mode === 'login' ? 'api/auth/login' : 'api/auth/register';
            const body = { username, password, email: this.mode === 'register' ? email : undefined };

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (res.ok) {
                    this.onLoginSuccess(await res.json());
                    alert("Thành công!");
                } else {
                    alert("Lỗi: " + await res.text());
                }
            } catch (e) { alert("Lỗi kết nối server"); }
        },

        async logout() {
            await fetch('api/auth/logout', { method: 'POST' });
            this.onLogoutSuccess();
        },

        // --- Cập nhật UI ---
        onLoginSuccess(user) {
            this.currentUser = user;
            App.state.currentUser = user; // Sync với state gốc nếu cần

            document.getElementById('login-status-dot').style.display = 'block';
            document.getElementById('guest-view').style.display = 'none';
            document.getElementById('user-view').style.display = 'block';
            document.getElementById('display-username').innerText = user.username;

            // Ẩn hiện tính năng Admin
            const adminOpt = document.getElementById('opt-admin-all');
            if(adminOpt) adminOpt.style.display = (user.role === 'ADMIN') ? 'block' : 'none';

            this.closeModal();

            // Load dữ liệu cá nhân user
            App.Sidebar.loadUserContent();
        },

        onLogoutSuccess() {
            this.currentUser = null;
            App.state.currentUser = null;

            document.getElementById('login-status-dot').style.display = 'none';
            document.getElementById('guest-view').style.display = 'block';
            document.getElementById('user-view').style.display = 'none';

            // Xóa dữ liệu user trên Sidebar
            App.state.userBackgrounds = [];
            App.state.userAlbums = [];
            App.Sidebar.render();
        },

        togglePopup() { document.getElementById('user-popup').classList.toggle('active'); },

        showModal(mode) {
            this.mode = mode;
            const modal = document.getElementById('auth-modal');
            const title = document.getElementById('auth-title');
            const emailIn = document.getElementById('email');
            const switchTxt = document.getElementById('switch-auth-text');
            const switchLink = document.getElementById('switch-auth-link');

            modal.classList.add('active');
            document.getElementById('user-popup').classList.remove('active'); // Đóng popup nhỏ

            if (mode === 'login') {
                title.innerText = 'Đăng Nhập';
                emailIn.style.display = 'none';
                if(switchTxt) switchTxt.innerText = 'Chưa có tài khoản?';
                if(switchLink) switchLink.innerText = 'Đăng ký ngay';
            } else {
                title.innerText = 'Đăng Ký';
                emailIn.style.display = 'block';
                if(switchTxt) switchTxt.innerText = 'Đã có tài khoản?';
                if(switchLink) switchLink.innerText = 'Đăng nhập';
            }
        },

        closeModal() { document.getElementById('auth-modal').classList.remove('active'); },
        switchMode() { this.showModal(this.mode === 'login' ? 'register' : 'login'); }
    },

    //SIDEBAR (Menu, Kệ sách, Tab)
    Sidebar: {
        init() {
            this.setupToggle();
            this.setupTabs();
            this.render(); // Render lần đầu
        },

        setupToggle() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            const toggle = (show) => {
                sidebar.classList.toggle('active', show);
                overlay?.classList.toggle('active', show);
            };

            const menuBtn = document.querySelector('.menu-container') || document.getElementById('menu-btn');
            if (menuBtn) menuBtn.onclick = () => toggle(true);

            const closeBtn = document.getElementById('close-sidebar-btn');
            if (closeBtn) closeBtn.onclick = () => toggle(false);
            if (overlay) overlay.onclick = () => toggle(false);
        },

        setupTabs() {
            const tabs = document.querySelectorAll('.tab-btn');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.tab-btn, .tab-pane').forEach(el => el.classList.remove('active'));
                    tab.classList.add('active');
                    const target = document.getElementById(`tab-${tab.dataset.tab}`);
                    if (target) target.classList.add('active');
                });
            });
        },

        // API: Tải dữ liệu riêng của User
        async loadUserContent() {
            // Ví dụ: Gọi API lấy background riêng
            // const res = await fetch('api/user/backgrounds');
            // App.state.userBackgrounds = await res.json();
            // this.render();
        },

        render() {
            // Render Default
            this.renderShelf('bg-shelf-default', App.state.backgrounds, 'background');
            this.renderShelf('album-shelf-default', this.getUniqueAlbums(App.state.songs), 'album');

            // Render User
            this.renderShelf('bg-shelf-user', App.state.userBackgrounds, 'background', true);
            this.renderShelf('album-shelf-user', App.state.userAlbums, 'album', true);
        },

        // Hàm Render Generic
        renderShelf(containerId, dataList, type, isUserShelf = false) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Xóa items cũ, giữ lại nút "Add New"
            if (isUserShelf) {
                const items = container.querySelectorAll('.shelf-item:not(.add-new)');
                items.forEach(i => i.remove());
            } else {
                container.innerHTML = '';
            }

            if (!dataList) return;

            // Dùng DocumentFragment để tăng hiệu năng (chỉ paint 1 lần)
            const fragment = document.createDocumentFragment();

            dataList.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'shelf-item';

                // --- Xử lý hiển thị từng loại ---
                if (type === 'background') {
                    const src = App.utils.resolvePath(App.config.backgroundBaseUrl + (item.name || item));
                    div.innerHTML = `<img src="${src}" loading="lazy" alt="bg">`;
                    div.onclick = () => {
                        if (isUserShelf) App.changeBackgroundDirect(src);
                        else {
                            App.state.currentBgIndex = index - 1;
                            App.changeBackground();
                            App.startBackgroundSlideshow();
                        }
                    };
                } else if (type === 'album') {
                    const src = App.utils.resolvePath(item.coverImage || item.cover);
                    div.innerHTML = `<img src="${src}" loading="lazy" alt="album">`;
                    div.onclick = () => App.loadSong(item.originalIndex);
                }

                fragment.appendChild(div);
            });

            // Chèn vào DOM
            if (isUserShelf) {
                const addBtn = container.querySelector('.add-new');
                addBtn ? container.insertBefore(fragment, addBtn) : container.appendChild(fragment);
            } else {
                container.appendChild(fragment);
            }
        },

        getUniqueAlbums(songs) {
            const unique = [];
            const seen = new Set();
            songs.forEach((song, idx) => {
                const key = song.album || song.title;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push({...song, originalIndex: idx});
                }
            });
            return unique;
        }
    },
    // PLAYER & LOGIC KHÁC
    startClock() {
        const update = () => {
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const clock = document.getElementById('clock');
            if (clock) clock.innerHTML = `${hours}:${minutes} <span style="font-size: 0.5em; vertical-align: middle;">${ampm}</span>`;
        };
        setInterval(update, 1000); update();
    },

    setupMainPlayer() {
        if (this.state.songs.length > 0) this.loadSong(0);
        this.state.mainAudio.onended = () => this.nextSong();
    },

    loadSong(index) {
        this.state.currentSongIndex = index;
        const song = this.state.songs[index];
        if (!song) return;

        this.state.mainAudio.src = App.utils.resolvePath(song.filePath);
        this.updateSongUI();

        // Update Play Button Icon
        const playBtn = document.querySelector('.play-pause-btn');
        if (this.state.isPlaying) {
            this.state.mainAudio.play();
            if(playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            if(playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    },

    updateSongUI() {
        const song = this.state.songs[this.state.currentSongIndex];
        if (!song) return;

        const titleEl = document.querySelector('.song-details .title');
        const artistEl = document.querySelector('.song-details .artist');
        if(titleEl) titleEl.innerText = song.title;
        if(artistEl) artistEl.innerText = song.artist;

        // Xử lý ảnh cover
        const rawCover = song.coverImage || song.cover;
        const coverSrc = (!rawCover || rawCover === 'null')
            ? App.utils.resolvePath(this.config.defaultCover)
            : App.utils.resolvePath(rawCover);

        const coverEl = document.querySelector('.vn-cover img');
        const labelEl = document.querySelector('.vn-print img');
        if (coverEl) coverEl.src = coverSrc;
        if (labelEl) labelEl.src = coverSrc;
    },

    nextSong() {
        let newIndex = (this.state.currentSongIndex + 1) % this.state.songs.length;
        this.loadSong(newIndex);
    },

    prevSong() {
        let newIndex = (this.state.currentSongIndex - 1 + this.state.songs.length) % this.state.songs.length;
        this.loadSong(newIndex);
    },

    handleEvents() {
        // Player buttons
        const playBtn = document.querySelector('.play-pause-btn');
        if (playBtn) playBtn.onclick = () => {
            if (this.state.mainAudio.paused) {
                this.state.mainAudio.play();
                this.state.isPlaying = true;
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                this.state.mainAudio.pause();
                this.state.isPlaying = false;
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        };
        const nextBtn = document.querySelector('.next-btn');
        const prevBtn = document.querySelector('.prev-btn');
        if(nextBtn) nextBtn.onclick = () => this.nextSong();
        if(prevBtn) prevBtn.onclick = () => this.prevSong();

        // Ambient Sound Controls
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('ambient-slider')) {
                const id = e.target.dataset.soundId;
                const audio = this.state.ambientAudios[id];
                if (audio) {
                    audio.volume = e.target.value;
                    (audio.volume > 0 && audio.paused) ? audio.play() : (audio.volume == 0 && audio.pause());
                }
            }
        });
    },

    renderAmbientControls() {
        const container = document.getElementById('ambient-sounds-panel');
        if (!container) return;
        container.innerHTML = '';
        this.state.sounds.forEach(sound => {
            const audio = new Audio(App.utils.resolvePath(sound.filePath));
            audio.loop = true; audio.volume = 0;
            this.state.ambientAudios[sound.id] = audio;

            const div = document.createElement('div');
            div.className = 'ambient-control';
            div.innerHTML = `
                <div class="ambient-info" style="color:#fff"><i class="fa-solid ${sound.iconClass || 'fa-music'}"></i> ${sound.name}</div>
                <input type="range" class="ambient-slider" min="0" max="1" step="0.01" value="0" data-sound-id="${sound.id}">
            `;
            container.appendChild(div);
        });
    },

    setupProgressBar() {
        const audio = this.state.mainAudio;
        const slider = document.getElementById('progress-slider');
        const curEl = document.querySelector('.current-time');
        const durEl = document.querySelector('.duration');
        if(!slider) return;

        const fmt = (s) => { const m=Math.floor(s/60), sec=Math.floor(s%60); return `${m}:${sec<10?'0':''}${sec}`; };

        audio.addEventListener('loadedmetadata', () => {
            if(isFinite(audio.duration)) { slider.max = audio.duration; durEl.innerText = fmt(audio.duration); }
        });
        audio.addEventListener('timeupdate', () => {
            slider.value = audio.currentTime;
            curEl.innerText = fmt(audio.currentTime);
        });
        slider.addEventListener('input', (e) => audio.currentTime = e.target.value);
    },

    setupVolumeControl() {
        const slider = document.getElementById('volume-slider');
        const icon = document.getElementById('volume-icon');
        if(!slider) return;
        const updateIcon = (v) => {
            icon.className = 'fa-solid ' + (v===0 ? 'fa-volume-mute' : v<0.5 ? 'fa-volume-low' : 'fa-volume-high');
        };
        slider.addEventListener('input', (e) => {
            this.state.mainAudio.volume = e.target.value;
            updateIcon(parseFloat(e.target.value));
        });
        icon.addEventListener('click', () => {
            if(this.state.mainAudio.volume > 0) {
                this.savedVol = this.state.mainAudio.volume;
                this.state.mainAudio.volume = 0;
                slider.value = 0;
            } else {
                this.state.mainAudio.volume = this.savedVol || 0.5;
                slider.value = this.state.mainAudio.volume;
            }
            updateIcon(this.state.mainAudio.volume);
        });
    },

    changeBackground() {
        const bgs = this.state.backgrounds;
        if (!bgs.length) return;

        this.state.currentBgIndex = (this.state.currentBgIndex + 1) % bgs.length;
        const path = App.utils.resolvePath(this.config.backgroundBaseUrl + bgs[this.state.currentBgIndex].name);
        this.changeBackgroundDirect(path);
    },

    changeBackgroundDirect(path) {
        const bgContainer = document.getElementById('background-container');
        if (bgContainer) {
            const img = new Image();
            img.onload = () => { bgContainer.style.backgroundImage = `url('${path}')`; };
            img.src = path;
        }
    },

    startBackgroundSlideshow() {
        if (this.state.bgTimerId) clearInterval(this.state.bgTimerId);
        this.state.bgTimerId = setInterval(() => this.changeBackground(), this.state.bgIntervalTime);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());