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
<div id="background-container" class="background-container"
     style="background-image: url('${pageContext.request.contextPath}/assets/img/cover/background.jpg');">
</div>

<div id="menu-container" class="menu-container">
    <i class="fa-solid fa-bars"></i>
</div>

<div id="overlay" class="overlay"></div>

<div id="sidebar" class="sidebar">
    <div class="sidebar-header">
        <h2>Cài đặt</h2>
        <i class="fa-solid fa-xmark" id="close-sidebar-btn"></i>
    </div>

    <div class="sidebar-content">
        <div class="setting-group">
            <h3>Tốc độ chuyển nền</h3>
            <p class="setting-desc">Thời gian giữa các hình nền.</p>

            <label class="checkbox-container">
                <input type="checkbox" id="use-preset-checkbox" checked>
                <span class="checkmark"></span>
                Sử dụng mốc có sẵn
            </label>

            <label class="radio-group">
                <input type="radio" name="bg-time" value="10" checked>
                <span>10 giây</span>
            </label>

            <label class="radio-group">
                <input type="radio" name="bg-time" value="15">
                <span>15 giây</span>
            </label>

            <label class="radio-group">
                <input type="radio" name="bg-time" value="20">
                <span>20 giây</span>
            </label>

            <div id="custom-input-container" class="custom-container hidden">
                <label for="custom-time-input">Nhập số giây:</label>
                <input type="number" id="custom-time-input" min="1" placeholder="Ví dụ: 5">
                <button id="apply-custom-btn">Áp dụng</button>
            </div>
        </div>
    </div>
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

    <div class="player-options">
        <div class="volume-container">
            <input type="range" id="volume-slider" min="0" max="1" step="0.05" value="1">
            <i class="fa-solid fa-volume-high" id="volume-icon"></i>
        </div>
    </div>

    <div class="player-controls">
        <button class="prev-btn"><i class="fas fa-backward-step"></i></button>
        <button class="play-pause-btn"><i class="fas fa-play"></i></button>
        <button class="next-btn"><i class="fas fa-forward-step"></i></button>
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

</div>

<script>
    window.CURRENT_CONTEXT = '${pageContext.request.contextPath}';
</script>
<script src="${pageContext.request.contextPath}/assets/js/app.js"></script>

</body>
</html>