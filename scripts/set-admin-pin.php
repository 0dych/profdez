<?php
/** Run from a terminal: php scripts/set-admin-pin.php */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
echo "New administrator PIN (6-32 digits): ";
$pin = trim(fgets(STDIN));
if (!preg_match('/^\d{6,32}$/', $pin)) { fwrite(STDERR, "Invalid PIN.\n"); exit(1); }
$dir = __DIR__ . '/../admin/private';
if (!is_dir($dir)) mkdir($dir, 0700, true);
$data = ['pin_hash' => password_hash($pin, PASSWORD_DEFAULT), 'is_default' => false];
if (file_put_contents($dir . '/admin-credentials.php', '<?php return ' . var_export($data, true) . ';', LOCK_EX) === false) exit(1);
echo "Administrator PIN configured.\n";
