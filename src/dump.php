<?php
$phpcode = file_get_contents("php://stdin");
fputs(STDOUT, json_encode(token_get_all($phpcode)));
