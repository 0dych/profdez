<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/auth-helpers.php';
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST'], true)) { http_response_code(405); exit; }
$payload = $method === 'POST' ? pdtReadJson() : [];
$action = $payload['action'] ?? 'create';
if ($method === 'GET' || $action !== 'create') pdtRequireAdmin();
if (!in_array($action, ['create', 'update_status', 'delete'], true)) { http_response_code(400); exit; }
if ($method === 'POST' && $action === 'create') {
    pdtRateLimit('orders', 10, 600);
    $phone = cleanOrderValue($payload['phone'] ?? '', 40);
    if (!preg_match('/^[+\d\s()\-]+$/', $phone) || strlen(preg_replace('/\D/', '', $phone)) < 10 || strlen(preg_replace('/\D/', '', $phone)) > 15) {
        http_response_code(422); echo json_encode(['success'=>false,'message'=>'Вкажіть коректний номер телефону'], JSON_UNESCAPED_UNICODE); exit;
    }
    if (!empty($payload['email']) && !filter_var($payload['email'], FILTER_VALIDATE_EMAIL)) { http_response_code(422); exit; }
}
if ($action === 'update_status' && !in_array($payload['status'] ?? '', ['new','in_progress','done','cancelled'], true)) { http_response_code(422); exit; }
$fp = fopen(pdtPrivatePath('orders.php'), 'c+');
if (!$fp || !flock($fp, LOCK_EX)) { http_response_code(503); echo json_encode(['success'=>false]); exit; }
$raw = stream_get_contents($fp);
$prefix = "<?php exit; ?>\n";
$orders = $raw === '' ? [] : json_decode(substr($raw, strlen($prefix)), true);
if (!is_array($orders)) { flock($fp, LOCK_UN); fclose($fp); http_response_code(500); echo json_encode(['success'=>false,'message'=>'Order storage invalid']); exit; }
if ($method === 'GET') { flock($fp, LOCK_UN); fclose($fp); echo json_encode($orders, JSON_UNESCAPED_UNICODE); exit; }
$newOrder = null;
if ($action === 'update_status' || $action === 'delete') {
    $index = array_search($payload['id'] ?? '', array_column($orders, 'id'), true);
    if ($index === false) { flock($fp, LOCK_UN); fclose($fp); http_response_code(404); echo json_encode(['success'=>false]); exit; }
    if ($action === 'delete') array_splice($orders, $index, 1);
    else $orders[$index]['status'] = $payload['status'];
} else {
    $newOrder = ['id'=>'ORD-'.bin2hex(random_bytes(8)), 'createdAt'=>date('c'), 'status'=>'new'];
    foreach (['name'=>120,'phone'=>40,'email'=>120,'service'=>180,'objectType'=>180,'address'=>240,'notes'=>1000] as $field=>$limit) $newOrder[$field] = cleanOrderValue($payload[$field] ?? '', $limit);
    array_unshift($orders, $newOrder);
}
$output = $prefix . json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
rewind($fp);
$saved = ftruncate($fp, 0) && fwrite($fp, $output) === strlen($output) && fflush($fp);
flock($fp, LOCK_UN); fclose($fp);
if (!$saved) { http_response_code(500); echo json_encode(['success'=>false,'message'=>'Cannot save order']); exit; }
$telegramSent = false;
$configFile = pdtPrivatePath('telegram-config.php');
if ($newOrder && is_file($configFile)) {
    $tg = include $configFile;
    if (!empty($tg['token']) && !empty($tg['chatId'])) {
        $text = "НОВА ЗАЯВКА\n";
        foreach (['name','phone','email','service','objectType','address','notes'] as $field) $text .= $field . ': ' . $newOrder[$field] . "\n";
        $context = stream_context_create(['http'=>['method'=>'POST','header'=>"Content-Type: application/x-www-form-urlencoded\r\n",'content'=>http_build_query(['chat_id'=>$tg['chatId'],'text'=>$text]),'timeout'=>8,'ignore_errors'=>true]]);
        $reply = @file_get_contents('https://api.telegram.org/bot' . $tg['token'] . '/sendMessage', false, $context);
        $telegramSent = !empty(json_decode($reply ?: '{}', true)['ok']);
    }
}
echo json_encode(['success'=>true,'telegramSent'=>$telegramSent], JSON_UNESCAPED_UNICODE);
function cleanOrderValue($value, $limit) {
    if (!is_scalar($value)) return '';
    $value = trim(strip_tags((string)$value));
    return function_exists('mb_substr') ? mb_substr($value, 0, $limit, 'UTF-8') : substr($value, 0, $limit);
}
