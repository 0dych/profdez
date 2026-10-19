<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/auth-helpers.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
pdtRequireAdmin();
$data = pdtReadJson();
if (!isset($data['company']) || !is_array($data['company']) || !is_string($data['company']['name'] ?? null) || !is_array($data['company']['phones'] ?? null) || count($data['company']['phones']) < 1) {
    http_response_code(422); echo json_encode(['success'=>false,'message'=>'Invalid company data']); exit;
}
foreach ($data['company']['phones'] as $phone) {
    if (!is_string($phone) || !preg_match('/^[+\d\s()\-]{7,40}$/', $phone)) { http_response_code(422); exit; }
}
foreach (['services','products'] as $key) {
    if (isset($data[$key]) && (!is_array($data[$key]) || !array_is_list($data[$key]))) { http_response_code(422); exit; }
}
$ids = [];
foreach ($data['services'] ?? [] as $service) {
    if (!is_array($service) || !preg_match('/^[a-z][a-z0-9-]{0,79}$/', $service['id'] ?? '') || isset($ids[$service['id']]) || !is_string($service['title'] ?? null)) {
        http_response_code(422); echo json_encode(['success'=>false,'message'=>'Послуги повинні мати унікальні ID та назви.'], JSON_UNESCAPED_UNICODE); exit;
    }
    $ids[$service['id']] = true;
    if (!isset($service['detail'])) continue;
    $detail = $service['detail'];
    if (!is_array($detail)) { http_response_code(422); exit; }
    foreach (['texts','images','gallery'] as $key) {
        if (!is_array($detail[$key] ?? null) || !array_is_list($detail[$key]) || count($detail[$key]) > 300) { http_response_code(422); exit; }
        foreach ($detail[$key] as $field) {
            if (!is_array($field)) { http_response_code(422); exit; }
            if ($key !== 'gallery') {
                $path = $field['path'] ?? null;
                if (!is_array($path) || !array_is_list($path) || count($path) > 30 || count($path) < 1) { http_response_code(422); exit; }
                foreach ($path as $index) if (!is_int($index) || $index < 0 || $index > 1000) { http_response_code(422); exit; }
            }
            if ($key === 'texts') {
                if (!is_string($field['value'] ?? null) || strlen($field['value']) > 30000) { http_response_code(422); exit; }
            } else {
                $src = $field['src'] ?? '';
                if (!is_string($src) || strlen($src) > 2048 || str_contains($src, '..') || !preg_match('~^(?:sert[0-9]+\.jpg(?:\?[a-zA-Z0-9_=&.-]+)?|img/[a-zA-Z0-9_./-]+\.(?:jpe?g|png|webp|gif)(?:\?[a-zA-Z0-9_=&.-]+)?|https://[^\s"<>]+)$~i', $src) || !is_string($field['alt'] ?? null)) {
                    http_response_code(422); echo json_encode(['success'=>false,'message'=>'Фото: використовуйте файл img/ або коректне HTTPS-посилання.'], JSON_UNESCAPED_UNICODE); exit;
                }
            }
        }
    }
}
// Validate photo collections used by products and the home slider.
$photoLists = [];
if (isset($data['homeSlides'])) $photoLists[] = $data['homeSlides'];
if (isset($data['certificates'])) {
    $certs = $data['certificates'];
    if (!is_array($certs) || !is_string($certs['title'] ?? null) || !is_string($certs['description'] ?? null) || strlen($certs['title']) > 10000 || strlen($certs['description']) > 10000 || !is_array($certs['items'] ?? null)) { http_response_code(422); exit; }
    $photoLists[] = $certs['items'];
    foreach ($certs['items'] as $item) foreach (['title','label','specialty','issuer','reference'] as $field) {
        if (!is_array($item) || !is_string($item[$field] ?? null) || strlen($item[$field]) > 10000) { http_response_code(422); exit; }
    }
}
foreach ($data['products'] ?? [] as $product) {
    if (isset($product['photos'])) $photoLists[] = $product['photos'];
}
foreach ($photoLists as $photos) {
    if (!is_array($photos) || !array_is_list($photos) || count($photos) > 100) { http_response_code(422); exit; }
    foreach ($photos as $photo) {
        $src = is_array($photo) ? ($photo['src'] ?? '') : '';
        if (!is_array($photo) || !is_string($src) || strlen($src) > 2048 || str_contains($src, '..') || !preg_match('~^(?:sert[0-9]+\.jpg(?:\?[a-zA-Z0-9_=&.-]+)?|img/[a-zA-Z0-9_./-]+\.(?:jpe?g|png|webp|gif)(?:\?[a-zA-Z0-9_=&.-]+)?|https://[^\s"<>]+)$~i', $src)) {
            http_response_code(422); echo json_encode(['success'=>false,'message'=>'Некоректне посилання на фото.'], JSON_UNESCAPED_UNICODE); exit;
        }
        foreach (['alt','tag','caption'] as $field) {
            if (isset($photo[$field]) && (!is_string($photo[$field]) || strlen($photo[$field]) > 10000)) { http_response_code(422); exit; }
        }
    }
}
if (isset($data['homeCases'])) {
    $cases = $data['homeCases'];
    if (!is_array($cases) || !is_array($cases['items'] ?? null) || !array_is_list($cases['items']) || count($cases['items']) > 100) { http_response_code(422); exit; }
    foreach (['tag','title','subtitle'] as $field) if (!is_string($cases[$field] ?? null) || strlen($cases[$field]) > 10000) { http_response_code(422); exit; }
    foreach ($cases['items'] as $item) {
        if (!is_array($item) || !is_int($item['template'] ?? null) || $item['template'] < 0 || $item['template'] > 99 || !is_array($item['kpis'] ?? null) || !array_is_list($item['kpis']) || count($item['kpis']) > 20) { http_response_code(422); exit; }
        foreach (['name','location','tag','taskLabel','task','resultLabel','result'] as $field) if (!is_string($item[$field] ?? null) || strlen($item[$field]) > 30000) { http_response_code(422); exit; }
        foreach ($item['kpis'] as $value) if (!is_string($value) || strlen($value) > 10000) { http_response_code(422); exit; }
    }
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
