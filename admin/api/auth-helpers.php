<?php
/** Спільна серверна авторизація для адмін-API. */
require_once __DIR__ . '/storage.php';
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') pdtCheckOrigin();

function pdtStartSession() {
    if (session_status() === PHP_SESSION_NONE) {
        session_name('pdt_admin_session');
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Strict',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'
        ]);
        session_start();
    }
}

function pdtRequireAdmin() {
    pdtStartSession();
    if (empty($_SESSION['pdt_admin_authenticated']) || time() - ($_SESSION['pdt_admin_seen'] ?? 0) > 3600) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Потрібна авторизація адміністратора'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $_SESSION['pdt_admin_seen'] = time();
}
