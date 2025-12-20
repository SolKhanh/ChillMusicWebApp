const App = {
    config: {
        apiSongs: 'api/songs',
        apiSounds: 'api/sounds',
        backgrounds: [
            'assets/img/cover/background.jpg',
            'assets/img/cover/background2.jpg',
            'assets/img/cover/background3.jpg'
        ],
        defaultCover: 'assets/img/cover/cover.jpg'
    },
    state: {
        songs: [],
        sounds: [],
        currentSongIndex: 0,
        currentBgIndex: 0,
        mainAudio: new Audio(),

        backgrounds: [],
        bgIntervalTime: 10000,
        bgTimerId: null,

        ambientAudios: {},
        isPlaying: false
    },

    async init() {
        console.log("App initializing...");

        // Sao chép danh sách background từ config sang state để dễ quản lý
        this.state.backgrounds = [...this.config.backgrounds];

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
        this.startBackgroundSlideshow();

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
            // Kiểm tra phản hồi trước khi parse JSON (tránh lỗi nếu API chết)
            if(songsRes.ok) this.state.songs = await songsRes.json();
            if(soundsRes.ok) this.state.sounds = await soundsRes.json();
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
        // Tự động chuyển bài khi kết thúc
        this.state.mainAudio.onended = () => this.nextSong();
    },

    loadSong(index) {
        this.state.currentSongIndex = index;
        const song = this.state.songs[index];
        if(!song) return;

        this.state.mainAudio.src = song.filePath;
        this.updateSongUI();

        // Cập nhật trạng thái nút Play/Pause
        const playBtn = document.querySelector('.play-pause-btn');
        if (this.state.isPlaying) {
            this.state.mainAudio.play();
            if(playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            if(playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
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
            // Chỉ update slider nếu người dùng không đang kéo nó
            // (Thực tế nên thêm cờ isDragging, nhưng đơn giản thì để vậy cũng ổn)
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

    setupSidebarEvents() {
        const menuBtn = document.querySelector('.menu-container');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const closeBtn = document.getElementById('close-sidebar-btn');

        const toggleSidebar = (show) => {
            if (show) {
                sidebar.classList.add('active');
                overlay.classList.add('active');
            } else {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        };

        if (menuBtn) menuBtn.addEventListener('click', () => toggleSidebar(true));
        if (closeBtn) closeBtn.addEventListener('click', () => toggleSidebar(false));
        if (overlay) overlay.addEventListener('click', () => toggleSidebar(false));
    },

    // --- LOGIC CÀI ĐẶT (SETTINGS) ---
    setupSettingsLogic() {
        const checkbox = document.getElementById('use-preset-checkbox');
        const presetOptions = document.getElementById('preset-options');
        const customInputContainer = document.getElementById('custom-input-container');
        const radioButtons = document.querySelectorAll('input[name="bg-time"]');
        const customApplyBtn = document.getElementById('apply-custom-btn');
        const customInput = document.getElementById('custom-time-input');

        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    presetOptions.classList.remove('hidden');
                    customInputContainer.classList.add('hidden');
                    const selectedRadio = document.querySelector('input[name="bg-time"]:checked');
                    if (selectedRadio) this.updateInterval(selectedRadio.value);
                } else {
                    presetOptions.classList.add('hidden');
                    customInputContainer.classList.remove('hidden');
                }
            });
        }

        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (checkbox.checked) this.updateInterval(e.target.value);
            });
        });

        if (customApplyBtn) {
            customApplyBtn.addEventListener('click', () => {
                const val = parseInt(customInput.value);
                if (val && val > 0) {
                    this.updateInterval(val);
                    alert(`Đã cập nhật thời gian chuyển nền: ${val} giây`);
                } else {
                    alert("Vui lòng nhập số giây hợp lệ!");
                }
            });
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

        // Sử dụng mảng backgrounds từ config hoặc state
        const bgs = this.state.backgrounds;
        if (!bgs || bgs.length === 0) return;

        this.state.currentBgIndex++;
        if (this.state.currentBgIndex >= bgs.length) {
            this.state.currentBgIndex = 0;
        }

        const nextImg = bgs[this.state.currentBgIndex];
        const ctx = window.CURRENT_CONTEXT || '';

        const fullPath = `${ctx}/${nextImg}`.replace('//', '/');

        console.log("Đang đổi nền sang:", fullPath);
        bgContainer.style.backgroundImage = `url('${fullPath}')`;
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