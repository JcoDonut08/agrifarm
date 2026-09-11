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

    private function payload(): array
    {
        return ['name' => 'Fresh Pechay', 'category' => 'Vegetables', 'description' => 'Fresh harvest', 'price' => '35.50', 'unit' => 'bunch', 'stock' => 3, 'threshold' => 5, 'photo' => UploadedFile::fake()->createWithContent('photo.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII='))];
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
        $this->get($product->photo_url)->assertOk()->assertHeader('Content-Type', 'image/png');
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
}
