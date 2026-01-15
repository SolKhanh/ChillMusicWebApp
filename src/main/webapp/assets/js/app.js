const App = {
    config: {
        contextPath: '/Chillscape',
        apiSongs: 'api/songs',
        apiSounds: 'api/sounds',
        apiBackgrounds: 'api/backgrounds',
        imgBaseUrl: 'assets/img/',

        backgroundBaseUrl: 'assets/img/backgrounds/',
        defaultCover: 'assets/img/covers/cover.jpg',
        DEFAULT_BG_INTERVAL: 5 * 60 * 1000,
        CLOCK_UPDATE_INTERVAL: 1000,
        INACTIVITY_TIMEOUT: 10000,
    },

    state: {
        songs: [],
        sounds: [],
        backgrounds: [],
        currentSongIndex: 0,
        currentBgIndex: -1,

        //  Player (User UI)
        mainAudio: new Audio(),
        ambientAudios: {},
        isPlaying: false,
        isShuffle: false,
        repeatMode: 'none',
        savedVolume: 0.5,

        // Visualizer & Zen
        isZenMode: false,
        inactivityTimer: null,
        audioContext: null,
        analyser: null,
        dataArray: null,
        source: null,
        animationId: null,

        // Backend/User
        currentUser: null,
        userBackgrounds: [],
        userSongs: [],
        collections: [],
        bgTimerId: null,
        bgIntervalTime: 5 * 60 * 1000,

        // upload
        uploadingCollectionId: null
    },

    // UTILS
    utils: {
        resolvePath(path) {
            if (!path || path === 'null' || path === "undefined") return "";
            if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;

            const ctx = App.config.contextPath || window.CURRENT_CONTEXT || '';
            // Xử lý trường hợp path đã có context hoặc chưa
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            return `${ctx}/${cleanPath}`.replace(/\/+/g, '/');
        },
        getElement(id) {
            return document.getElementById(id);
        }
    },

    // init
    async init() {
        console.log("Chillscape đang khởi động...");

        // Load dữ liệu & Auth
        await this.loadData();
        this.Auth.init();

        // init UI
        this.initClock();
        this.renderAmbientControls();

        //Sidebar & Playlist
        this.Sidebar.init();

        // Player & Visualizer
        this.initMainPlayer();
        this.initProgressBar();
        this.initVolumeControl();

        //
        this.startBackgroundSlideshow();
        this.bindEvents(); // Zen mode, keyboard shortcuts
        this.initZenMode();

        if (this.state.songs.length > 0) {
            this.updateSongUI();
        }
    },

    async loadData() {
        try {
            const urlSongs = this.utils.resolvePath(this.config.apiSongs);
            const urlSounds = this.utils.resolvePath(this.config.apiSounds);
            const urlBgs = this.utils.resolvePath(this.config.apiBackgrounds);

            const [songsRes, soundsRes, bgsRes] = await Promise.all([
                fetch(urlSongs).then(r => r.ok ? r.json() : []),
                fetch(urlSounds).then(r => r.ok ? r.json() : []),
                fetch(urlBgs).then(r => r.ok ? r.json() : [])
            ]);

            this.state.songs = songsRes || [];
            this.state.sounds = soundsRes || [];
            this.state.backgrounds = bgsRes || [];
        } catch (error) {
            console.error("Lỗi tải dữ liệu hệ thống:", error);
        }
    },

    // auth
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
            if (switchLink) switchLink.onclick = (e) => { e.preventDefault(); this.switchMode(); };

            const form = document.getElementById('auth-form');
            if (form) form.onsubmit = (e) => this.handleSubmit(e);

            const overlay = document.getElementById('auth-modal');
            if (overlay) overlay.onclick = (e) => { if (e.target === overlay) this.closeModal(); };

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
                if (res.ok && contentType && contentType.includes("json")) {
                    const data = await res.json();
                    if (data.status === 'success') this.onLoginSuccess(data);
                    else this.onLogoutSuccess();
                } else {
                    this.onLogoutSuccess();
                }
            } catch (e) { this.onLogoutSuccess(); }
        },

        async handleSubmit(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const path = this.mode === 'login' ? 'api/auth/login' : 'api/auth/register';

            try {
                const res = await fetch(App.utils.resolvePath(path), {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: new URLSearchParams({username, password})
                });

                // Xử lý response text trước để tránh lỗi JSON parse
                const text = await res.text();
                let data;
                try { data = JSON.parse(text); } catch(err) { alert("Lỗi phản hồi server: " + text); return; }

                if (res.ok && data.status === 'success') {
                    if (this.mode === 'login') this.onLoginSuccess(data);
                    else { alert("Đăng ký thành công! Vui lòng đăng nhập."); this.switchMode(); }
                } else {
                    alert("Thông báo: " + (data.message || "Thất bại"));
                }
            } catch (e) { alert("Lỗi kết nối server"); }
        },

        async logout() {
            await fetch(App.utils.resolvePath('api/auth/logout'), {method: 'POST'});
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

        // rs data khi logout
        async onLogoutSuccess() {
            this.currentUser = null;
            App.state.currentUser = null;
            document.getElementById('login-status-dot').style.display = 'none';
            document.getElementById('guest-view').style.display = 'block';
            document.getElementById('user-view').style.display = 'none';

            // Reset dữ liệu user
            App.state.userBackgrounds = [];
            App.state.collections = [];

            // Dừng nhạc & Reset Player
            App.state.isPlaying = false;
            App.state.mainAudio.pause();
            App.updatePlayerControls();

            // Load lại dữ liệu
            await App.loadData();

            // Reset giao diện về mặc định
            if (App.state.songs.length > 0) App.loadSong(0);
            App.Sidebar.render();

            // Đóng popup user
            document.getElementById('user-popup').classList.remove('active');
        },
        togglePopup() { document.getElementById('user-popup')?.classList.toggle('active'); },
        showModal(mode) {
            this.mode = mode;
            document.getElementById('auth-modal')?.classList.add('active');
            document.getElementById('user-popup')?.classList.remove('active');

            const title = document.getElementById('auth-title');
            const switchTxt = document.getElementById('switch-auth-text');
            const switchLink = document.getElementById('switch-auth-link');

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
        closeModal() { document.getElementById('auth-modal')?.classList.remove('active'); },
        switchMode() { this.showModal(this.mode === 'login' ? 'register' : 'login'); }
    },

    // sidebar
    Sidebar: {
        init() {
            this.setupToggle();
            this.setupTabs(); // Từ User
            this.setupUploadModal();
            this.render();
        },

        setupToggle() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            const toggle = (show) => {
                sidebar?.classList.toggle('active', show);
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
                tab.onclick = () => {
                    document.querySelectorAll('.tab-btn, .tab-pane').forEach(el => el.classList.remove('active'));
                    tab.classList.add('active');
                    document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
                };
            });
        },

        setupUploadModal() {
            const modal = document.getElementById('upload-song-modal');
            const closeBtn = document.getElementById('btn-close-upload');
            const form = document.getElementById('upload-song-form');
            const overlay = document.getElementById('upload-song-modal');

            if (closeBtn) closeBtn.onclick = () => modal?.classList.remove('active');
            if (overlay) overlay.onclick = (e) => { if(e.target === overlay) modal?.classList.remove('active'); };

            if (form) {
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    await this.handleSongUploadSubmit();
                };
            }
        },

        async loadUserContent() {
            if (!App.Auth.currentUser) {
                App.state.collections = [];
                this.render();
                return;
            }
            try {
                const res = await fetch(App.utils.resolvePath('api/collections'));
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success') {
                        const myCols = (data.myCollections || []).map(c => ({...c, type: 'OWNER'}));
                        const followCols = (data.followedCollections || []).map(c => ({...c, type: 'SUBSCRIBER'}));

                        // Chuẩn hóa dữ liệu
                        App.state.collections = [...myCols, ...followCols].map(col => ({
                            ...col,
                            songs: (col.songs || []).map(s => ({
                                id: s.id,
                                title: s.title,
                                artist: s.artist,
                                filePath: s.filePath,
                                coverImage: s.coverImage || s.cover || App.config.defaultCover
                            })),
                            backgrounds: (col.backgrounds || []).map(b => ({
                                id: b.id, name: b.name
                            }))
                        }));
                        this.render();
                    }
                }
            } catch (e) { console.error("Lỗi tải collection:", e); }
        },

        render() {
            // Render kệ mặc định (System) - không có nút add
            this.renderShelf('bg-shelf', App.state.backgrounds, 'background', false);
            this.renderShelf('album-shelf', App.state.songs, 'song', false);

            // Render User Actions (Tạo & Nhập mã)
            this.renderUserActions();

            // Render kệ User (Collection)
            const myCols = App.state.collections.filter(c => c.type === 'OWNER');
            const followCols = App.state.collections.filter(c => c.type === 'SUBSCRIBER');

            this.renderCollectionGroup('playlist-container-owner', myCols, 'song');
            this.renderCollectionGroup('playlist-container-subscriber', followCols, 'song');
            this.renderCollectionGroup('bg-container-owner', myCols, 'background');
            this.renderCollectionGroup('bg-container-subscriber', followCols, 'background');
        },

        // tạo và nhập mã
        renderUserActions() {
            // Tìm container của tab Playlists (Albums)
            const container = document.getElementById('tab-albums'); // ID trong jsp
            if (!container) return;

            // tránh trùng
            const oldActions = document.getElementById('user-collection-actions');
            if (oldActions) oldActions.remove();

            // Chỉ hiện khi đăng nhập
            if (!App.Auth.currentUser) return;

            const actionDiv = document.createElement('div');
            actionDiv.id = 'user-collection-actions';
            actionDiv.style.cssText = "display:flex; gap:10px; padding:0 0 20px; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:20px;";

            const btnCreate = document.createElement('button');
            btnCreate.className = 'auth-btn';
            btnCreate.style.cssText = "font-size: 0.8rem; padding: 8px; flex: 1;";
            btnCreate.innerHTML = '<i class="fa-solid fa-plus"></i> Tạo Mới';
            btnCreate.onclick = () => this.handleCreateCollection();

            const btnJoin = document.createElement('button');
            btnJoin.className = 'auth-btn outline';
            btnJoin.style.cssText = "font-size: 0.8rem; padding: 8px; flex: 1;";
            btnJoin.innerHTML = '<i class="fa-solid fa-link"></i> Nhập Mã';
            btnJoin.onclick = () => this.handleFollowCollection();

            actionDiv.appendChild(btnCreate);
            actionDiv.appendChild(btnJoin);

            // Chèn vào đầu tab
            container.insertBefore(actionDiv, container.firstChild);
        },

        renderCollectionGroup(containerId, collections, itemType) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';

            if (collections.length === 0) return;

            const groupHeader = document.createElement('h4');
            groupHeader.style.cssText = "padding: 0 15px; margin-bottom: 10px; opacity: 0.8; font-size: 0.8rem; text-transform: uppercase;";
            groupHeader.innerText = containerId.includes('owner') ? "Của tôi" : "Đã theo dõi";
            container.appendChild(groupHeader);

            collections.forEach(col => {
                const dataList = (itemType === 'background') ? col.backgrounds : col.songs;
                if (col.type !== 'OWNER' && dataList.length === 0) return;

                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'shelf-section';

                // Tiêu đề + Mã chia sẻ
                let titleHtml = `<h3 class="shelf-title" style="display:flex; justify-content:space-between; align-items:center;">
                                    <span>${col.name} <small style="opacity:0.6; font-size:0.8em">(${dataList.length})</small></span>`;

                if (col.type === 'OWNER') {
                    titleHtml += `<span style="font-size:0.7em; font-weight:normal; cursor:pointer; background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px;" 
                                        title="Click để sao chép mã"
                                        onclick="navigator.clipboard.writeText('${col.shareCode}'); alert('Đã sao chép mã: ${col.shareCode}')">
                                        <i class="fa-solid fa-share-nodes"></i> ${col.shareCode}
                                  </span>`;
                }
                titleHtml += `</h3>`;
                sectionDiv.innerHTML = titleHtml;

                const shelfDiv = document.createElement('div');
                shelfDiv.className = 'shelf-scroll';
                shelfDiv.style.display = 'flex';
                shelfDiv.style.gap = '15px';
                shelfDiv.style.overflowX = 'auto';
                shelfDiv.style.padding = '10px 0';

                const uniqueId = `shelf-${itemType}-col-${col.id}`;
                shelfDiv.id = uniqueId;

                sectionDiv.appendChild(shelfDiv);
                container.appendChild(sectionDiv);

                this.renderShelf(uniqueId, dataList, itemType, col.type === 'OWNER', col.id);
            });
        },

        renderShelf(containerId, dataList, type, isUserShelf = false, collectionId = null) {
            const container = document.getElementById(containerId);
            const targetContainer = container || (containerId === 'bg-shelf-default' ? document.getElementById('bg-shelf') :
                containerId === 'playlist-shelf-default' ? document.getElementById('album-shelf') : null);

            if (!targetContainer) return;
            targetContainer.innerHTML = '';

            // btn add (chỉ khi đăng nhập)
            if (isUserShelf) {
                const addDiv = document.createElement('div');
                addDiv.className = 'shelf-item add-new';
                addDiv.innerHTML = `<i class="fa-solid fa-plus"></i>`;
                addDiv.style.display = 'flex';
                addDiv.style.justifyContent = 'center';
                addDiv.style.alignItems = 'center';
                addDiv.style.fontSize = '24px';

                addDiv.onclick = () => this.handleUploadClick(type, collectionId);
                targetContainer.appendChild(addDiv);
            }

            if (!dataList) return;

            dataList.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'shelf-item';

                let imgSrc = '';
                if (type === 'background') {
                    const bgName = item.name || item.fileName || item;
                    imgSrc = App.utils.resolvePath(App.config.backgroundBaseUrl + bgName);
                } else {
                    const cover = item.coverImage || item.cover || App.config.defaultCover;
                    imgSrc = App.utils.resolvePath(cover);
                }

                div.innerHTML = `<img src="${imgSrc}" loading="lazy">`;

                // Nút Delete (Chỉ hiện khi là Owner)
                if (isUserShelf) {
                    const delBtn = document.createElement('div');
                    delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                    delBtn.style.cssText = "position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.7); color:#ff5555; width:25px; height:25px; display:flex; align-items:center; justify-content:center; border-radius:50%; cursor:pointer; z-index:10; opacity:0; transition:0.2s;";

                    div.onmouseenter = () => delBtn.style.opacity = '1';
                    div.onmouseleave = () => delBtn.style.opacity = '0';

                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        if(confirm("Bạn có chắc muốn xóa không?")) {
                            this.handleDeleteItem(type, collectionId, item.id);
                        }
                    };
                    div.appendChild(delBtn);
                }

                div.onclick = () => {
                    if (type === 'background') {
                        if (App.state.backgrounds !== dataList) App.state.backgrounds = dataList;
                        const realIndex = dataList.indexOf(item);
                        App.state.currentBgIndex = realIndex - 1;
                        App.changeBackground();
                        App.startBackgroundSlideshow();
                    } else {
                        if (App.state.songs !== dataList) App.state.songs = dataList;
                        let playIndex = index;
                        if (item.id) playIndex = App.state.songs.findIndex(s => s.id === item.id);
                        App.loadSong(playIndex);
                    }
                };
                targetContainer.appendChild(div);
            });
        },

        // Upload lên Server
        handleUploadClick(type, collectionId) {
            if (type === 'background') {
                const fileInput = document.getElementById('upload-input');
                if(!fileInput) return;
                fileInput.value = '';
                fileInput.click();
                fileInput.onchange = (e) => this.handleBackgroundUpload(e, collectionId);
            } else if (type === 'song') {
                App.state.uploadingCollectionId = collectionId;
                document.getElementById('upload-song-form').reset();
                document.getElementById('upload-song-modal').classList.add('active');
            }
        },

        async handleBackgroundUpload(e, collectionId) {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('collectionId', collectionId);

            try {
                const res = await fetch(App.utils.resolvePath('api/upload/background'), {method: 'POST', body: formData});
                const data = await res.json();
                if (res.ok && data.status === 'success') {
                    alert("Upload ảnh thành công!");
                    this.loadUserContent();
                } else alert("Lỗi: " + data.message);
            } catch (err) { alert("Lỗi kết nối."); }
        },

        async handleSongUploadSubmit() {
            const collectionId = App.state.uploadingCollectionId;
            const songFile = document.getElementById('song-file').files[0];
            const coverFile = document.getElementById('song-cover').files[0];
            const title = document.getElementById('song-title').value;
            const artist = document.getElementById('song-artist').value;

            if (!songFile) { alert("Vui lòng chọn file nhạc!"); return; }

            const formData = new FormData();
            formData.append('collectionId', collectionId);
            formData.append('file', songFile);
            if (coverFile) formData.append('cover', coverFile);
            formData.append('title', title);
            formData.append('artist', artist);

            const btn = document.querySelector('#upload-song-form .submit-btn');
            const originalText = btn.innerText;
            btn.innerText = "Đang tải lên...";
            btn.disabled = true;

            try {
                const res = await fetch(App.utils.resolvePath('api/upload/song'), {method: 'POST', body: formData});
                const data = await res.json();

                if (res.ok && data.status === 'success') {
                    alert("Thêm bài hát thành công!");
                    document.getElementById('upload-song-modal').classList.remove('active');
                    this.loadUserContent();
                } else {
                    alert("Lỗi: " + (data.message || "Không thể upload"));
                }
            } catch (err) {
                console.error(err);
                alert("Lỗi kết nối đến server.");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        },

        async handleDeleteItem(type, colId, itemId) {
            const itemType = (type === 'song') ? 'song' : 'background';
            try {
                const res = await fetch(App.utils.resolvePath(`api/collections/delete/${itemType}/${colId}/${itemId}`), {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (data.status === 'success') {
                    this.loadUserContent();
                } else alert("Lỗi xóa: " + data.message);
            } catch (e) { alert("Lỗi kết nối server"); }
        },

        async handleCreateCollection() {
            if (!App.Auth.currentUser) return App.Auth.showModal('login');
            const name = prompt("Nhập tên Bộ sưu tập mới:");
            if (!name) return;
            try {
                const res = await fetch(App.utils.resolvePath('api/collections/create'), {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: new URLSearchParams({name})
                });
                const data = await res.json();
                if (data.status === 'success') this.loadUserContent();
                else alert(data.message || "Lỗi tạo collection");
            } catch(e) { alert("Lỗi kết nối"); }
        },

        async handleFollowCollection() {
            if (!App.Auth.currentUser) return App.Auth.showModal('login');
            const code = prompt("Nhập Mã chia sẻ (Share Code):");
            if (!code) return;
            try {
                const res = await fetch(App.utils.resolvePath('api/collections/follow'), {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: new URLSearchParams({shareCode: code})
                });
                const data = await res.json();
                if (data.status === 'success') this.loadUserContent();
                else alert(data.message || "Lỗi follow collection");
            } catch(e) { alert("Lỗi kết nối"); }
        }
    },

    // player
    initMainPlayer() {
        if (this.state.songs.length > 0) {
            this.loadSong(0);
        }
        this.state.mainAudio.onended = () => {
            if (this.state.repeatMode === 'one') this.state.mainAudio.play();
            else this.nextSong();
        };
    },

    loadSong(index) {
        if (index < 0 || index >= this.state.songs.length) index = 0;
        const song = this.state.songs[index];
        if (!song) return;

        this.state.currentSongIndex = index;
        //  Dùng resolvePath để lấy đường dẫn đúng
        this.state.mainAudio.src = this.utils.resolvePath(song.filePath);
        this.state.mainAudio.crossOrigin = "anonymous";

        this.updateSongUI();

        if (this.state.isPlaying) {
            this.state.mainAudio.play().catch(() => console.warn("Chặn tự phát"));
        }
        this.updatePlayerControls();
    },

    updateSongUI() {
        const song = this.state.songs[this.state.currentSongIndex];
        if (!song) return;

        const titleEl = document.querySelector('.song-details .title');
        const artistEl = document.querySelector('.song-details .artist');
        if (titleEl) titleEl.innerText = song.title;
        if (artistEl) artistEl.innerText = song.artist;

        const coverPath = song.coverImage || song.cover || this.config.defaultCover;
        const fullPath = this.utils.resolvePath(coverPath);

        document.querySelectorAll('.vn-cover img, .vn-print img, .background-blur').forEach(img => {
            img.src = fullPath;
        });
    },

    nextSong() {
        let nextIdx;
        if (this.state.isShuffle) {
            nextIdx = Math.floor(Math.random() * this.state.songs.length);
        } else {
            nextIdx = (this.state.currentSongIndex + 1) % this.state.songs.length;
            // Nếu hết list và không lặp -> dừng
            if (nextIdx === 0 && this.state.repeatMode === 'none') {
                this.state.isPlaying = false;
                this.state.mainAudio.pause();
                this.updatePlayerControls();
                return;
            }
        }
        this.loadSong(nextIdx);
    },

    prevSong() {
        const prevIdx = (this.state.currentSongIndex - 1 + this.state.songs.length) % this.state.songs.length;
        this.loadSong(prevIdx);
    },

    updatePlayerControls() {
        const playBtn = document.querySelector('.play-pause-btn');
        if (playBtn) playBtn.innerHTML = this.state.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';

        const shuffleBtn = document.querySelector('.shuffle-btn');
        if (shuffleBtn) shuffleBtn.classList.toggle('active', this.state.isShuffle);

        const repeatBtn = document.querySelector('.repeat-btn');
        if (repeatBtn) {
            const mode = this.state.repeatMode;
            repeatBtn.classList.toggle('active', mode !== 'none');
            if (mode === 'one') repeatBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i><span style="font-size:10px">1</span>';
            else repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        }
    },

    // VISUALIZER
    initVisualizer() {
        if (this.state.audioContext) return;
        this.state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.state.analyser = this.state.audioContext.createAnalyser();
        this.state.source = this.state.audioContext.createMediaElementSource(this.state.mainAudio);
        this.state.source.connect(this.state.analyser);
        this.state.analyser.connect(this.state.audioContext.destination);
        this.state.analyser.fftSize = 256;
        this.state.dataArray = new Uint8Array(this.state.analyser.frequencyBinCount);
        this.drawVisualizer();
    },

    drawVisualizer() {
        const canvas = document.getElementById('visualizer-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const renderFrame = () => {
            this.state.animationId = requestAnimationFrame(renderFrame);
            this.state.analyser.getByteFrequencyData(this.state.dataArray);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / this.state.dataArray.length) * 2.5;
            let x = 0;
            for (let i = 0; i < this.state.dataArray.length; i++) {
                const barHeight = (this.state.dataArray[i] / 255) * canvas.height;
                ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + (barHeight / canvas.height)})`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
                x += barWidth;
            }
        };
        renderFrame();
    },

    initProgressBar() {
        const slider = document.getElementById('progress-slider');
        const audio = this.state.mainAudio;
        if (!slider) return;

        audio.addEventListener('loadedmetadata', () => {
            if(isFinite(audio.duration)) {
                slider.max = audio.duration;
                document.querySelector('.duration').innerText = this.formatTime(audio.duration);
            }
        });
        audio.addEventListener('timeupdate', () => {
            if (!slider.matches(':active')) slider.value = audio.currentTime;
            document.querySelector('.current-time').innerText = this.formatTime(audio.currentTime);
        });
        slider.oninput = (e) => audio.currentTime = e.target.value;
    },

    initVolumeControl() {
        const slider = document.getElementById('volume-slider');
        const icon = document.getElementById('volume-icon');
        const audio = this.state.mainAudio;
        if (!slider) return;

        const apply = (val) => {
            audio.volume = val;
            slider.value = val;
            icon.className = `fa-solid ${val === 0 ? 'fa-volume-xmark' : (val < 0.5 ? 'fa-volume-low' : 'fa-volume-high')}`;
        };
        slider.oninput = (e) => apply(parseFloat(e.target.value));
        icon.onclick = () => {
            if (audio.volume > 0) { this.state.savedVolume = audio.volume; apply(0); }
            else apply(this.state.savedVolume || 0.5);
        };
    },

    // slideshow cho bg
    startBackgroundSlideshow() {
        this.stopBackgroundSlideshow();
        if (this.state.currentBgIndex === -1) this.changeBackground();
        this.state.bgTimerId = setInterval(() => this.changeBackground(), this.state.bgIntervalTime);
    },
    stopBackgroundSlideshow() {
        if (this.state.bgTimerId) clearInterval(this.state.bgTimerId);
        this.state.bgTimerId = null;
    },
    changeBackground() {
        const bgs = this.state.backgrounds;
        if (!bgs || bgs.length === 0) return;
        this.state.currentBgIndex = (this.state.currentBgIndex + 1) % bgs.length;

        const item = bgs[this.state.currentBgIndex];
        const bgName = item.name || item.fileName || item;
        const path = this.utils.resolvePath(this.config.backgroundBaseUrl + bgName);

        this.applyBackgroundToUI(path);
    },
    applyBackgroundToUI(path) {
        const container = document.getElementById('background-container');
        if (container) {
            const img = new Image();
            img.onload = () => { container.style.backgroundImage = `url('${path}')`; };
            img.src = path;
        }
    },

    // local update (User - Preview nhanh)
    handleLocalUpload(type) {
        const fileInput = document.getElementById('upload-input');
        if (!fileInput) return;
        fileInput.accept = "image/*";
        fileInput.value = '';
        fileInput.click();

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const localUrl = URL.createObjectURL(file);
                if (type === 'background') {
                    this.applyBackgroundToUI(localUrl);
                    this.stopBackgroundSlideshow();
                } else {
                    // Update cover tạm thời
                    document.querySelectorAll('.vn-cover img, .vn-print img').forEach(img => img.src = localUrl);
                }
            }
        };
    },

    // zen mode & UI
    initZenMode() {
        const resetTimer = () => {
            if (this.state.isZenMode) this.toggleZenMode(false);
            clearTimeout(this.state.inactivityTimer);
            this.state.inactivityTimer = setTimeout(() => this.toggleZenMode(true), this.config.INACTIVITY_TIMEOUT);
        };
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => document.addEventListener(evt, resetTimer, true));
        resetTimer();
    },
    toggleZenMode(forceState) {
        this.state.isZenMode = forceState !== undefined ? forceState : !this.state.isZenMode;
        document.body.classList.toggle('zen-mode', this.state.isZenMode);
    },
    initClock() {
        const el = document.getElementById('clock');
        if (!el) return;
        const update = () => {
            const now = new Date();
            let h = now.getHours();
            const m = now.getMinutes().toString().padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            el.innerHTML = `${h % 12 || 12}:${m} <span class="am-pm">${ampm}</span>`;
        };
        setInterval(update, this.config.CLOCK_UPDATE_INTERVAL);
        update();
    },
    renderAmbientControls() {
        const container = document.getElementById('ambient-sounds-panel');
        if (!container) return;
        container.innerHTML = '';
        this.state.sounds.forEach(sound => {
            const audio = new Audio(this.utils.resolvePath(sound.filePath));
            audio.loop = true; audio.volume = 0;
            this.state.ambientAudios[sound.id] = audio;

            const div = document.createElement('div');
            div.className = 'ambient-control';
            div.innerHTML = `
                <div class="ambient-info"><i class="fa-solid ${sound.iconClass || 'fa-music'}"></i><span>${sound.name}</span></div>
                <input type="range" class="ambient-slider" min="0" max="1" step="0.01" value="0" data-id="${sound.id}">
            `;
            container.appendChild(div);
        });
    },

    bindEvents() {
        const playBtn = document.querySelector('.play-pause-btn');
        if(playBtn) playBtn.onclick = () => {
            this.initVisualizer();
            if (this.state.audioContext.state === 'suspended') this.state.audioContext.resume();

            if (this.state.mainAudio.paused) {
                this.state.mainAudio.play();
                this.state.isPlaying = true;
            } else {
                this.state.mainAudio.pause();
                this.state.isPlaying = false;
            }
            this.updatePlayerControls();
        };

        document.querySelector('.next-btn').onclick = () => this.nextSong();
        document.querySelector('.prev-btn').onclick = () => this.prevSong();
        document.querySelector('.shuffle-btn').onclick = () => {
            this.state.isShuffle = !this.state.isShuffle;
            this.updatePlayerControls();
        };
        document.querySelector('.repeat-btn').onclick = () => {
            const modes = ['none', 'all', 'one'];
            this.state.repeatMode = modes[(modes.indexOf(this.state.repeatMode) + 1) % modes.length];
            this.updatePlayerControls();
        };

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('ambient-slider')) {
                const audio = this.state.ambientAudios[e.target.dataset.id];
                if (audio) {
                    audio.volume = e.target.value;
                    (audio.volume > 0 && audio.paused) ? audio.play() : (audio.volume == 0 && audio.pause());
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
            if (e.key.toLowerCase() === 'h') document.body.classList.toggle('zen-mode');
        });

        const bgContainer = document.getElementById('background-container');
        if (bgContainer) bgContainer.onclick = () => document.body.classList.toggle('zen-mode');
    },

    formatTime(s) {
        if (isNaN(s)) return "0:00";
        return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());