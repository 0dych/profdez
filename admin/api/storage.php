<?php
function pdtPrivatePath($name) {
    $dir = __DIR__ . '/../private';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new RuntimeException('Private storage unavailable');
    return $dir . '/' . $name;
}
function pdtReadJson() {
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        http_response_code(415); echo json_encode(['success'=>false,'message'=>'Expected JSON']); exit;
    }
    $raw = file_get_contents('php://input', false, null, 0, 1048577);
    if (strlen($raw) > 1048576) { http_response_code(413); exit; }
    $data = json_decode($raw, true);
    if (!is_array($data) || array_is_list($data)) {
        http_response_code(400); echo json_encode(['success'=>false,'message'=>'Invalid JSON object']); exit;
    }
    return $data;
}
function pdtCheckOrigin() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $expected = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? '');
    if ($origin !== '' && $origin !== $expected) { http_response_code(403); echo json_encode(['success'=>false,'message'=>'Origin not allowed']); exit; }
}
function pdtRateLimit($scope, $limit, $window) {
    $path = pdtPrivatePath('rate-' . hash('sha256', $scope . ($_SERVER['REMOTE_ADDR'] ?? 'unknown')) . '.php');
    $fp = fopen($path, 'c+');
    if (!$fp || !flock($fp, LOCK_EX)) { http_response_code(503); exit; }
    $raw = stream_get_contents($fp);
    $events = json_decode(substr($raw, strlen("<?php exit; ?>\n")), true) ?: [];
    $events = array_values(array_filter($events, fn($t) => $t > time() - $window));
    if (count($events) >= $limit) { flock($fp, LOCK_UN); fclose($fp); http_response_code(429); header('Retry-After: ' . $window); echo json_encode(['success'=>false,'message'=>'Too many requests; try later']); exit; }
    $events[] = time(); rewind($fp); ftruncate($fp, 0); fwrite($fp, "<?php exit; ?>\n" . json_encode($events)); fflush($fp); flock($fp, LOCK_UN); fclose($fp);
}
