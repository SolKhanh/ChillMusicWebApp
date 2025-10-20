<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>

<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chillscape</title>

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA==" crossorigin="anonymous" referrerpolicy="no-referrer" />

    <style>
        :root {
            --background-color: #121212;
            --text-color: #E0E0E0;
            --player-bg-color: rgba(30, 30, 30, 0.7);
            --player-border-color: #2F2F2F;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body, html {
            height: 100%;
            font-family: sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            overflow: hidden;
        }
        .background-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -2; /* Nằm sau cả lớp phủ */
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            transition: background-image 0.5s ease-in-out; /* Hiệu ứng chuyển ảnh */
        }

        /* Lớp phủ màu tối để chữ dễ đọc */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.4);
            z-index: -1;
        }

        .main-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            padding-bottom: 100px;
        }

        .clock {
            font-size: 12vw;
            font-weight: 700;
            letter-spacing: -2px;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
        }

        .player-container {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 600px;
            background-color: var(--player-bg-color);
            border: 1px solid var(--player-border-color);
            border-radius: 12px;
            padding: 15px 25px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .song-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .song-info .icon {
            font-size: 24px;
            color: #A0A0A0;
        }

        .song-details .title {
            font-weight: 500;
        }

        .song-details .artist {
            font-size: 0.8rem;
            color: #A0A0A0;
        }

        .player-controls {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .player-controls button {
            background: none;
            border: none;
            color: var(--text-color);
            font-size: 18px;
            cursor: pointer;
            transition: transform 0.2s ease;
        }

        .player-controls button:hover {
            transform: scale(1.1);
        }

        .player-controls .play-pause-btn {
            font-size: 28px;
        }

        .player-options {
            display: flex;
            align-items: center;
            gap: 20px;
            font-size: 18px;
            color: #A0A0A0;
        }
        .player-options i {
            cursor: pointer;
        }
    </style>


</head>
<body>
<div id="background-container" class="background-container"
     style="background-image: url('assets/img/background.jpg');"></div>
<div class="main-container">
    <div id="clock" class="clock"></div>
</div>

<div class="player-container">
    <div class="song-info">
        <i class="fa-solid fa-music icon"></i>
        <div class="song-details">
            <div class="title">Nimue's Lullaby (Instrumental)</div>
            <div class="artist">idylla</div>
        </div>
    </div>

    <div class="player-controls">
        <button class="prev-btn"><i class="fas fa-backward-step"></i></button>
        <button class="play-pause-btn"><i class="fas fa-pause"></i></button>
        <button class="next-btn"><i class="fas fa-forward-step"></i></button>
    </div>

    <div class="player-options">
        <i class="fa-solid fa-volume-high"></i>
        <i class="fa-regular fa-image"></i>
    </div>
</div>

<script>
    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'

        const timeString = `\${hours}:\${minutes} <span style="font-size: 0.5em; vertical-align: middle;">\${ampm}</span>`;        console.log("Thời gian hiện tại đang được tạo:", timeString);
        document.getElementById('clock').innerHTML = timeString;
    }

    setInterval(updateClock, 1000);
    updateClock();
</script>


</body>
</html>