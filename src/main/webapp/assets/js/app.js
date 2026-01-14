const App = {
    config: {
        contextPath: '/Chillscape',

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

        // State User
        userBackgrounds: [],
        userAlbums: [],
        collections: []
    },

    // --- UTILS: Các hàm tiện ích dùng chung ---
    utils: {
        resolvePath(path) {
            if (!path || path === 'null') return '';
            if (path.startsWith('http')) return path;

            // Lấy Context Path từ config hoặc biến global
            const ctx = App.config.contextPath || window.CURRENT_CONTEXT || '';

            return `${ctx}/${path}`.replace(/\/+/g, '/');
        },
        getElement(id) {
            return document.getElementById(id);
        }
    },

    async init() {
        await this.loadData();

        // 1. Khởi tạo Auth
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
            const urlSongs = this.utils.resolvePath(this.config.apiSongs);
            const urlSounds = this.utils.resolvePath(this.config.apiSounds);
            const urlBgs = this.utils.resolvePath(this.config.apiBackgrounds);

            console.log("Fetching from:", urlSongs);

            const [songs, sounds, bgs] = await Promise.all([
                fetch(urlSongs).then(r => {
                    if (!r.ok) throw new Error(`Songs API error: ${r.status}`);
                    return r.json();
                }),
                fetch(urlSounds).then(r => r.json().catch(() => [])), // Catch lỗi nhẹ để không chết app
                fetch(urlBgs).then(r => r.json().catch(() => []))
            ]);

            this.state.songs = songs || [];
            this.state.sounds = sounds || [];
            this.state.backgrounds = bgs || [];

            // Cập nhật UI bài hát đầu tiên nếu có
            if (this.state.songs.length > 0) this.updateSongUI();
        } catch (error) {
            console.error("Lỗi tải dữ liệu (LoadData):", error);
            // Dữ liệu giả phòng hờ (Fallback) nếu cần
            this.state.songs = [];
        }
    },

    // AUTHENTICATION
    Auth: {
        currentUser: null,
        mode: 'login',

        init() {
            this.setupEvents();
            this.checkSession();
        },

        setupEvents() {
            const bind = (id, fn) => {
                const el = document.getElementById(id);
                if (el) el.onclick = fn;
            };

            const userBtn = document.getElementById('user-btn');
            if (userBtn) {
                userBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.togglePopup();
                };
            }

            bind('btn-open-login', () => this.showModal('login'));
            bind('btn-open-register', () => this.showModal('register'));
            bind('btn-logout', () => this.logout());
            bind('btn-close-auth', () => this.closeModal());

            const switchLink = document.getElementById('switch-auth-link');
            if (switchLink) {
                switchLink.onclick = (e) => {
                    e.preventDefault();
                    this.switchMode();
                };
            }

            const form = document.getElementById('auth-form');
            if (form) form.onsubmit = (e) => this.handleSubmit(e);

            const overlay = document.getElementById('auth-modal');
            if (overlay) {
                overlay.onclick = (e) => {
                    if (e.target === overlay) this.closeModal();
                };
            }

            document.addEventListener('click', (e) => {
                const popup = document.getElementById('user-popup');
                if (popup && popup.classList.contains('active') && !popup.contains(e.target) && userBtn !== e.target) {
                    popup.classList.remove('active');
                }
            });
        },

        async checkSession() {
            try {
                const endpoint = App.utils.resolvePath('api/auth/check');
                const res = await fetch(endpoint);

                const contentType = res.headers.get("content-type");
                if (res.ok && contentType && contentType.indexOf("application/json") !== -1) {
                    const data = await res.json();
                    if (data.status === 'success') {
                        this.onLoginSuccess(data);
                    } else {
                        this.onLogoutSuccess();
                    }
                } else {
                    this.onLogoutSuccess();
                }
            } catch (e) {
                console.error("Auth check failed", e);
                this.onLogoutSuccess();
            }
        },

        async handleSubmit(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            const path = this.mode === 'login' ? 'api/auth/login' : 'api/auth/register';
            const endpoint = App.utils.resolvePath(path);

            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params
                });

                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    console.error("Server Response (Not JSON):", text);
                    alert("Lỗi Server (HTML Error). Xem console để biết chi tiết.");
                    return;
                }

                if (res.ok && data.status === 'success') {
                    if(this.mode === 'login'){
                        this.onLoginSuccess(data);
                    }else {
                        alert("Đăng ký thành công! Vui lòng đăng nhập.");
                        this.switchMode();
                    }
                } else {
                    alert("Thông báo: " + (data.message || "Thao tác thất bại"));
                }
            } catch (e) {
                console.error(e);
                alert("Lỗi kết nối server");
            }
        },

        async logout() {
            const endpoint = App.utils.resolvePath('api/auth/logout');
            await fetch(endpoint, {method: 'POST'});
            this.onLogoutSuccess();
        },

        onLoginSuccess(user) {
            this.currentUser = user;
            App.state.currentUser = user;

            const dot = document.getElementById('login-status-dot');
            const guestView = document.getElementById('guest-view');
            const userView = document.getElementById('user-view');
            const nameDisplay = document.getElementById('display-username');

            if(dot) dot.style.display = 'block';
            if(guestView) guestView.style.display = 'none';
            if(userView) userView.style.display = 'block';
            if(nameDisplay) nameDisplay.innerText = user.username;

            const adminOpt = document.getElementById('opt-admin-all');
            if (adminOpt) adminOpt.style.display = (user.role === 'ADMIN') ? 'block' : 'none';

            this.closeModal();
            App.Sidebar.loadUserContent();
        },

        onLogoutSuccess() {
            this.currentUser = null;
            App.state.currentUser = null;

            const dot = document.getElementById('login-status-dot');
            const guestView = document.getElementById('guest-view');
            const userView = document.getElementById('user-view');

            if(dot) dot.style.display = 'none';
            if(guestView) guestView.style.display = 'block';
            if(userView) userView.style.display = 'none';

            App.state.userBackgrounds = [];
            App.state.userAlbums = [];
            App.Sidebar.render();
        },

        togglePopup() {
            const popup = document.getElementById('user-popup');
            if(popup) popup.classList.toggle('active');
        },

        showModal(mode) {
            this.mode = mode;
            const modal = document.getElementById('auth-modal');
            const title = document.getElementById('auth-title');
            const switchTxt = document.getElementById('switch-auth-text');
            const switchLink = document.getElementById('switch-auth-link');

            if(modal) modal.classList.add('active');
            const popup = document.getElementById('user-popup');
            if(popup) popup.classList.remove('active');

            if (mode === 'login') {
                if(title) title.innerText = 'Đăng Nhập';
                if (switchTxt) switchTxt.innerText = 'Chưa có tài khoản?';
                if (switchLink) switchLink.innerText = 'Đăng ký ngay';
            } else {
                if(title) title.innerText = 'Đăng Ký';
                if (switchTxt) switchTxt.innerText = 'Đã có tài khoản?';
                if (switchLink) switchLink.innerText = 'Đăng nhập';
            }
        },

        closeModal() {
            const modal = document.getElementById('auth-modal');
            if(modal) modal.classList.remove('active');
        },
        switchMode() {
            this.showModal(this.mode === 'login' ? 'register' : 'login');
        }
    },

    //SIDEBAR
    Sidebar: {
        init() {
            this.setupToggle();
            this.setupTabs();
            this.render();
        },

        setupToggle() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            const toggle = (show) => {
                if(sidebar) sidebar.classList.toggle('active', show);
                if(overlay) overlay.classList.toggle('active', show);
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

        async loadUserContent() {
            if (!App.Auth.currentUser) {
                App.state.userAlbums = [];
                this.render();
                return;
            }

            try {
                // SỬA: dùng resolvePath
                const endpoint = App.utils.resolvePath('api/collections');
                const res = await fetch(endpoint);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success') {
                        const myCols = data.myCollections.map(c => ({
                            id: c.id,
                            title: c.name,
                            artist: 'My Collection',
                            cover: 'assets/img/covers/cover.jpg',
                            shareCode: c.shareCode,
                            type: 'OWNER'
                        }));

                        const followedCols = data.followedCollections.map(c => ({
                            id: c.id,
                            title: c.name,
                            artist: 'Followed',
                            cover: 'assets/img/covers/cover.jpg',
                            shareCode: c.shareCode,
                            type: 'SUBSCRIBER'
                        }));

                        App.state.userAlbums = [...myCols, ...followedCols];
                        this.render();
                    }
                }
            } catch (e) {
                console.error("Lỗi tải collection:", e);
            }
        },

        render() {
            this.renderShelf('bg-shelf-default', App.state.backgrounds, 'background');
            this.renderShelf('album-shelf-default', this.getUniqueAlbums(App.state.songs), 'album');
            this.renderShelf('bg-shelf-user', App.state.userBackgrounds || [], 'background', true);
            this.renderShelf('album-shelf-user', App.state.userAlbums || [], 'album', true);
        },

        renderShelf(containerId, dataList, type, isUserShelf = false) {
            const container = document.getElementById(containerId);
            if (!container) return;

            container.innerHTML = '';
            if (!dataList) return;

            const fragment = document.createDocumentFragment();

            dataList.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'shelf-item';

                if (type === 'background') {
                    // SỬA: dùng resolvePath cho ảnh
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
                    // SỬA: dùng resolvePath cho ảnh cover
                    const src = App.utils.resolvePath(item.coverImage || item.cover);
                    div.innerHTML = `<img src="${src}" loading="lazy" alt="album">`;
                    div.onclick = () => App.loadSong(item.originalIndex);
                }

                fragment.appendChild(div);
            });

            if (isUserShelf) {
                const addBtn = this.createAddButton(type);
                fragment.appendChild(addBtn);
            }
            container.appendChild(fragment);
        },

        createAddButton(type) {
            const div = document.createElement('div');
            div.className = 'shelf-item add-new';
            div.innerHTML = `<i class="fa-solid fa-plus"></i>`;
            div.onclick = () => this.handleUploadClick(type);
            return div;
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
        },

        handleUploadClick(type) {
            if (!App.Auth.currentUser) {
                App.Auth.showModal('login');
                return;
            }
            const fileInput = document.getElementById('upload-input');
            if (!fileInput) return;

            fileInput.value = '';
            fileInput.click();

            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (type !== 'background') {
                    alert("Hiện tại chỉ hỗ trợ upload Background.");
                    return;
                }

                const formData = new FormData();
                formData.append('file', file);

                try {
                    // SỬA: dùng resolvePath
                    const endpoint = App.utils.resolvePath('api/upload-background');
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        const newBgData = await response.json();
                        this.state.userBackgrounds.push(newBgData);
                        this.renderListToShelf('bg-shelf-user', this.state.userBackgrounds, 'background', true);

                        const fullPath = App.utils.resolvePath(this.config.backgroundBaseUrl + newBgData.name);
                        this.changeBackgroundDirect(fullPath);
                    } else {
                        alert("Upload thất bại!");
                    }
                } catch (error) {
                    alert("Có lỗi xảy ra khi kết nối server.");
                }
            };
        },
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
        setInterval(update, 1000);
        update();
    },

    setupMainPlayer() {
        if (this.state.songs.length > 0) this.loadSong(0);
        this.state.mainAudio.onended = () => this.nextSong();
    },

    loadSong(index) {
        this.state.currentSongIndex = index;
        const song = this.state.songs[index];
        if (!song) return;

        // SỬA: dùng resolvePath cho file nhạc
        this.state.mainAudio.src = App.utils.resolvePath(song.filePath);
        this.updateSongUI();

        const playBtn = document.querySelector('.play-pause-btn');
        if (this.state.isPlaying) {
            this.state.mainAudio.play().catch(e => console.error("Auto-play blocked", e));
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    },

    updateSongUI() {
        const song = this.state.songs[this.state.currentSongIndex];
        if (!song) return;

        const titleEl = document.querySelector('.song-details .title');
        const artistEl = document.querySelector('.song-details .artist');
        if (titleEl) titleEl.innerText = song.title;
        if (artistEl) artistEl.innerText = song.artist;

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
        if (nextBtn) nextBtn.onclick = () => this.nextSong();
        if (prevBtn) prevBtn.onclick = () => this.prevSong();

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
            // SỬA: dùng resolvePath cho âm thanh môi trường
            const audio = new Audio(App.utils.resolvePath(sound.filePath));
            audio.loop = true;
            audio.volume = 0;
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
        if (!slider) return;

        const fmt = (s) => {
            const m = Math.floor(s / 60), sec = Math.floor(s % 60);
            return `${m}:${sec < 10 ? '0' : ''}${sec}`;
        };

        audio.addEventListener('loadedmetadata', () => {
            if (isFinite(audio.duration)) {
                slider.max = audio.duration;
                durEl.innerText = fmt(audio.duration);
            }
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
        if (!slider) return;
        const updateIcon = (v) => {
            icon.className = 'fa-solid ' + (v === 0 ? 'fa-volume-mute' : v < 0.5 ? 'fa-volume-low' : 'fa-volume-high');
        };
        slider.addEventListener('input', (e) => {
            this.state.mainAudio.volume = e.target.value;
            updateIcon(parseFloat(e.target.value));
        });
        icon.addEventListener('click', () => {
            if (this.state.mainAudio.volume > 0) {
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
            img.onload = () => {
                bgContainer.style.backgroundImage = `url('${path}')`;
            };
            img.src = path;
        }
    },

    startBackgroundSlideshow() {
        if (this.state.bgTimerId) clearInterval(this.state.bgTimerId);
        this.state.bgTimerId = setInterval(() => this.changeBackground(), this.state.bgIntervalTime);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());