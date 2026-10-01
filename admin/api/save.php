<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/auth-helpers.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
pdtRequireAdmin();
$data = pdtReadJson();
if (!isset($data['company']) || !is_array($data['company']) || !is_string($data['company']['name'] ?? null) || !is_array($data['company']['phones'] ?? null) || count($data['company']['phones']) < 2) {
    http_response_code(422); echo json_encode(['success'=>false,'message'=>'Invalid company data']); exit;
}
foreach ($data['company']['phones'] as $phone) {
    if (!is_string($phone) || !preg_match('/^[+\d\s()\-]{7,40}$/', $phone)) { http_response_code(422); exit; }
}
foreach (['services','products'] as $key) {
    if (isset($data[$key]) && (!is_array($data[$key]) || !array_is_list($data[$key]))) { http_response_code(422); exit; }
}
unset($data['telegramBot']);
$target = __DIR__ . '/../../data/content.json';
$json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$temp = tempnam(dirname($target), '.content-');
if (!$temp || file_put_contents($temp, $json, LOCK_EX) === false || !rename($temp, $target)) {
    if ($temp && file_exists($temp)) unlink($temp);
    http_response_code(500); echo json_encode(['success'=>false,'message'=>'Cannot save content']); exit;
}
echo json_encode(['success'=>true,'message'=>'Saved','updated_at'=>date('c')]);
