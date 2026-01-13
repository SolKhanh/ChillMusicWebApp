<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chillscape</title>
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Science+Gothic:wght@100..900&display=swap" rel="stylesheet">

    <!-- CSS Files -->
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/index.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/vinylrecord.css">
</head>
<body>
<div id="background-container" class="background-container"
     style="background-image: url('${pageContext.request.contextPath}/assets/img/cover/background.jpg');">
</div>

<canvas id="visualizer-canvas"></canvas>
<div id="menu-container" class="menu-container">
    <i class="fa-solid fa-bars"></i>
</div>

<div id="overlay" class="overlay"></div>

<div id="sidebar" class="sidebar">
    <div class="sidebar-header">
        <h2>Thư viện</h2>
        <i class="fa-solid fa-xmark" id="close-sidebar-btn"></i>
    </div>

    <div class="sidebar-tabs">
        <button class="tab-btn active" data-tab="backgrounds">Backgrounds</button>
        <button class="tab-btn" data-tab="albums">Albums</button>
    </div>

    <div class="sidebar-content">
        <div id="tab-backgrounds" class="tab-pane active">
            <div class="shelf-grid" id="bg-shelf">
                <!-- render -->
            </div>
        </div>

        <div id="tab-albums" class="tab-pane">
            <div class="shelf-grid" id="album-shelf">
                <!-- render -->
            </div>
        </div>
    </div>

    <!-- Input file img  -->
    <input type="file" id="upload-input" style="display: none;" accept="image/*">
</div>

<div class="main-container">
    <div id="clock" class="clock"></div>
</div>
<div id="ambient-sounds-panel" class="ambient-panel"></div>
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

    <div class="player-controls">
        <button class="prev-btn"><i class="fas fa-backward-step"></i></button>
        <button class="play-pause-btn"><i class="fas fa-play"></i></button>
        <button class="next-btn"><i class="fas fa-forward-step"></i></button>
    </div>

    <div class="progress-area">
        <div class="progress-bar">
            <input type="range" id="progress-slider" min="0" value="0" step="1">
        </div>
        <div class="timer">
            <span class="current-time">0:00</span>
            <span class="duration">--:--</span>
        </div>
    </div>

    <div class="player-options">
        <button class="shuffle-btn" title="Phát ngẫu nhiên"><i class="fas fa-shuffle"></i></button>
        <button class="repeat-btn" title="Chế độ lặp"><i class="fas fa-repeat"></i></button>

        <div class="volume-container">
            <i class="fa-solid fa-volume-high" id="volume-icon"></i>
            <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0.5">
        </div>
    </div>

</div>

<!-- Truyền đường dẫn Context Path cho JavaScript -->
<script>
    window.CURRENT_CONTEXT = '${pageContext.request.contextPath}';
</script>
<script src="${pageContext.request.contextPath}/assets/js/app.js"></script>

</body>
</html>