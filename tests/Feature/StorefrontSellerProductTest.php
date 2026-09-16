<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StorefrontSellerProductTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('local');
    }

    public function test_seller_additions_and_updates_appear_to_guests_with_public_photos(): void
    {
        $seller = User::factory()->seller()->create(['name' => 'Rosario Community Farm']);
        Storage::disk('local')->put('seller-avatars/'.$seller->id.'/avatar.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII='));
        $seller->forceFill(['avatar_url' => '/seller/profile/photo?image=avatar.png'])->save();
        $this->actingAs($seller)->post('/seller/products', $this->payload())->assertSessionHasNoErrors();
        $product = Product::firstOrFail();

        auth()->logout();
        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->component('Welcome')
            ->has('sellerProducts', 1)
            ->where('sellerProducts.0.id', 'seller-'.$product->id)
            ->where('sellerProducts.0.name', 'Fresh Pechay')
            ->where('sellerProducts.0.sellerId', $seller->id)
            ->where('sellerProducts.0.sellerName', 'Rosario Community Farm')
            ->where('sellerProducts.0.sellerAvatarUrl', '/marketplace/sellers/'.$seller->id.'/photo')
            ->where('sellerProducts.0.price', 35.5)
            ->where('sellerProducts.0.stock', 3)
            ->etc());
        $this->get('/?page=marketplace')->assertInertia(fn (Assert $page) => $page->has('sellerProducts', 1)->etc());
        $this->get('/?page=product&product=seller-'.$product->id)->assertInertia(fn (Assert $page) => $page
            ->where('reviewFeed.summary.count', 0)->etc());
        $this->get('/?page=seller&seller='.$seller->id)->assertInertia(fn (Assert $page) => $page
            ->component('Welcome')
            ->where('sellerProfile.id', $seller->id)
            ->where('sellerProfile.name', 'Rosario Community Farm')
            ->where('sellerProfile.avatarUrl', '/marketplace/sellers/'.$seller->id.'/photo')
            ->where('sellerProfile.listingCount', 1)
            ->where('sellerProfile.products.0.id', 'seller-'.$product->id)
            ->etc());
        $this->get('/?page=seller&seller=999999')->assertInertia(fn (Assert $page) => $page
            ->missing('sellerProfile')->etc());
        $this->get('/marketplace/sellers/'.$seller->id.'/photo')->assertOk();
        $this->get('/marketplace/products/'.$product->id.'/photo')->assertOk()->assertHeader('Content-Type', extension_loaded('gd') || extension_loaded('imagick') ? 'image/webp' : 'image/png');
        $this->get($product->photo_url)->assertRedirect('/login');

        $this->actingAs($seller)->post('/seller/products/'.$product->id, [...$this->payload(['name' => 'Premium Pechay', 'price' => '42.00', 'stock' => 9]), '_method' => 'patch', 'photo' => null])
            ->assertSessionHasNoErrors();
        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('sellerProducts.0.name', 'Premium Pechay')
            ->where('sellerProducts.0.price', 42)
            ->where('sellerProducts.0.stock', 9)
            ->etc());
    }

    public function test_only_seller_products_are_public_and_deleted_products_lose_their_reviews(): void
    {
        $seller = User::factory()->seller()->create();
        $customer = User::factory()->create();
        $this->actingAs($seller)->post('/seller/products', $this->payload())->assertSessionHasNoErrors();
        $product = Product::firstOrFail();
        $this->actingAs($customer)->post('/product-reviews', [
            'product_key' => 'seller-'.$product->id,
            'rating' => 5,
            'comment' => 'Fresh and crisp pechay from a local seller.',
            'anonymous' => true,
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('product_reviews', ['product_id' => $product->id, 'anonymous' => true]);

        $notSellerProduct = new Product(['name' => 'Private item', 'category' => 'Vegetables', 'description' => null, 'price' => 10, 'unit' => 'piece', 'stock' => 1, 'threshold' => 1, 'photo_path' => $product->photo_path]);
        $notSellerProduct->user_id = $customer->id;
        $notSellerProduct->save();
        $this->get('/marketplace/products/'.$notSellerProduct->id.'/photo')->assertNotFound();
        $this->post('/product-reviews', ['product_key' => 'seller-'.$notSellerProduct->id, 'rating' => 5, 'comment' => 'This should not be reviewable.', 'anonymous' => false])->assertSessionHasErrors('product_key');

        $this->actingAs($seller)->delete('/seller/products/'.$product->id)->assertSessionHasNoErrors();
        $this->assertDatabaseCount('product_reviews', 0);
        $this->get('/marketplace/products/'.$product->id.'/photo')->assertNotFound();
        $this->get('/')->assertInertia(fn (Assert $page) => $page->has('sellerProducts', 0)->etc());
    }

    private function payload(array $overrides = []): array
    {
        return array_replace([
            'name' => 'Fresh Pechay',
            'category' => 'Vegetables',
            'description' => 'Fresh harvest from our farm.',
            'price' => '35.50',
            'unit' => 'bunch',
            'stock' => 3,
            'threshold' => 5,
            'photo' => $this->photo(),
        ], $overrides);
    }

    private function photo(): UploadedFile
    {
        if (! extension_loaded('gd')) {
            return UploadedFile::fake()->createWithContent('photo.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII='));
        }

        $image = imagecreatetruecolor(4, 4);
        imagefill($image, 0, 0, imagecolorallocate($image, 34, 126, 63));
        ob_start();
        imagepng($image);
        $content = ob_get_clean();
        imagedestroy($image);

        return UploadedFile::fake()->createWithContent('photo.png', $content);
    }
}
