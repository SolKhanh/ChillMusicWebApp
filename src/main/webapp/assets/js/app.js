const App = {
    config: {
        apiSongs: 'api/songs',
        apiSounds: 'api/sounds',
        apiBackgrounds: 'api/backgrounds',
        imgBaseUrl: 'assets/img/',
        backgroundBaseUrl: 'assets/img/backgrounds/',
        coverBaseUrl: 'assets/img/covers/',
        defaultCover: 'assets/img/covers/cover.jpg'
    },
    state: {
        songs: [],
        sounds: [],
        currentSongIndex: 0,
        currentBgIndex: -1,
        mainAudio: new Audio(),

        backgrounds: [],
        bgIntervalTime: 10000,
        bgTimerId: null,

        ambientAudios: {},
        isPlaying: false
    },

    async init() {
        console.log("App initializing...");
        await this.loadData();

        // Khởi tạo các thành phần
        this.startClock();
        this.renderAmbientControls();
        this.setupMainPlayer();
        this.handleEvents();
        this.setupSidebarEvents();
        this.setupSettingsLogic();

        this.setupProgressBar();
        this.setupVolumeControl();

        // Bắt đầu slideshow nền ngay khi vào trang
        this.changeBackground();
        this.startBackgroundSlideshow();

        // Cập nhật giao diện ban đầu
        if (this.state.songs.length > 0) {
            this.updateSongUI();
        }
    },

    async loadData() {
        try {
            const [songsRes, soundsRes, backgroundsRes] = await Promise.all([
                fetch(this.config.apiSongs),
                fetch(this.config.apiSounds),
                fetch(this.config.apiBackgrounds)
            ]);
            // Kiểm tra phản hồi trước khi parse JSON (tránh lỗi nếu API chết)
            if (songsRes.ok) this.state.songs = await songsRes.json();
            if (soundsRes.ok) this.state.sounds = await soundsRes.json();
            if (backgroundsRes.ok) this.state.backgrounds = await backgroundsRes.json();
        } catch (error) {
            console.error("Lỗi lấy dữ liệu:", error);
            // Dữ liệu mẫu fallback nếu API lỗi (để test giao diện)
            this.state.songs = [];
        }
    },

    startClock() {
        const update = () => {
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';

            hours = hours % 12;
            hours = hours ? hours : 12;

            const timeString = `${hours}:${minutes} <span style="font-size: 0.5em; vertical-align: middle;">${ampm}</span>`;
            const clockElement = document.getElementById('clock');
            if (clockElement) clockElement.innerHTML = timeString;
        };
        setInterval(update, 1000);
        update();
    },

    setupMainPlayer() {
        if (this.state.songs.length > 0) {
            this.loadSong(0);
        }
        this.state.mainAudio.onended = () => this.nextSong();
    },

    loadSong(index) {
        this.state.currentSongIndex = index;
        const song = this.state.songs[index];
        if (!song) return;

        this.state.mainAudio.src = song.filePath;
        this.updateSongUI();

        const playBtn = document.querySelector('.play-pause-btn');
        if (this.state.isPlaying) {
            this.state.mainAudio.play();
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }

        const currTimeEl = document.querySelector('.current-time');
        const durationEl = document.querySelector('.duration');
        const sliderEl = document.getElementById('progress-slider');

        if (currTimeEl) currTimeEl.innerText = "0:00";
        if (durationEl) durationEl.innerText = "--:--";
        if (sliderEl) sliderEl.value = 0;
    },

    updateSongUI() {
        const song = this.state.songs[this.state.currentSongIndex];
        if (!song) return;

        const titleEl = document.querySelector('.song-details .title');
        const artistEl = document.querySelector('.song-details .artist');
        const coverEl = document.querySelector('.vn-cover img');
        const labelEl = document.querySelector('.vn-print img');

        if (titleEl) titleEl.innerText = song.title;
        if (artistEl) artistEl.innerText = song.artist;

        const ctx = window.CURRENT_CONTEXT || '';
        const rawCoverPath = song.coverImage || song.cover;
        let coverSrc = "";

        if (rawCoverPath && rawCoverPath.trim() !== "" && rawCoverPath !== "null") {
            if (rawCoverPath.startsWith('http')) {
                coverSrc = rawCoverPath;
            } else {
                coverSrc = `${ctx}/${rawCoverPath}`.replace('//', '/');
            }
        } else {
            coverSrc = `${ctx}/${this.config.defaultCover}`.replace('//', '/');
        }

        if (coverEl) coverEl.src = coverSrc;
        if (labelEl) labelEl.src = coverSrc;
    },

    renderAmbientControls() {
        const container = document.getElementById('ambient-sounds-panel');
        if (!container) return;
        const ctx = window.CURRENT_CONTEXT || '';
        container.innerHTML = '';

        this.state.sounds.forEach(sound => {
            const fullPath = `${ctx}/${sound.filePath}`.replace('//', '/');
            const audio = new Audio(fullPath);
            audio.loop = true;
            audio.volume = 0;
            this.state.ambientAudios[sound.id] = audio;

            const iconClass = sound.iconClass || 'fa-music';
            const control = document.createElement('div');
            control.className = 'ambient-control';
            control.innerHTML = `
                <div class="ambient-info" style="color: white; text-shadow: 1px 1px 2px black;">
                    <i class="fa-solid ${iconClass}" style="width: 25px; text-align: center;"></i>
                    <span>${sound.name || 'Sound'}</span>
                </div>
                <input type="range" class="ambient-slider" 
                       min="0" max="1" step="0.01" value="0" 
                       data-sound-id="${sound.id}">
            `;
            container.appendChild(control);
        });
    },

    nextSong() {
        let newIndex = (this.state.currentSongIndex + 1) % this.state.songs.length;
        this.loadSong(newIndex);
    },

    prevSong() {
        let newIndex = (this.state.currentSongIndex - 1 + this.state.songs.length) % this.state.songs.length;
        this.loadSong(newIndex);
    },

    formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    },

    setupProgressBar() {
        const mainAudio = this.state.mainAudio;
        const slider = document.getElementById('progress-slider');
        const currentTimeEl = document.querySelector('.current-time');
        const durationEl = document.querySelector('.duration');

        if (!slider || !currentTimeEl || !durationEl) return;

        mainAudio.addEventListener('loadedmetadata', () => {
            if (isFinite(mainAudio.duration)) {
                slider.max = mainAudio.duration;
                durationEl.innerText = this.formatTime(mainAudio.duration);
            }
        });

        mainAudio.addEventListener('timeupdate', () => {
            slider.value = mainAudio.currentTime;
            currentTimeEl.innerText = this.formatTime(mainAudio.currentTime);
        });

        slider.addEventListener('input', (e) => mainAudio.currentTime = e.target.value);
    },

    setupVolumeControl() {
        const slider = document.getElementById('volume-slider');
        const volumeIcon = document.getElementById('volume-icon');
        const mainAudio = this.state.mainAudio;
        if (!slider || !volumeIcon) return;

        const setVolume = (val) => {
            mainAudio.volume = val;
            slider.value = val;
            this.updateVolumeIcon(val);
        };

        slider.addEventListener('input', (e) => setVolume(parseFloat(e.target.value)));

        volumeIcon.addEventListener('click', () => {
            if (mainAudio.volume > 0) {
                this.savedVolume = mainAudio.volume;
                setVolume(0);
            } else {
                setVolume(this.savedVolume || 0.5);
            }
        });

        // Điều khiển bằng phím mũi tên
        document.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
            let currVol = mainAudio.volume;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setVolume(Math.min(1, currVol + 0.05));
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setVolume(Math.max(0, currVol - 0.05));
            }
        });
    },

    updateVolumeIcon(vol) {
        const icon = document.getElementById('volume-icon');
        icon.className = 'fa-solid';
        if (vol === 0) icon.classList.add('fa-volume-mute');
        else if (vol < 0.5) icon.classList.add('fa-volume-low');
        else icon.classList.add('fa-volume-high');
    },

    // --- LOGIC GIAO DIỆN KỆ (SHELVES) ---
    setupSidebarEvents() {
        const menuBtn = document.querySelector('.menu-container');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay'); // Đảm bảo bạn có thẻ div id="overlay" trong HTML
        const closeBtn = document.getElementById('close-sidebar-btn');

        const toggleSidebar = (show) => {
            if (show) {
                sidebar.classList.add('active');
                if (overlay) overlay.classList.add('active');
            } else {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        };

        if (menuBtn) menuBtn.onclick = () => toggleSidebar(true);
        if (closeBtn) closeBtn.onclick = () => toggleSidebar(false);
        if (overlay) overlay.onclick = () => toggleSidebar(false);
    },

    setupSettingsLogic() {
        this.setupTabs();
        this.renderShelves();
    },

    setupTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const panes = document.querySelectorAll('.tab-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 1. Xóa active cũ
                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));

                // 2. Thêm active mới
                tab.classList.add('active');
                const targetId = `tab-${tab.dataset.tab}`; // tab-backgrounds hoặc tab-albums
                document.getElementById(targetId).classList.add('active');
            });
        });
    },

    renderShelves() {
        this.renderBackgroundShelf();
        this.renderAlbumShelf();
    },

    renderBackgroundShelf() {
        const container = document.getElementById('bg-shelf');
        if (!container) return;
        container.innerHTML = '';

        const addBtn = document.createElement('div');
        addBtn.className = 'shelf-item add-new';
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        addBtn.onclick = () => this.handleUploadClick('background');
        container.appendChild(addBtn);

        const ctx = window.CURRENT_CONTEXT || '';

        this.state.backgrounds.forEach((bg, index) => {
            const item = document.createElement('div');
            const isSelected = index === this.state.currentBgIndex;
            item.className = `shelf-item ${isSelected ? 'selected' : ''}`;

            const filename = bg.name || bg.fileName || bg;
            let path = `${ctx}/${this.config.backgroundBaseUrl}${filename}`;
            path = path.replace(/([^:]\/)\/+/g, "$1");

            item.innerHTML = `<img src="${path}" loading="lazy" alt="bg">`;

            item.onclick = () => {
                document.querySelectorAll('#bg-shelf .shelf-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');

                this.state.currentBgIndex = index - 1;
                this.changeBackground();
            };

            container.appendChild(item);
        });
    },

    renderAlbumShelf() {
        const container = document.getElementById('album-shelf');
        if (!container) return;
        container.innerHTML = '';

        const addBtn = document.createElement('div');
        addBtn.className = 'shelf-item add-new';
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        addBtn.onclick = () => this.handleUploadClick('album');
        container.appendChild(addBtn);

        const uniqueAlbums = [];
        const seenAlbums = new Set();

        this.state.songs.forEach((song, index) => {
            const albumKey = song.album || song.title;
            if (!seenAlbums.has(albumKey)) {
                seenAlbums.add(albumKey);
                uniqueAlbums.push({ ...song, originalIndex: index });
            }
        });

        const ctx = window.CURRENT_CONTEXT || '';

        uniqueAlbums.forEach(album => {
            const item = document.createElement('div');
            item.className = 'shelf-item';

            const rawCover = album.coverImage || album.cover;
            let coverSrc = "";
            if (rawCover && rawCover.startsWith('http')) coverSrc = rawCover;
            else coverSrc = `${ctx}/${rawCover}`.replace('//', '/');

            item.innerHTML = `<img src="${coverSrc}" loading="lazy" alt="${album.album}">`;

            item.onclick = () => {
                console.log(`Chơi album: ${album.album}`);
                this.loadSong(album.originalIndex);

                document.querySelectorAll('#album-shelf .shelf-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
            };

            container.appendChild(item);
        });
    },

    handleUploadClick(type) {
        const fileInput = document.getElementById('upload-input');
        if(fileInput) {
            fileInput.click();

            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if(file) {
                    alert(`(Tính năng Demo) Bạn đã chọn file: ${file.name} để upload vào ${type}`);

                }
            };
        }
    },

    updateInterval(seconds) {
        this.state.bgIntervalTime = seconds * 1000;
        console.log(`Cập nhật tốc độ slide: ${seconds}s`);
        this.startBackgroundSlideshow();
    },

    startBackgroundSlideshow() {
        if (this.state.bgTimerId) clearInterval(this.state.bgTimerId);

        this.state.bgTimerId = setInterval(() => {
            this.changeBackground();
        }, this.state.bgIntervalTime);
    },

    changeBackground() {
        const bgContainer = document.getElementById('background-container');
        if (!bgContainer) return;

        const bgs = this.state.backgrounds;
        if (!bgs || bgs.length === 0) return;
        this.state.currentBgIndex++;
        if (this.state.currentBgIndex >= bgs.length) {
            this.state.currentBgIndex = 0;
        }

        const background = this.state.backgrounds[this.state.currentBgIndex];
        const filename = background.name;
        if (!filename) return;
        const ctx = window.CURRENT_CONTEXT || '';
        let path = `${ctx}/${this.config.backgroundBaseUrl}${filename}`;

        path = path.replace(/([^:]\/)\/+/g, "$1");
        bgContainer.style.backgroundImage = `url('${path}')`;

        const imgLoader = new Image();
        imgLoader.src = path;

        imgLoader.onload = () => {
            bgContainer.style.backgroundImage = `url('${path}')`;
            console.log("Đổi nền sang:", path);
        };

        imgLoader.onerror = () => {
            console.error("Không tải được ảnh:", path);
        };
    },

    handleEvents() {
        const playBtn = document.querySelector('.play-pause-btn');
        if (playBtn) {
            playBtn.onclick = () => {
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
        }

        const nextBtn = document.querySelector('.next-btn');
        const prevBtn = document.querySelector('.prev-btn');
        if (nextBtn) nextBtn.onclick = () => this.nextSong();
        if (prevBtn) prevBtn.onclick = () => this.prevSong();

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('ambient-slider')) {
                const id = e.target.dataset.soundId;
                const volume = e.target.value;
                const audio = this.state.ambientAudios[id];
                if (audio) {
                    audio.volume = volume;
                    if (volume > 0 && audio.paused) audio.play();
                    else if (volume == 0) audio.pause();
                }
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());