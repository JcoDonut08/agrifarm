<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SellerProductTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return [...['name' => 'Fresh Pechay', 'category' => 'Vegetables', 'description' => 'Fresh harvest', 'price' => '35.50', 'unit' => 'bunch', 'stock' => 3, 'threshold' => 5, 'photo' => $this->photo()], ...$overrides];
    }

    public function test_seller_can_save_and_retrieve_products_and_photos_without_accessing_another_sellers_inventory(): void
    {
        Storage::fake('local');
        $this->withoutVite();
        $seller = User::factory()->create(['role' => UserRole::Seller]);
        $other = User::factory()->create(['role' => UserRole::Seller]);
        $this->actingAs($seller)->post('/seller/products', [...$this->payload(), 'user_id' => $other->id])->assertSessionHasNoErrors()->assertRedirect('/seller/dashboard?section=products');
        $product = Product::firstOrFail();
        $this->assertSame($seller->id, $product->user_id);
        $this->assertSame('35.50', $product->price);
        Storage::disk('local')->assertExists($product->photo_path);
        $this->get($product->photo_url)->assertOk()->assertHeader('Content-Type', extension_loaded('gd') || extension_loaded('imagick') ? 'image/webp' : 'image/png');
        $this->get('/seller/dashboard')->assertInertia(fn (Assert $page) => $page->has('products', 1)->where('products.0.name', 'Fresh Pechay'));
        $this->actingAs($other)->get('/seller/dashboard')->assertInertia(fn (Assert $page) => $page->has('products', 0));
        $this->get($product->photo_url)->assertNotFound();
    }

    public function test_invalid_data_and_non_seller_requests_are_rejected(): void
    {
        Storage::fake('local');
        $this->actingAs(User::factory()->create(['role' => UserRole::Seller]));
        $this->post('/seller/products', [...$this->payload(), 'price' => '-1', 'stock' => '1.5', 'unit' => 'invalid', 'category' => 'invalid', 'photo' => UploadedFile::fake()->create('bad.txt', 1, 'text/plain')])->assertSessionHasErrors(['price', 'stock', 'unit', 'category', 'photo']);
        $this->assertDatabaseCount('products', 0);
        $this->actingAs(User::factory()->create(['role' => UserRole::Customer]))->post('/seller/products', $this->payload())->assertForbidden();
    }

    public function test_product_photo_limit_is_ten_megabytes(): void
    {
        Storage::fake('local');
        $this->actingAs(User::factory()->seller()->create());

        $this->post('/seller/products', $this->payload(['photo' => $this->photo()->size(10240)]))
            ->assertSessionHasNoErrors();
        $this->assertDatabaseCount('products', 1);

        $this->post('/seller/products', $this->payload(['photo' => $this->photo()->size(10241)]))
            ->assertSessionHasErrors('photo');
        $this->assertDatabaseCount('products', 1);
    }

    public function test_enabled_image_driver_resizes_and_encodes_seller_photos(): void
    {
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD is disabled in this PHP process.');
        }

        Storage::fake('local');
        $seller = User::factory()->seller()->create();
        $image = imagecreatetruecolor(1800, 1200);
        imagefill($image, 0, 0, imagecolorallocate($image, 34, 126, 63));
        ob_start();
        imagejpeg($image, null, 90);
        $content = ob_get_clean();
        imagedestroy($image);

        $this->actingAs($seller)->post('/seller/products', $this->payload([
            'photo' => UploadedFile::fake()->createWithContent('harvest.jpg', $content),
        ]))->assertSessionHasNoErrors();
        $product = Product::firstOrFail();
        $this->assertStringEndsWith('.webp', $product->photo_path);
        $stored = Storage::disk('local')->get($product->photo_path);
        $dimensions = getimagesizefromstring($stored);
        $this->assertSame('image/webp', $dimensions['mime']);
        $this->assertSame(1600, $dimensions[0]);
        $this->assertLessThan(strlen($content), strlen($stored));
    }

    public function test_seller_can_edit_a_product_and_optionally_replace_its_photo(): void
    {
        Storage::fake('local');
        $seller = User::factory()->create(['role' => UserRole::Seller]);
        $otherSeller = User::factory()->create(['role' => UserRole::Seller]);
        $this->actingAs($seller)->post('/seller/products', $this->payload())->assertSessionHasNoErrors();
        $product = Product::firstOrFail();
        $originalPath = $product->photo_path;
        $originalUrl = $product->photo_url;

        $this->post("/seller/products/{$product->id}", [...$this->payload([
            'name' => 'Premium Pechay',
            'price' => '42.00',
            'stock' => 9,
        ]), '_method' => 'patch', 'photo' => null])->assertSessionHasNoErrors()->assertRedirect('/seller/dashboard?section=products');
        $this->assertSame('Premium Pechay', $product->fresh()->name);
        $this->assertSame($originalPath, $product->photo_path);
        Storage::disk('local')->assertExists($originalPath);

        $replacement = $this->photo('replacement.png');
        $this->post("/seller/products/{$product->id}", [...$this->payload(['name' => 'Premium Pechay', 'photo' => $replacement]), '_method' => 'patch'])
            ->assertSessionHasNoErrors();
        $replacementPath = $product->fresh()->photo_path;
        $this->assertNotSame($originalPath, $replacementPath);
        $this->assertNotSame($originalUrl, $product->fresh()->photo_url);
        Storage::disk('local')->assertMissing($originalPath);
        Storage::disk('local')->assertExists($replacementPath);

        $this->actingAs($otherSeller)->post("/seller/products/{$product->id}", [...$this->payload(['photo' => null]), '_method' => 'patch'])
            ->assertNotFound();
    }

    public function test_seller_can_delete_one_or_multiple_products_without_touching_another_sellers_inventory(): void
    {
        Storage::fake('local');
        $seller = User::factory()->create(['role' => UserRole::Seller]);
        $otherSeller = User::factory()->create(['role' => UserRole::Seller]);

        $this->actingAs($seller);
        foreach (['Pechay', 'Tomatoes', 'Basil'] as $name) {
            $this->post('/seller/products', $this->payload(['name' => $name]))->assertSessionHasNoErrors();
        }
        $sellerProducts = Product::where('user_id', $seller->id)->get();
        $single = $sellerProducts->first();
        $singlePath = $single->photo_path;

        $this->actingAs($otherSeller)->post('/seller/products', $this->payload(['name' => 'Other seller product']))->assertSessionHasNoErrors();
        $otherProduct = Product::where('user_id', $otherSeller->id)->firstOrFail();

        $this->actingAs($seller)->delete("/seller/products/{$single->id}")
            ->assertSessionHasNoErrors()->assertRedirect('/seller/dashboard?section=products');
        $this->assertDatabaseMissing('products', ['id' => $single->id]);
        Storage::disk('local')->assertMissing($singlePath);

        $remaining = $sellerProducts->where('id', '!=', $single->id);
        $remainingPaths = $remaining->pluck('photo_path')->all();
        $this->delete('/seller/products', ['product_ids' => $remaining->pluck('id')->all()])
            ->assertSessionHasNoErrors()->assertRedirect('/seller/dashboard?section=products');
        $this->assertDatabaseMissing('products', ['user_id' => $seller->id]);
        foreach ($remainingPaths as $path) {
            Storage::disk('local')->assertMissing($path);
        }
        $this->assertDatabaseHas('products', ['id' => $otherProduct->id]);
        Storage::disk('local')->assertExists($otherProduct->photo_path);

        $this->delete('/seller/products', ['product_ids' => [$otherProduct->id]])->assertSessionHasErrors('product_ids');
        $this->delete("/seller/products/{$otherProduct->id}")->assertNotFound();
        $this->assertDatabaseHas('products', ['id' => $otherProduct->id]);
    }

    private function photo(string $name = 'photo.png'): UploadedFile
    {
        if (! extension_loaded('gd')) {
            return UploadedFile::fake()->createWithContent($name, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII='));
        }

        $image = imagecreatetruecolor(4, 4);
        imagefill($image, 0, 0, imagecolorallocate($image, 34, 126, 63));
        ob_start();
        imagepng($image);
        $content = ob_get_clean();
        imagedestroy($image);

        return UploadedFile::fake()->createWithContent($name, $content);
    }
}
