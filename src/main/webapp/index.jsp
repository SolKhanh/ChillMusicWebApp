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

<div class="top-bar">
    <div id="menu-btn" class="icon-btn">
        <i class="fa-solid fa-bars"></i>
    </div>

    <div id="user-btn" class="icon-btn">
        <i class="fa-solid fa-user"></i>
        <span id="login-status-dot" class="status-dot"></span>
    </div>
</div>

<div id="user-popup" class="user-popup">
    <div id="guest-view">
        <p>Chào bạn,</p>
        <button id="btn-open-login" class="auth-btn">Đăng nhập</button>
        <button id="btn-open-register" class="auth-btn outline">Đăng ký</button>
    </div>

    <div id="user-view" style="display: none;">
        <p>Xin chào, <b id="display-username">User</b></p>
        <div class="divider"></div>
        <button id="btn-logout" class="auth-btn outline">Đăng xuất</button>
    </div>
</div>

<div id="auth-modal" class="modal-overlay">
    <div class="modal-content">
        <span id="btn-close-auth" class="close-modal">&times;</span>
        <h2 id="auth-title">Đăng Nhập</h2>

        <form id="auth-form">
            <input type="text" id="username" placeholder="Tên đăng nhập" required>
            <input type="password" id="password" placeholder="Mật khẩu" required>

            <button type="submit" class="submit-btn">Xác nhận</button>
        </form>

        <p style="margin-top: 15px; font-size: 0.9em; color: #aaa;">
            <span id="switch-auth-text">Chưa có tài khoản?</span>
            <a href="#" id="switch-auth-link">Đăng ký ngay</a>
        </p>
    </div>
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

            <div class="shelf-section">
                <h3 class="shelf-title">Có sẵn: </h3>
                <div class="shelf-scroll" id="bg-shelf-default">
                </div>
            </div>

            <div class="shelf-section">
                <h3 class="shelf-title">Của bạn</h3>
                <div class="shelf-scroll" id="bg-shelf-user">
                </div>
            </div>

        </div>

        <div id="tab-albums" class="tab-pane">

            <div class="shelf-section">
                <h3 class="shelf-title">Album gợi ý</h3>
                <div class="shelf-scroll" id="album-shelf-default"></div>
            </div>

            <div class="shelf-section">
                <h3 class="shelf-title">Album của bạn</h3>
                <div class="shelf-scroll" id="album-shelf-user">
                </div>
            </div>

        </div>
    </div>

    <input type="file" id="upload-input" style="display: none;" accept="image/*">
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