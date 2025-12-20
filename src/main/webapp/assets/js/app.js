const App = {
    config: {
        apiSongs: 'api/songs',
        apiSounds: 'api/sounds',
        backgrounds: [
            'assets/img/background.jpg',
            'assets/img/background2.jpg',
            'assets/img/background3.jpg'
        ],
        defaultCover: 'assets/img/cover/cover.jpg'
    },
    state: {
        songs: [],
        sounds: [],
        currentSongIndex: 0,
        currentBgIndex: 0,
        mainAudio: new Audio(),
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

        this.setupProgressBar();
        this.setupVolumeControl();

        // Cập nhật giao diện ban đầu
        if (this.state.songs.length > 0) {
            this.updateSongUI();
        }
    },

    async loadData() {
        try {
            const [songsRes, soundsRes] = await Promise.all([
                fetch(this.config.apiSongs),
                fetch(this.config.apiSounds)
            ]);
            this.state.songs = await songsRes.json();
            this.state.sounds = await soundsRes.json();
        } catch (error) {
            console.error("Lỗi lấy dữ liệu:", error);
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
            if (clockElement) {
                clockElement.innerHTML = timeString;
            }
        };

        setInterval(update, 1000);
        update();
    },

    setupMainPlayer() {
        if (this.state.songs.length > 0) {
            this.loadSong(0);
        }

        // Tự động chuyển bài khi kết thúc
        this.state.mainAudio.onended = () => this.nextSong();
    },

    loadSong(index) {
        this.state.currentSongIndex = index;
        const song = this.state.songs[index];
        this.state.mainAudio.src = song.filePath;
        this.updateSongUI();

        if (this.state.isPlaying) {
            this.state.mainAudio.play();
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

        // Lấy đường dẫn ảnh từ DB (ưu tiên coverImage, fallback sang cover)
        const rawCoverPath = song.coverImage || song.cover;
        let coverSrc = "";

        // Kiểm tra tính hợp lệ của ảnh từ DB
        if (rawCoverPath && rawCoverPath.trim() !== "" && rawCoverPath !== "null" && rawCoverPath !== "undefined") {
            if (rawCoverPath.startsWith('http')) {
                coverSrc = rawCoverPath;
            } else {
                coverSrc = `${ctx}/${rawCoverPath}`.replace('//', '/');
            }
        } else {
            // Dùng ảnh mặc định nếu không có dữ liệu trong DB
            coverSrc = `${ctx}/${this.config.defaultCover}`.replace('//', '/');
        }

        if (coverEl) coverEl.src = coverSrc;
        if (labelEl) labelEl.src = coverSrc;
    },

    renderAmbientControls() {
        const container = document.getElementById('ambient-sounds-panel');
        if (!container) return;

        // Nếu context chưa được định nghĩa (chạy local html), dùng chuỗi rỗng
        const ctx = window.CURRENT_CONTEXT || '';

        container.innerHTML = '';

        console.log("--- Bắt đầu hiển thị Sounds ---");
        this.state.sounds.forEach(sound => {
            console.log(`Sound: ${sound.name} | Path gốc: ${sound.filePath}`);

            // thêm đường dẫn tuyệt đối
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
                    <span>${sound.name || 'Không tên'}</span>
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

    changeBackground() {
        this.state.currentBgIndex = (this.state.currentBgIndex + 1) % this.config.backgrounds.length;
        const bgContainer = document.getElementById('background-container');
        if (bgContainer) {
            bgContainer.style.backgroundImage = `url('\${this.config.backgrounds[this.state.currentBgIndex]}')`;
        }
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

        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            mainAudio.volume = val;
            this.updateVolumeIcon(val);
        });

        volumeIcon.addEventListener('click', () => {
            if (mainAudio.volume > 0) {
                this.savedVolume = mainAudio.volume;
                mainAudio.volume = 0;
                slider.value = 0;
            } else {
                mainAudio.volume = this.savedVolume || 0.5;
                slider.value = mainAudio.volume;
            }
            this.updateVolumeIcon(mainAudio.volume);
        })
        document.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
            let currVol = mainAudio.volume;
            let step = 0.05;

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                currVol = Math.min(1, currVol + step);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                currVol = Math.max(0, currVol - step);
            } else return;
            mainAudio.volume = currVol;
            slider.value = currVol;
            this.updateVolumeIcon(currVol);
        });
    },


    updateVolumeIcon(vol) {
        const icon = document.getElementById('volume-icon');
        icon.className = 'fa-solid';
        if (vol === 0) {
            icon.classList.add('fa-volume-mute');
        } else if (vol < 0.5) {
            icon.classList.add('fa-volume-low');
        } else {
            icon.classList.add('fa-volume-high');
        }
    },

    handleEvents() {
        // Nút Play/Pause
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

        // Nút Next/Back
        const nextBtn = document.querySelector('.next-btn');
        const prevBtn = document.querySelector('.prev-btn');
        if (nextBtn) nextBtn.onclick = () => this.nextSong();
        if (prevBtn) prevBtn.onclick = () => this.prevSong();

        // Nút đổi ảnh nền
        const bgBtn = document.getElementById('change-bg-btn');
        if (bgBtn) bgBtn.onclick = () => this.changeBackground();

        // Điều khiển âm lượng âm thanh môi trường
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