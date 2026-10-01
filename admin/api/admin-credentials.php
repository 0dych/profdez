<?php
// Runtime credentials are deliberately excluded from version control.
$path = __DIR__ . '/../private/admin-credentials.php';
return is_file($path) ? include $path : [];
