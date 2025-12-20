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
    <link rel="stylesheet" href="assets/css/vinylrecord.css">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Science+Gothic:wght@100..900&display=swap" rel="stylesheet">


</head>
<body>
<!-- id="background-container" để app.js tìm thấy -->
<div id="background-container" class="background-container"
     style="background-image: url('${pageContext.request.contextPath}/assets/img/cover/background.jpg');">
</div>

<div class="main-container">
    <div id="clock" class="clock"></div>
</div>
<div id="ambient-sounds-panel" class="ambient-panel">
    <!-- Nội dung sẽ được app.js tự động tạo ra -->
</div>
<div class="player-container">
    <div class="song-info">

        <div class="vn-album-wrapper">

            <div class="vn-cover">
                <img src="${pageContext.request.contextPath}/assets/img/cover/cover.jpg" alt="Cover">
            </div>

            <div class="vn-vinyl">
                <div class="vn-print">
                    <img src="${pageContext.request.contextPath}/assets/img/cover/cover.jpg" alt="Label">
                </div>
            </div>

        </div>

        <div class="song-details">
            <div class="title">Loading...</div>
            <div class="artist">...</div>
        </div>
    </div>

    <div class="progress-area">
        <div class="progress-bar">
            <input type="range" id="progress-slider" min="0" value="0">
        </div>
        <div class="timer">
            <span class="current-time">0:00</span>
            <span class="duration">--:--</span>
        </div>
    </div>

    <div class="player-controls">
        <button class="prev-btn"><i class="fas fa-backward-step"></i></button>
        <button class="play-pause-btn"><i class="fas fa-play"></i></button>
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
    window.CURRENT_CONTEXT = '${pageContext.request.contextPath}';
</script>
<script src="${pageContext.request.contextPath}/assets/js/app.js"></script>

</body>
</html>