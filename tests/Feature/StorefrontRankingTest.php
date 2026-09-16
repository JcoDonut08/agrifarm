<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StorefrontRankingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_delivered_walk_ins_choose_the_top_product_and_best_barangay(): void
    {
        $rosario = User::factory()->seller()->create(['name' => 'Barangay Rosario']);
        $maybunga = User::factory()->seller()->create(['name' => 'Barangay Maybunga']);
        $unlocated = User::factory()->seller()->create(['name' => 'Urban Farmer']);
        $rosarioProduct = $this->product($rosario, 'Rosario Lettuce', 'head');
        $maybungaProduct = $this->product($maybunga, 'Maybunga Pechay', 'bunch');
        $unlocatedProduct = $this->product($unlocated, 'Unlocated Basil', 'pack');

        $this->order($rosario, $rosarioProduct, 5, '500.00', 'delivered');
        $this->order($maybunga, $maybungaProduct, 1, '60.00', 'delivered');
        $this->order($maybunga, $maybungaProduct, 1, '60.00', 'delivered');
        $this->order($unlocated, $unlocatedProduct, 1, '1000.00', 'delivered');
        $this->order($maybunga, $maybungaProduct, 10, '1000.00', 'cancelled');
        $this->order($rosario, $rosarioProduct, 20, '2000.00', 'pending');

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->component('Welcome')
            ->where('bestBarangay.name', 'Rosario')
            ->where('bestBarangay.deliveredRevenue', 500)
            ->where('communityStats.0.listingCount', 1)
            ->where('communityStats.1.deliveredOrderCount', 2)
            ->where('sellerProducts.0.barangay', null)
            ->where('sellerProducts.1.barangay', 'Maybunga')
            ->where('sellerProducts.1.isBestSeller', true)
            ->where('sellerProducts.1.isTrending', true)
            ->where('sellerProducts.1.isNew', true)
            ->where('sellerProducts.2.barangay', 'Rosario')
            ->where('sellerProducts.2.isTrending', false)
            ->where('bestSellingProducts.0.id', 'seller-'.$maybungaProduct->id)
            ->where('bestSellingProducts.0.orderCount', 2)
            ->where('bestSellingProducts.1.id', 'seller-'.$unlocatedProduct->id)
            ->where('bestSellingProducts.2.id', 'seller-'.$rosarioProduct->id)
            ->where('bestBarangayProduct.id', 'seller-'.$rosarioProduct->id)
            ->etc());
    }

    public function test_ranking_waits_for_completed_orders_and_normalizes_sto_thomas(): void
    {
        $seller = User::factory()->seller()->create(['name' => 'Barangay Sto. Thomas']);
        $product = $this->product($seller, 'Sto. Tomas Eggplant', 'kg');
        $this->order($seller, $product, 2, '100.00', 'pending');

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('bestBarangay', null)
            ->where('bestSellingProducts', [])
            ->where('bestBarangayProduct', null)
            ->where('communityStats.2.listingCount', 1)
            ->where('sellerProducts.0.barangay', 'Sto. Tomas')
            ->etc());
    }

    public function test_seeded_barangay_account_email_preserves_location_when_name_changes(): void
    {
        $seller = User::factory()->seller()->create(['name' => 'Community Grower', 'email' => 'brgyrosario@gmail.com']);
        $product = $this->product($seller, 'Garden Pechay', 'bunch');
        $this->order($seller, $product, 1, '50.00', 'delivered');

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('sellerProducts.0.barangay', 'Rosario')
            ->where('bestBarangay.name', 'Rosario')
            ->where('bestSellingProducts.0.id', 'seller-'.$product->id)
            ->where('bestBarangayProduct.id', 'seller-'.$product->id)
            ->etc());
    }

    public function test_best_barangay_features_its_most_ordered_current_product(): void
    {
        $rosario = User::factory()->seller()->create(['name' => 'Barangay Rosario']);
        $maybunga = User::factory()->seller()->create(['name' => 'Barangay Maybunga']);
        $rosarioPechay = $this->product($rosario, 'Rosario Pechay', 'bunch');
        $rosarioLettuce = $this->product($rosario, 'Rosario Lettuce', 'head');
        $maybungaBasil = $this->product($maybunga, 'Maybunga Basil', 'pack');

        $this->order($rosario, $rosarioPechay, 1, '70.00', 'delivered');
        $this->order($rosario, $rosarioPechay, 1, '70.00', 'delivered');
        $this->order($rosario, $rosarioLettuce, 2, '300.00', 'delivered');
        $this->order($maybunga, $maybungaBasil, 1, '400.00', 'delivered');

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('bestBarangay.name', 'Rosario')
            ->where('bestBarangayProduct.id', 'seller-'.$rosarioPechay->id)
            ->where('bestBarangayProduct.orderCount', 2)
            ->where('bestSellingProducts.0.id', 'seller-'.$rosarioPechay->id)
            ->where('bestSellingProducts.1.id', 'seller-'.$maybungaBasil->id)
            ->where('bestSellingProducts.2.id', 'seller-'.$rosarioLettuce->id)
            ->etc());
    }

    public function test_best_barangay_can_feature_a_current_listing_after_its_sold_product_was_removed(): void
    {
        $seller = User::factory()->seller()->create(['name' => 'Barangay Rosario']);
        $soldProduct = $this->product($seller, 'Old Pechay', 'bunch');
        $this->order($seller, $soldProduct, 2, '100.00', 'delivered');
        $soldProduct->delete();
        $currentProduct = $this->product($seller, 'Fresh Lettuce', 'head');

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('bestBarangay.name', 'Rosario')
            ->where('bestSellingProducts', [])
            ->where('bestBarangayProduct.id', 'seller-'.$currentProduct->id)
            ->where('bestBarangayProduct.orderCount', 0)
            ->etc());
    }

    public function test_new_and_trending_tags_use_listing_age_and_rising_delivered_orders(): void
    {
        $seller = User::factory()->seller()->create(['name' => 'Barangay Maybunga']);
        $trending = $this->product($seller, 'Trending Kangkong', 'bunch');
        $trending->created_at = now()->subDays(9);
        $trending->save();
        $flat = $this->product($seller, 'Flat Sales Lettuce', 'head');

        $oldOrder = $this->order($seller, $trending, 1, '50.00', 'delivered');
        DB::table('walk_in_orders')->where('id', $oldOrder->id)->update(['updated_at' => now()->subDays(10)]);
        $this->order($seller, $trending, 1, '50.00', 'delivered');
        $this->order($seller, $trending, 1, '50.00', 'delivered');
        $this->order($seller, $flat, 1, '50.00', 'delivered');
        $this->order($seller, $flat, 1, '50.00', 'cancelled');

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('sellerProducts.0.name', 'Flat Sales Lettuce')
            ->where('sellerProducts.0.isNew', true)
            ->where('sellerProducts.0.isTrending', false)
            ->where('sellerProducts.1.name', 'Trending Kangkong')
            ->where('sellerProducts.1.isNew', false)
            ->where('sellerProducts.1.isTrending', true)
            ->etc());
    }

    private function product(User $seller, string $name, string $unit): Product
    {
        $product = new Product([
            'name' => $name,
            'category' => 'Vegetables',
            'price' => 50,
            'unit' => $unit,
            'stock' => 10,
            'threshold' => 2,
            'photo_path' => 'products/test.png',
        ]);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }

    private function order(User $seller, Product $product, int $quantity, string $total, string $status): WalkInOrder
    {
        $order = new WalkInOrder([
            'customer_name' => 'Walk-in customer',
            'product_name' => $product->name,
            'unit' => $product->unit,
            'quantity' => $quantity,
            'unit_price' => '50.00',
            'total' => $total,
            'status' => $status,
        ]);
        $order->user_id = $seller->id;
        $order->product_id = $product->id;
        $order->save();

        return $order;
    }
}
