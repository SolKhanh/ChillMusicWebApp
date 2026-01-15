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
        userSongs: [],
        collections: []
    },

    // --- UTILS: Các hàm tiện ích dùng chung ---
    utils: {
        resolvePath(path) {
            if (!path || path === 'null') return '';
            if (path.startsWith('http')) return path;

            const ctx = App.config.contextPath || window.CURRENT_CONTEXT || '';
            return `${ctx}/${path}`.replace(/\/+/g, '/');
        },
        getElement(id) {
            return document.getElementById(id);
        }
    },

    async init() {
        await this.loadData();
        this.Auth.init();
        this.Sidebar.init();
        this.startClock();
        this.renderAmbientControls();
        this.setupMainPlayer();
        this.handleEvents();
        this.setupProgressBar();
        this.setupVolumeControl();
        this.changeBackground();
        this.startBackgroundSlideshow();
    },

    async loadData() {
        try {
            const urlSongs = this.utils.resolvePath(this.config.apiSongs);
            const urlSounds = this.utils.resolvePath(this.config.apiSounds);
            const urlBgs = this.utils.resolvePath(this.config.apiBackgrounds);

            const [songs, sounds, bgs] = await Promise.all([
                fetch(urlSongs).then(r => {
                    if (!r.ok) throw new Error(`Songs API error: ${r.status}`);
                    return r.json();
                }),
                fetch(urlSounds).then(r => r.json().catch(() => [])),
                fetch(urlBgs).then(r => r.json().catch(() => []))
            ]);

            this.state.songs = songs || [];
            this.state.sounds = sounds || [];
            this.state.backgrounds = bgs || [];

            if (this.state.songs.length > 0) this.updateSongUI();
        } catch (error) {
            console.error("Lỗi tải dữ liệu (LoadData):", error);
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
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: params
                });

                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    alert("Lỗi Server. Xem console.");
                    return;
                }

                if (res.ok && data.status === 'success') {
                    if (this.mode === 'login') {
                        this.onLoginSuccess(data);
                    } else {
                        alert("Đăng ký thành công! Vui lòng đăng nhập.");
                        this.switchMode();
                    }
                } else {
                    alert("Thông báo: " + (data.message || "Thao tác thất bại"));
                }
            } catch (e) {
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
            document.getElementById('login-status-dot').style.display = 'block';
            document.getElementById('guest-view').style.display = 'none';
            document.getElementById('user-view').style.display = 'block';
            document.getElementById('display-username').innerText = user.username;

            const adminOpt = document.getElementById('opt-admin-all');
            if (adminOpt) adminOpt.style.display = (user.role === 'ADMIN') ? 'block' : 'none';

            this.closeModal();
            App.Sidebar.loadUserContent();
        },

        onLogoutSuccess() {
            this.currentUser = null;
            App.state.currentUser = null;
            document.getElementById('login-status-dot').style.display = 'none';
            document.getElementById('guest-view').style.display = 'block';
            document.getElementById('user-view').style.display = 'none';

            App.state.userBackgrounds = [];
            App.state.userPlaylists = [];
            App.Sidebar.render();
        },

        togglePopup() {
            const popup = document.getElementById('user-popup');
            if (popup) popup.classList.toggle('active');
        },

        showModal(mode) {
            this.mode = mode;
            const modal = document.getElementById('auth-modal');
            const title = document.getElementById('auth-title');
            const switchTxt = document.getElementById('switch-auth-text');
            const switchLink = document.getElementById('switch-auth-link');

            if (modal) modal.classList.add('active');
            document.getElementById('user-popup').classList.remove('active');

            if (mode === 'login') {
                if (title) title.innerText = 'Đăng Nhập';
                if (switchTxt) switchTxt.innerText = 'Chưa có tài khoản?';
                if (switchLink) switchLink.innerText = 'Đăng ký ngay';
            } else {
                if (title) title.innerText = 'Đăng Ký';
                if (switchTxt) switchTxt.innerText = 'Đã có tài khoản?';
                if (switchLink) switchLink.innerText = 'Đăng nhập';
            }
        },

        closeModal() {
            document.getElementById('auth-modal').classList.remove('active');
        },
        switchMode() {
            this.showModal(this.mode === 'login' ? 'register' : 'login');
        }
    },

    // SIDEBAR
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
                sidebar.classList.toggle('active', show);
                overlay.classList.toggle('active', show);
            };

            const menuBtn = document.querySelector('.menu-container') || document.getElementById('menu-btn');
            if (menuBtn) menuBtn.onclick = () => toggle(true);
            if (document.getElementById('close-sidebar-btn')) document.getElementById('close-sidebar-btn').onclick = () => toggle(false);
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
                App.state.userSongs = [];
                App.state.userBackgrounds = [];
                App.state.collections = [];
                this.render();
                return;
            }

            try {
                const endpoint = App.utils.resolvePath('api/collections');
                const res = await fetch(endpoint);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success') {
                        const rawMyCols = data.myCollections.map(c => ({...c, type: 'OWNER'}));
                        const rawFollowedCols = data.followedCollections.map(c => ({...c, type: 'SUBSCRIBER'}));

                        App.state.collections = [...rawMyCols, ...rawFollowedCols];

                        App.state.collections.forEach(col => {
                            if (col.songs && Array.isArray(col.songs)) {
                                col.songs = col.songs.map(s => ({
                                    id: s.id,
                                    title: s.title,
                                    artist: s.artist,
                                    filePath: s.filePath,
                                    coverImage: s.coverImage || s.cover || App.config.defaultCover
                                }));
                            } else {
                                col.songs = [];
                            }

                            if (col.backgrounds && Array.isArray(col.backgrounds)) {
                                col.backgrounds = col.backgrounds.map(b => ({
                                    id: b.id,
                                    name: b.name,
                                    isAnimated: b.isAnimated
                                }));
                            } else {
                                col.backgrounds = [];
                            }
                        });

                        // let allUserBgs = [];
                        // App.state.collections.forEach(col => {
                        //     if (col.backgrounds && Array.isArray(col.backgrounds)) {
                        //         allUserBgs = [...allUserBgs, ...col.backgrounds];
                        //     }
                        // });
                        // App.state.userBackgrounds = allUserBgs;
                        //
                        // let allUserSongs = [];
                        // App.state.collections.forEach(col => {
                        //     if (col.songs && Array.isArray(col.songs)) {
                        //         const mappedSongs = col.songs.map(s => ({
                        //             id: s.id,
                        //             title: s.title,
                        //             artist: s.artist,
                        //             filePath: s.filePath,
                        //             coverImage: s.coverImage || s.cover || App.config.defaultCover
                        //         }));
                        //         allUserSongs.push(...mappedSongs);
                        //     }
                        // });

                        // const uniqueSongs = [];
                        // const seenIds = new Set();
                        // allUserSongs.forEach(song => {
                        //     if (!seenIds.has(song.id)) {
                        //         seenIds.add(song.id);
                        //         uniqueSongs.push(song);
                        //     }
                        // });

                        // App.state.userSongs = uniqueSongs;
                        this.render();
                    }
                }
            } catch (e) {
                console.error("Lỗi tải collection:", e);
            }
        },

        render() {
            this.renderShelf('bg-shelf-default', App.state.backgrounds, 'background');
            this.renderShelf('playlist-shelf-default', App.state.songs, 'song');

            const myCols = App.state.collections.filter(c => c.type === 'OWNER');
            const followCols = App.state.collections.filter(c => c.type === 'SUBSCRIBER');

            this.renderCollectionGroup('playlist-container-owner', myCols, 'song');
            this.renderCollectionGroup('playlist-container-subscriber', followCols, 'song');

            this.renderCollectionGroup('bg-container-owner', myCols, 'background');
            this.renderCollectionGroup('bg-container-subscriber', followCols, 'background');
        },

        renderCollectionGroup(containerId, collections, itemType) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';

            const validCollections = collections;

            if (validCollections.length === 0 && !containerId.includes('owner')) {
                return;
            }

            const groupHeader = document.createElement('h4');
            groupHeader.style.cssText = "padding: 0 15px; margin-bottom: 10px; opacity: 0.8; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;";
            groupHeader.innerText = containerId.includes('owner') ? "Của tôi" : "Đã theo dõi";
            container.appendChild(groupHeader);

            validCollections.forEach(col => {
                const dataList = (itemType === 'background') ? (col.backgrounds || []) : (col.songs || []);

                if (col.type !== 'OWNER' && dataList.length === 0) return;

                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'shelf-section';

                const title = document.createElement('h3');
                title.className = 'shelf-title';
                title.innerHTML = `${col.name} <span style="font-size:0.7em; opacity:0.6; font-weight: normal; margin-left: 5px;">(${dataList.length})</span>`;

                const shelfDiv = document.createElement('div');
                shelfDiv.className = 'shelf-scroll';

                const uniqueShelfId = `shelf-${itemType}-col-${col.id}`;
                shelfDiv.id = uniqueShelfId;

                sectionDiv.appendChild(title);
                sectionDiv.appendChild(shelfDiv);
                container.appendChild(sectionDiv);

                const isOwner = (col.type === 'OWNER');
                this.renderShelf(uniqueShelfId, dataList, itemType, isOwner, col.id);
            });
        },

        renderShelf(containerId, dataList, type, isUserShelf = false, collectionId = null) {
            const container = document.getElementById(containerId);
            if (!container) return;

            container.innerHTML = '';

            // Nút Add
            if (isUserShelf) {
                container.appendChild(this.createAddButton(type, collectionId));
            }

            if (!dataList || dataList.length === 0) return;

            const fragment = document.createDocumentFragment();

            dataList.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'shelf-item';

                let imgSrc = '';
                let title = '';

                if (type === 'background') {
                    const bgName = item.name || item;
                    imgSrc = App.utils.resolvePath(App.config.backgroundBaseUrl + bgName);
                    title = "Bg " + (index + 1);
                } else if (type === 'song') {
                    const cover = item.coverImage || item.cover || App.config.defaultCover;
                    imgSrc = App.utils.resolvePath(cover);
                    title = item.title;
                }

                div.innerHTML = `<img src="${imgSrc}" loading="lazy" alt="${title}">`;

                // --- XỬ LÝ CLICK ---
                div.onclick = () => {
                    if (type === 'background') {
                        App.state.backgrounds = dataList;

                        const newIndex = App.state.backgrounds.indexOf(item);

                        App.state.currentBgIndex = newIndex - 1;
                        App.changeBackground();
                        App.startBackgroundSlideshow();

                    } else if (type === 'song') {
                        App.state.songs = dataList;

                        let newIndex = App.state.songs.findIndex(s => s.id === item.id);
                        if (newIndex === -1) newIndex = index;

                        if (newIndex !== -1) {
                            App.loadSong(newIndex);
                        }
                    }
                };

                fragment.appendChild(div);
            });

            container.appendChild(fragment);
        },

        createAddButton(type, collectionId) {
            const div = document.createElement('div');
            div.className = 'shelf-item add-new';
            div.innerHTML = `<i class="fa-solid fa-plus"></i>`;
            div.onclick = () => this.handleUploadClick(type, collectionId);
            return div;
        },

        getUniquePlaylists(songs) {
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

        handleUploadClick(type, collectionId = null) {
            if (!App.Auth.currentUser) {
                App.Auth.showModal('login');
                return;
            }
            if (!collectionId) {
                const myCollections = App.state.collections.filter(c => c.type === 'OWNER');
                if (myCollections.length === 0) {
                    alert("Bạn chưa có Bộ sưu tập nào.");
                    return;
                }
                if (myCollections.length === 1) {
                    collectionId = myCollections[0].id;
                } else {
                    let msg = "Nhập ID Bộ sưu tập:\n" + myCollections.map(c => `[${c.id}] ${c.name}`).join('\n');
                    const input = prompt(msg);
                    if (!input) return;
                    collectionId = parseInt(input);
                }
            }

            const fileInput = document.getElementById('upload-input');
            fileInput.value = '';
            fileInput.click();

            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('file', file);
                formData.append('collectionId', collectionId);

                let endpointPath = '';
                if (type === 'background') endpointPath = 'api/upload/background';
                else if (type === 'song') {
                    const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
                    const title = prompt("Tên bài hát:", defaultTitle) || defaultTitle;
                    const artist = prompt("Tên nghệ sĩ:", "Unknown") || "Unknown";
                    formData.append('title', title);
                    formData.append('artist', artist);
                    endpointPath = 'api/upload/song';
                }

                try {
                    const res = await fetch(App.utils.resolvePath(endpointPath), {method: 'POST', body: formData});
                    const data = await res.json();

                    if (res.ok && data.status === 'success') {
                        const targetCol = App.state.collections.find(c => c.id === collectionId);

                        if (type === 'background') {
                            const newBg = {id: data.id, name: data.fileName};
                            if (!targetCol.backgrounds) targetCol.backgrounds = [];
                            targetCol.backgrounds.push(newBg);
                            App.state.userBackgrounds.push(newBg);
                            alert("Upload ảnh thành công!");
                        } else if (type === 'song') {
                            const newSong = {
                                id: data.id,
                                title: data.title || "No Title",
                                artist: data.artist || "Unknown",
                                filePath: data.filePath,
                                cover: 'assets/img/covers/cover.jpg'
                            };
                            if (!targetCol.songs) targetCol.songs = [];
                            targetCol.songs.push(newSong);
                            const uiPl = App.state.userPlaylists.find(a => a.id === collectionId);
                            if (uiPl) {
                                if (!uiPl.songs) uiPl.songs = [];
                                uiPl.songs.push(newSong);
                            }
                            alert("Upload nhạc thành công!");
                        }
                        this.render();
                    } else {
                        alert("Lỗi: " + data.message);
                    }
                } catch (err) {
                    alert("Lỗi kết nối.");
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
        if (index >= this.state.songs.length) index = 0;

        this.state.currentSongIndex = index;
        const song = this.state.songs[index];
        if (!song) return;

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
        const bgBlur = document.querySelector('.background-blur');

        if (coverEl) coverEl.src = coverSrc;
        if (labelEl) labelEl.src = coverSrc;
        if (bgBlur) bgBlur.src = coverSrc;
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
        if (!bgs || !bgs.length) return;

        // Cập nhật index
        this.state.currentBgIndex = (this.state.currentBgIndex + 1) % bgs.length;

        // Lấy item
        const item = bgs[this.state.currentBgIndex];
        const bgName = (typeof item === 'object') ? item.name : item;

        if (bgName) {
            const path = App.utils.resolvePath(this.config.backgroundBaseUrl + bgName);
            this.changeBackgroundDirect(path);
        }
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

}
document.addEventListener('DOMContentLoaded', () => App.init());