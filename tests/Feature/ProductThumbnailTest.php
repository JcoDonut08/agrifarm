<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Models\Product;
use App\Models\User;
use App\Services\ProductPhotoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductThumbnailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD is required for thumbnail image tests.');
        }
    }

    public function test_existing_images_get_smaller_copies_without_changing_originals_or_records(): void
    {
        $product = $this->product();
        $original = Storage::disk('local')->get($product->photo_path);
        $originalUrl = $product->photo_url;
        $this->artisan('products:thumbnails')->assertSuccessful();
        $this->assertSame($original, Storage::disk('local')->get($product->photo_path));
        $this->assertSame($originalUrl, $product->fresh()->photo_url);
        $thumbnail = app(ProductPhotoService::class)->thumbnailPath($product->photo_path);
        $small = Storage::disk('local')->get($thumbnail);
        $dimensions = getimagesizefromstring($small);
        $this->assertSame('image/webp', $dimensions['mime']);
        $this->assertSame(800, $dimensions[0]);
        $this->assertLessThan(strlen($original), strlen($small));
        $this->artisan('products:thumbnails')
            ->expectsOutput('Created 0 thumbnails; 0 failed. Original images unchanged.')
            ->assertSuccessful();
        $this->assertSame($small, Storage::disk('local')->get($thumbnail));
    }

    public function test_thumbnail_requests_keep_authorization_and_full_size_images(): void
    {
        $product = $this->product();
        $photos = app(ProductPhotoService::class);
        $photos->createThumbnail($product->photo_path);
        $this->actingAs($product->seller);
        $response = $this->get($product->thumbnail_url)->assertOk()->assertHeader('Content-Type', 'image/webp');
        $this->assertSame(Storage::disk('local')->path($photos->thumbnailPath($product->photo_path)), $response->baseResponse->getFile()->getPathname());
        $original = $this->get($product->photo_url)->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->assertSame(Storage::disk('local')->path($product->photo_path), $original->baseResponse->getFile()->getPathname());
        $this->actingAs(User::factory()->seller()->create())->get($product->thumbnail_url)->assertNotFound();
        auth()->logout();
        $this->get($product->thumbnail_url)->assertRedirect('/login');
        $this->get('/marketplace/products/'.$product->id.'/photo?size=card')->assertOk()->assertHeader('Content-Type', 'image/webp');
        $product->seller->forceFill(['account_status' => AccountStatus::Suspended])->save();
        $this->get('/marketplace/products/'.$product->id.'/photo?size=card')->assertNotFound();
    }

    public function test_a_missing_thumbnail_falls_back_without_compressing_during_the_request(): void
    {
        $product = $this->product();
        $thumbnail = app(ProductPhotoService::class)->thumbnailPath($product->photo_path);
        $this->actingAs($product->seller)->get($product->thumbnail_url)->assertOk()->assertHeader('Content-Type', 'image/png');
        Storage::disk('local')->assertMissing($thumbnail);
        auth()->logout();
        $this->get('/marketplace/products/'.$product->id.'/photo?size=card')->assertOk()->assertHeader('Content-Type', 'image/png');
        Storage::disk('local')->assertMissing($thumbnail);
    }

    private function product(): Product
    {
        $seller = User::factory()->seller()->create();
        $image = imagecreatetruecolor(1800, 1200);
        imagefill($image, 0, 0, imagecolorallocate($image, 34, 126, 63));
        ob_start();
        imagepng($image);
        $content = ob_get_clean();
        imagedestroy($image);
        $path = 'products/'.$seller->id.'/existing.png';
        Storage::disk('local')->put($path, $content);
        $product = new Product(['name' => 'Pechay', 'category' => 'Vegetables', 'price' => 35, 'unit' => 'kg', 'stock' => 10, 'threshold' => 2, 'photo_path' => $path]);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }
}
