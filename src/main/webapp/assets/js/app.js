const App = {
    config: {
        apiSongs: 'api/songs',
        apiSounds: 'api/sounds',
        apiBackgrounds: 'api/backgrounds',
        backgroundBaseUrl: 'assets/img/backgrounds/',
        defaultCover: 'assets/img/covers/cover.jpg',
        DEFAULT_BG_INTERVAL: 5 * 60 * 1000, //5p
        CLOCK_UPDATE_INTERVAL: 1000,
        INACTIVITY_TIMEOUT: 10000, //10s
    },

    state: {
        songs: [],
        sounds: [],
        backgrounds: [],
        currentSongIndex: 0,
        currentBgIndex: -1,

        mainAudio: new Audio(),
        ambientAudios: {},

        bgTimerId: null,
        bgIntervalTime:  5 * 60 * 1000,
        isPlaying: false,
        isShuffle: false,
        repeatMode: 'none',
        savedVolume: 0.5,

        isZenMode: false,
        inactivityTimer: null,

        // Trạng thái Visualizer
        audioContext: null,
        analyser: null,
        dataArray: null,
        source: null,
        animationId: null
    },

    async init() {
        console.log("Chillscape đang khởi động...");
        await this.loadData();

        this.initClock();
        this.renderAmbientControls();
        this.renderShelves();

        this.initMainPlayer();
        this.initProgressBar();
        this.initVolumeControl();

        this.startBackgroundSlideshow();
        this.bindEvents();
        this.initSidebar();
        this.initZenMode();

        if (this.state.songs.length > 0) {
            this.updateSongUI();
        }
    },

    // data

    async loadData() {
        try {
            const [songsRes, soundsRes, backgroundsRes] = await Promise.all([
                fetch(this.config.apiSongs),
                fetch(this.config.apiSounds),
                fetch(this.config.apiBackgrounds)
            ]);

            if (songsRes.ok) this.state.songs = await songsRes.json();
            if (soundsRes.ok) this.state.sounds = await soundsRes.json();
            if (backgroundsRes.ok) this.state.backgrounds = await backgroundsRes.json();
        } catch (error) {
            console.error("Lỗi tải dữ liệu hệ thống:", error);
        }
    },

    getSafePath(relativePath) {
        if (!relativePath || relativePath === "null") return "";
        if (relativePath.startsWith('http') || relativePath.startsWith('blob:')) return relativePath;
        const ctx = window.CURRENT_CONTEXT || '';
        return `${ctx}/${relativePath}`.replace(/\/+/g, '/');
    },

    // player

    initMainPlayer() {
        if (this.state.songs.length > 0) {
            this.loadSong(0);
        }

        this.state.mainAudio.onended = () => {
            if (this.state.repeatMode === 'one') {
                this.state.mainAudio.play();
            } else {
                this.nextSong();
            }
        };
    },

    loadSong(index) {
        const song = this.state.songs[index];
        if (!song) return;

        this.state.currentSongIndex = index;
        this.state.mainAudio.src = this.getSafePath(song.filePath);
        this.state.mainAudio.crossOrigin = "anonymous"; // Quan trọng để Visualizer không bị lỗi CORS
        this.updateSongUI();

        if (this.state.isPlaying) {
            this.state.mainAudio.play().catch(() => console.warn("Cần tương tác để phát nhạc"));
        }
        this.updatePlayerControls();
    },

    updateSongUI() {
        const song = this.state.songs[this.state.currentSongIndex];
        if (!song) return;

        document.querySelector('.song-details .title').innerText = song.title;
        document.querySelector('.song-details .artist').innerText = song.artist;

        const coverPath = song.coverImage || song.cover || this.config.defaultCover;
        const fullPath = this.getSafePath(coverPath);

        document.querySelectorAll('.vn-cover img, .vn-print img').forEach(img => {
            img.src = fullPath;
        });
    },

    nextSong() {
        let nextIdx;
        if (this.state.isShuffle) {
            nextIdx = Math.floor(Math.random() * this.state.songs.length);
        } else {
            nextIdx = (this.state.currentSongIndex + 1) % this.state.songs.length;
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
        if (playBtn) {
            playBtn.innerHTML = this.state.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }
        const shuffleBtn = document.querySelector('.shuffle-btn');
        if (shuffleBtn) {
            const isActive = this.state.isShuffle;
            shuffleBtn.classList.toggle('active', isActive);
            shuffleBtn.setAttribute('title', isActive ? 'Tắt phát ngẫu nhiên' : 'Bật phát ngẫu nhiên');
        }
        const repeatBtn = document.querySelector('.repeat-btn');
        if (repeatBtn) {
            const mode = this.state.repeatMode;
            repeatBtn.classList.toggle('active', mode !== 'none');
            switch(mode) {
                case 'one':
                    repeatBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i><span>1</span>';
                    repeatBtn.setAttribute('title', 'Đang lặp lại 1 bài');
                    break;
                case 'all':
                    repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
                    repeatBtn.setAttribute('title', 'Đang lặp lại danh sách');
                    break;
                default:
                    repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
                    repeatBtn.setAttribute('title', 'Không lặp lại');
            }
        }
    },

    // sóng nhạc

    initVisualizer() {
        if (this.state.audioContext) return;

        // Tạo Audio Context
        this.state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.state.analyser = this.state.audioContext.createAnalyser();

        // Kết nối nguồn âm thanh vào bộ phân tích
        this.state.source = this.state.audioContext.createMediaElementSource(this.state.mainAudio);
        this.state.source.connect(this.state.analyser);
        this.state.analyser.connect(this.state.audioContext.destination);

        // Thiết lập thông số phân tích
        this.state.analyser.fftSize = 256;
        const bufferLength = this.state.analyser.frequencyBinCount;
        this.state.dataArray = new Uint8Array(bufferLength);

        this.drawVisualizer();
    },

    drawVisualizer() {
        const canvas = document.getElementById('visualizer-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const renderFrame = () => {
            this.state.animationId = requestAnimationFrame(renderFrame);
            this.state.analyser.getByteFrequencyData(this.state.dataArray);

            ctx.clearRect(0, 0, width, height);

            const barWidth = (width / this.state.dataArray.length) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < this.state.dataArray.length; i++) {
                barHeight = (this.state.dataArray[i] / 255) * height;

                ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + (barHeight / height)})`;

                // Vẽ cột từ dưới lên
                ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

                x += barWidth;
            }
        };

        renderFrame();
    },

    // âm lượng và thanh tiến trình

    initProgressBar() {
        const slider = document.getElementById('progress-slider');
        const audio = this.state.mainAudio;
        if (!slider) return;

        audio.addEventListener('loadedmetadata', () => {
            slider.max = audio.duration;
            document.querySelector('.duration').innerText = this.formatTime(audio.duration);
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
        if (!slider || !icon) return;

        const apply = (val) => {
            audio.volume = val;
            slider.value = val;
            icon.className = `fa-solid ${val === 0 ? 'fa-volume-xmark' : (val < 0.5 ? 'fa-volume-low' : 'fa-volume-high')}`;
        };

        slider.oninput = (e) => apply(parseFloat(e.target.value));
        icon.onclick = () => {
            if (audio.volume > 0) {
                this.state.savedVolume = audio.volume;
                apply(0);
            } else {
                apply(this.state.savedVolume || 0.5);
            }
        };
    },

    // bg

    startBackgroundSlideshow() {
        this.stopBackgroundSlideshow();
        if (this.state.currentBgIndex === -1) this.changeBackground();
        this.state.bgTimerId = setInterval(() => this.changeBackground(), this.state.bgIntervalTime);
    },

    stopBackgroundSlideshow() {
        if (this.state.bgTimerId) {
            clearInterval(this.state.bgTimerId);
            this.state.bgTimerId = null;
        }
    },

    changeBackground() {
        const bgs = this.state.backgrounds;
        if (!bgs || bgs.length === 0) return;

        this.state.currentBgIndex = (this.state.currentBgIndex + 1) % bgs.length;
        const bg = bgs[this.state.currentBgIndex];
        const path = this.getSafePath(`${this.config.backgroundBaseUrl}${bg.name || bg.fileName}`);

        this.applyBackgroundToUI(path);
    },

    applyBackgroundToUI(path) {
        const container = document.getElementById('background-container');
        if (container) {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                container.style.backgroundImage = `url('${path}')`;
            };
        }
    },

    handleUploadClick(type) {
        const fileInput = document.getElementById('upload-input');
        if (!fileInput) return;

        fileInput.accept = "image/*";
        fileInput.click();

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const localUrl = URL.createObjectURL(file);

                if (type === 'background') {
                    this.applyBackgroundToUI(localUrl);
                    this.stopBackgroundSlideshow();
                } else if (type === 'album') {
                    document.querySelectorAll('.vn-cover img, .vn-print img').forEach(img => {
                        img.src = localUrl;
                    });
                }
            }
        };
    },

    updateInterval(seconds) {
        this.state.bgIntervalTime = seconds * 1000;
        this.startBackgroundSlideshow();
    },

    // zen mode

    initZenMode() {
        const resetTimer = () => {
            if (this.state.isZenMode) {
                this.toggleZenMode(false);
            }
            clearTimeout(this.state.inactivityTimer);
            this.state.inactivityTimer = setTimeout(() => {
                this.toggleZenMode(true);
            }, this.config.INACTIVITY_TIMEOUT);
        };

        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(name => {
            document.addEventListener(name, resetTimer, true);
        });

        resetTimer();
    },

    toggleZenMode(forceState) {
        this.state.isZenMode = forceState !== undefined ? forceState : !this.state.isZenMode;
        document.body.classList.toggle('zen-mode', this.state.isZenMode);
    },

    // giao diện chính

    initClock() {
        const el = document.getElementById('clock');
        if (!el) return;
        const update = () => {
            const now = new Date();
            let h = now.getHours();
            const m = now.getMinutes().toString().padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = (h % 12) || 12;
            el.innerHTML = `${h}:${m} <span class="am-pm">${ampm}</span>`;
        };
        setInterval(update, this.config.CLOCK_UPDATE_INTERVAL);
        update();
    },

    renderAmbientControls() {
        const container = document.getElementById('ambient-sounds-panel');
        if (!container) return;
        container.innerHTML = '';

        this.state.sounds.forEach(sound => {
            const audio = new Audio(this.getSafePath(sound.filePath));
            audio.loop = true;
            audio.volume = 0;
            this.state.ambientAudios[sound.id] = audio;

            const div = document.createElement('div');
            div.className = 'ambient-control';
            div.innerHTML = `
                <div class="ambient-info">
                    <i class="fa-solid ${sound.iconClass || 'fa-music'}"></i>
                    <span>${sound.name}</span>
                </div>
                <input type="range" class="ambient-slider" min="0" max="1" step="0.01" value="0" data-id="${sound.id}">
            `;
            container.appendChild(div);
        });
    },
    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const toggle = (show) => {
            sidebar?.classList.toggle('active', show);
            overlay?.classList.toggle('active', show);
        };

        document.querySelector('.menu-container').onclick = () => toggle(true);
        document.getElementById('close-sidebar-btn').onclick = () => toggle(false);
        if (overlay) overlay.onclick = () => toggle(false);

        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.tab-btn, .tab-pane').forEach(el => el.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
            };
        });
    },

    renderShelves() {
        this.renderShelf('bg-shelf', this.state.backgrounds, (bg, idx) => {
            this.state.currentBgIndex = idx - 1;
            this.changeBackground();
            this.startBackgroundSlideshow();
        }, (bg) => this.getSafePath(`${this.config.backgroundBaseUrl}${bg.name}`));

        this.renderShelf('album-shelf', this.state.songs, (song, idx) => {
            this.loadSong(idx);
        }, (song) => this.getSafePath(song.coverImage || song.cover));
    },

    renderShelf(id, items, onClick, getPath) {
        const container = document.getElementById(id);
        if (!container) return;

        container.innerHTML = `<div class="shelf-item add-new" onclick="App.handleUploadClick('${id === 'bg-shelf' ? 'background' : 'album'}')">
                                    <i class="fa-solid fa-plus"></i>
                               </div>`;

        items.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'shelf-item';
            div.innerHTML = `<img src="${getPath(item)}" loading="lazy">`;
            div.onclick = () => onClick(item, idx);
            container.appendChild(div);
        });
    },

    bindEvents() {
        document.querySelector('.play-pause-btn').onclick = () => {
            // Khởi tạo AudioContext vào lần tương tác đầu tiên của người dùng
            this.initVisualizer();
            if (this.state.audioContext.state === 'suspended') {
                this.state.audioContext.resume();
            }

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
            const currentIdx = modes.indexOf(this.state.repeatMode);
            this.state.repeatMode = modes[(currentIdx + 1) % modes.length];
            this.updatePlayerControls();
        };

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('ambient-slider')) {
                const audio = this.state.ambientAudios[e.target.dataset.id];
                if (audio) {
                    audio.volume = e.target.value;
                    if (audio.volume > 0 && audio.paused) audio.play();
                    else if (audio.volume == 0) audio.pause();
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            if (e.code === 'Space') {
                e.preventDefault();
                document.querySelector('.play-pause-btn').click();
            }
            if (e.key.toLowerCase() === 'h') {
                document.body.classList.toggle('zen-mode');
            }
        });
        document.addEventListener('DOMContentLoaded', () => {
            const bgContainer = document.getElementById('background-container');
            if (bgContainer) {
                bgContainer.addEventListener('click', () => {
                    document.body.classList.toggle('zen-mode');
                });
            }
        });
    },

    formatTime(s) {
        if (isNaN(s)) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());