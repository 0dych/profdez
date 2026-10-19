<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/auth-helpers.php';
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }
pdtRequireAdmin();
$file = $_FILES['image'] ?? null;
function uploadError($message, $code = 422) {
    http_response_code($code);
    echo json_encode(['success'=>false,'message'=>$message], JSON_UNESCAPED_UNICODE);
    exit;
}
if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) uploadError('Не вдалося отримати файл. Перевірте ліміт завантаження PHP.');
if (!is_uploaded_file($file['tmp_name']) || $file['size'] > 5 * 1024 * 1024) uploadError('Оберіть фотографію розміром до 5 МБ.');
$info = @getimagesize($file['tmp_name']);
$types = ['image/jpeg'=>'jpg', 'image/png'=>'png', 'image/webp'=>'webp', 'image/gif'=>'gif'];
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
if (!$info || !isset($types[$mime]) || ($info['mime'] ?? '') !== $mime) uploadError('Дозволені лише JPG, PNG, WebP та GIF.');
if ($info[0] > 12000 || $info[1] > 12000) uploadError('Розміри фотографії не повинні перевищувати 12000 пікселів.');
$dir = __DIR__ . '/../../img/uploads';
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) uploadError('Не вдалося створити папку для фото.', 500);
$name = bin2hex(random_bytes(16)) . '.' . $types[$mime];
if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) uploadError('Не вдалося зберегти фото. Перевірте права img/uploads.', 500);
chmod($dir . '/' . $name, 0644);
echo json_encode(['success'=>true,'path'=>'img/uploads/' . $name]);
