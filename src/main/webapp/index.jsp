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

    <!-- CSS Files (Modularized) -->
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/core.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/visuals.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/ui.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/player.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/vinylrecord.css">
</head>
<body>

<!-- Background & Visualizer -->
<div id="background-container" class="background-container"
     style="background-image: url('${pageContext.request.contextPath}/assets/img/cover/background.jpg');">
</div>
<canvas id="visualizer-canvas"></canvas>

<!-- Top Bar -->
<div class="top-bar">
    <div id="menu-btn" class="icon-btn">
        <i class="fa-solid fa-bars"></i>
    </div>
    <div id="user-btn" class="icon-btn">
        <i class="fa-solid fa-user"></i>
        <span id="login-status-dot" class="status-dot"></span>
    </div>
</div>

<!-- Popups & Modals -->
<div id="user-popup" class="user-popup">
    <div id="guest-view">
        <p>Chào bạn,</p>
        <button id="btn-open-login" class="auth-btn">Đăng nhập</button>
        <button id="btn-open-register" class="auth-btn outline">Đăng ký</button>
    </div>
    <div id="user-view" style="display: none;">
        <p>Xin chào, <b id="display-username">User</b></p>
        <div class="divider" style="margin: 10px 0; border-top: 1px solid #444;"></div>
        <button id="btn-logout" class="auth-btn outline">Đăng xuất</button>
    </div>
</div>

<div id="auth-modal" class="modal-overlay">
    <!-- ... existing auth modal content ... -->
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

<!-- NEW: UPLOAD SONG MODAL -->
<div id="upload-song-modal" class="modal-overlay">
    <div class="modal-content" style="width: 400px; text-align: left;">
        <span id="btn-close-upload" class="close-modal">&times;</span>
        <h2 style="text-align: center; margin-bottom: 20px;">Thêm Bài Hát Mới</h2>

        <form id="upload-song-form">
            <input type="hidden" id="upload-collection-id">

            <div class="form-group">
                <label>File nhạc (MP3):</label>
                <div class="file-upload-box">
                    <input type="file" id="song-file" accept="audio/*" required>
                </div>
            </div>

            <div class="form-group">
                <label>Ảnh bìa (Tùy chọn):</label>
                <div class="file-upload-box">
                    <input type="file" id="song-cover" accept="image/*">
                </div>
            </div>

            <div class="form-group">
                <input type="text" id="song-title" placeholder="Tên bài hát" required>
            </div>

            <div class="form-group">
                <input type="text" id="song-artist" placeholder="Tên nghệ sĩ (Ca sĩ)">
            </div>

            <button type="submit" class="submit-btn">Tải lên</button>
        </form>
    </div>
</div>

<div id="overlay" class="overlay"></div>

<!-- Sidebar -->
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
                <h3 class="shelf-title">Hệ thống</h3>
                <div class="shelf-grid shelf-scroll" id="bg-shelf"></div>
            </div>
            <div id="bg-container-owner"></div>
            <div id="bg-container-subscriber"></div>
        </div>

        <div id="tab-albums" class="tab-pane">
            <div class="shelf-section">
                <h3 class="shelf-title">Hệ thống</h3>
                <div class="shelf-grid shelf-scroll" id="album-shelf"></div>
            </div>
            <div id="playlist-container-owner"></div>
            <div id="playlist-container-subscriber"></div>
        </div>
    </div>

    <input type="file" id="upload-input" style="display: none;" accept="image/*">
</div>

<!-- Main UI -->
<div class="main-container">
    <div id="clock" class="clock"></div>
</div>

<div id="ambient-sounds-panel" class="ambient-panel"></div>

<!-- Player -->
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

<script>
    window.CURRENT_CONTEXT = '${pageContext.request.contextPath}';
</script>
<script src="${pageContext.request.contextPath}/assets/js/app.js"></script>

</body>
</html>