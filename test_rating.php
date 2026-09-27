<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$s = new \App\Services\BarangayMonitoringService();
var_dump(collect($s->data()['allBarangaysData']['statusTable'])->where('name', 'Rosario')->first());
