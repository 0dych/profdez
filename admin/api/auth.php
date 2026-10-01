<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/auth-helpers.php';
pdtStartSession();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$credentialsFile = __DIR__ . '/admin-credentials.php';
$credentials = include $credentialsFile;

if (empty($credentials['pin_hash']) || !empty($credentials['is_default'])) {
    http_response_code(503);
    echo json_encode(['success' => false, 'message' => 'Спочатку задайте PIN через php scripts/set-admin-pin.php'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (time() - ($_SESSION['pdt_admin_seen'] ?? 0) > 3600) unset($_SESSION['pdt_admin_authenticated']);
    echo json_encode([
        'authenticated' => !empty($_SESSION['pdt_admin_authenticated']),
        'isDefaultPin' => !empty($credentials['is_default'])
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Тільки GET та POST запити дозволені']);
    exit;
}

$payload = pdtReadJson();
$action = $payload['action'] ?? 'login';

if ($action === 'login') {
    pdtRateLimit('login', 8, 900);
    $pin = (string) ($payload['pin'] ?? '');
    if (!password_verify($pin, $credentials['pin_hash'] ?? '')) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Невірний PIN-код'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    session_regenerate_id(true);
    $_SESSION['pdt_admin_authenticated'] = true;
    $_SESSION['pdt_admin_seen'] = time();
    echo json_encode(['success' => true, 'isDefaultPin' => !empty($credentials['is_default'])], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'change_pin') {
    pdtRequireAdmin();
    if (empty($_SESSION['pdt_admin_authenticated'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Потрібна авторизація'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $newPin = (string) ($payload['newPin'] ?? '');
    if (!preg_match('/^\d{6,32}$/', $newPin)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'PIN має містити від 6 до 32 цифр'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $php = "<?php\nreturn " . var_export([
        'pin_hash' => password_hash($newPin, PASSWORD_DEFAULT),
        'is_default' => false
    ], true) . ";\n";
    if (file_put_contents(pdtPrivatePath('admin-credentials.php'), $php, LOCK_EX) === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Не вдалося зберегти PIN. Перевірте права на папку admin/api/.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'message' => 'Невідома дія'], JSON_UNESCAPED_UNICODE);
