<?php
// Local test server: php -S 127.0.0.1:8080 scripts/dev-router.php
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (preg_match('~(?:^|/)(?:\.|admin/private|scripts|data/orders\.json)|^/admin/api/(?:storage|auth-helpers|admin-credentials|telegram-config)\.php~', $path)) {
    http_response_code(404); return true;
}
return false;
