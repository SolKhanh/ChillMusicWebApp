<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>

<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chillscape</title>
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
          integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA=="
          crossorigin="anonymous" referrerpolicy="no-referrer"/>
    <link rel="stylesheet" href="assets/css/index.css">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Science+Gothic:wght@100..900&display=swap" rel="stylesheet">


</head>
<body>

<div class="background-container">
    <img src="assets/img/background.jpg" alt="background"/>
</div>

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

        const timeString = `\${hours}:\${minutes} <span style="font-size: 0.5em; vertical-align: middle;">\${ampm}</span>`;
        console.log("Thời gian hiện tại đang được tạo:", timeString);
        document.getElementById('clock').innerHTML = timeString;
    }

    setInterval(updateClock, 1000);
    updateClock();
</script>


</body>
</html>