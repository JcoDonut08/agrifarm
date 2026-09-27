<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductReview;
use App\Models\User;
use App\Services\WeatherService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class SellerDashboardRatingTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_rating_uses_reviews_across_the_sellers_products(): void
    {
        $this->withoutVite();
        $weather = Mockery::mock(WeatherService::class);
        $weather->shouldReceive('current')->once()->andReturn(null);
        $this->app->instance(WeatherService::class, $weather);

        $seller = User::factory()->seller()->create();
        $otherSeller = User::factory()->seller()->create();
        $customerA = User::factory()->create();
        $customerB = User::factory()->create();
        $product = $this->product($seller, 'Pechay');
        $otherProduct = $this->product($otherSeller, 'Tomato');

        ProductReview::create(['product_key' => 'seller-'.$product->id, 'product_id' => $product->id, 'user_id' => $customerA->id, 'rating' => 5, 'comment' => 'Excellent fresh produce.', 'anonymous' => false]);
        ProductReview::create(['product_key' => 'seller-'.$product->id, 'product_id' => $product->id, 'user_id' => $customerB->id, 'rating' => 4, 'comment' => 'Very good local harvest.', 'anonymous' => false]);
        ProductReview::create(['product_key' => 'seller-'.$otherProduct->id, 'product_id' => $otherProduct->id, 'user_id' => $customerA->id, 'rating' => 1, 'comment' => 'This belongs to another seller.', 'anonymous' => false]);

        $this->actingAs($seller)->get('/seller/dashboard')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Dashboard')
                ->where('reviewSummary.count', 2)
                ->where('reviewSummary.average', 4.5));
    }

    private function product(User $seller, string $name): Product
    {
        $product = new Product([
            'name' => $name,
            'category' => 'Vegetables',
            'description' => 'Fresh harvest',
            'price' => '25.00',
            'unit' => 'bundle',
            'stock' => 5,
            'threshold' => 2,
            'photo_path' => 'products/test.png',
        ]);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }
}
