<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\ProductPhotoService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class GenerateProductThumbnails extends Command
{
    protected $signature = 'products:thumbnails {--force : Regenerate existing thumbnails}';

    protected $description = 'Create small WebP copies of existing product images without changing originals';

    public function handle(ProductPhotoService $photos): int
    {
        if (! extension_loaded('gd') && ! extension_loaded('imagick')) {
            $this->error('Enable GD or Imagick before generating thumbnails.');

            return self::FAILURE;
        }

        $created = $failed = $sourceBytes = $thumbnailBytes = 0;
        $seen = [];
        Product::query()->whereNotNull('photo_path')->select('id', 'photo_path')
            ->chunkById(100, function ($products) use ($photos, &$created, &$failed, &$sourceBytes, &$thumbnailBytes, &$seen) {
                foreach ($products as $product) {
                    $path = $product->photo_path;
                    if (isset($seen[$path])) {
                        continue;
                    }
                    $seen[$path] = true;
                    try {
                        if ($photos->createThumbnail($path, (bool) $this->option('force'))) {
                            $created++;
                        }
                        $sourceBytes += Storage::disk('local')->size($path);
                        $thumbnailBytes += Storage::disk('local')->size($photos->thumbnailPath($path));
                    } catch (\Throwable $exception) {
                        $failed++;
                        $this->warn("Product {$product->id}: thumbnail could not be generated. Original unchanged.");
                    }
                }
            });

        $this->info("Created {$created} thumbnails; {$failed} failed. Original images unchanged.");
        $this->line(sprintf('Image transfer sizes: originals %.2f MB; thumbnails %.2f MB.', $sourceBytes / 1048576, $thumbnailBytes / 1048576));

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
