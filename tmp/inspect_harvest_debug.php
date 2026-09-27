<?php

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

foreach (App\Models\Product::query()->where('name', 'Fresh Pechay')->where('user_id', 7)->latest('id')->get(['id', 'user_id', 'name', 'created_at']) as $product) {
    $harvests = App\Models\HarvestRecord::query()->where('product_id', $product->id)->get(['id', 'quantity', 'unit', 'harvest_date']);
    echo json_encode(['product' => $product->toArray(), 'harvest_records' => $harvests->toArray()]).PHP_EOL;
}
