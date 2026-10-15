<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StorefrontSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_scout_search_and_marketplace_filters_apply_to_seller_products(): void
    {
        $rosario = User::factory()->seller()->create(['name' => 'Barangay Rosario']);
        $maybunga = User::factory()->seller()->create(['name' => 'Barangay Maybunga']);
        $basil = $this->product($rosario, 'Garden Basil', 'Herbs', 30);
        $pechay = $this->product($rosario, 'Fresh Pechay', 'Vegetables', 35);
        $this->product($maybunga, 'Native Tomatoes', 'Fruits', 70);
        $customer = User::factory()->create();
        $this->product($customer, 'Private Basil', 'Herbs', 20);

        $this->get('/?page=marketplace&q=basil')->assertInertia(fn (Assert $page) => $page
            ->where('marketplaceResults.total', 1)
            ->where('marketplaceResults.products.0.id', 'seller-'.$basil->id)
            ->etc());
        $this->get('/?page=marketplace&q=Rosario&category=Vegetables&price=under50')->assertInertia(fn (Assert $page) => $page
            ->where('marketplaceResults.total', 1)
            ->where('marketplaceResults.products.0.id', 'seller-'.$pechay->id)
            ->etc());
        $this->get('/?page=marketplace&barangay=Maybunga&category=Herbs')->assertInertia(fn (Assert $page) => $page
            ->where('marketplaceResults.total', 0)
            ->where('marketplaceResults.products', [])
            ->etc());
    }

    public function test_marketplace_paginates_and_best_selling_sort_uses_delivered_orders(): void
    {
        $seller = User::factory()->seller()->create(['name' => 'Barangay Rosario']);
        $first = $this->product($seller, 'First Harvest', 'Vegetables', 25);
        for ($number = 2; $number <= 17; $number++) {
            $this->product($seller, 'Harvest '.$number, 'Vegetables', 25);
        }
        $order = new WalkInOrder(['product_name' => $first->name, 'unit' => 'bunch', 'quantity' => 1, 'unit_price' => 25, 'total' => 25, 'status' => 'delivered']);
        $order->user_id = $seller->id;
        $order->product_id = $first->id;
        $order->save();

        $this->get('/?page=marketplace')->assertInertia(fn (Assert $page) => $page
            ->where('marketplaceResults.total', 17)
            ->where('marketplaceResults.perPage', 16)
            ->where('marketplaceResults.lastPage', 2)
            ->has('marketplaceResults.products', 16)
            ->has('sellerProducts', 17)
            ->etc());
        $this->get('/?page=marketplace&market_page=2')->assertInertia(fn (Assert $page) => $page
            ->where('marketplaceResults.currentPage', 2)
            ->has('marketplaceResults.products', 1)
            ->where('marketplaceResults.products.0.id', 'seller-'.$first->id)
            ->etc());
        $this->get('/?page=marketplace&sort=best-selling')->assertInertia(fn (Assert $page) => $page
            ->where('marketplaceResults.products.0.id', 'seller-'.$first->id)
            ->etc());
    }

    public function test_marketplace_pages_have_no_overlap_and_keep_filters_and_full_shop_catalog(): void
    {
        $seller = User::factory()->seller()->create(['name' => 'Barangay Rosario']);
        $ids = [];
        for ($number = 1; $number <= 33; $number++) {
            $product = $this->product($seller, 'Harvest '.str_pad($number, 2, '0', STR_PAD_LEFT), $number <= 17 ? 'Herbs' : 'Vegetables', 25);
            $ids[] = 'seller-'.$product->id;
        }

        foreach ([1, 2, 3] as $number) {
            $expected = array_slice($ids, ($number - 1) * 16, 16);
            $this->get('/?page=marketplace&sort=name&market_page='.$number)->assertInertia(fn (Assert $page) => $page
                ->where('marketplaceResults.currentPage', $number)
                ->where('marketplaceResults.lastPage', 3)
                ->where('marketplaceResults.total', 33)
                ->where('marketplaceResults.products', fn ($products) => collect($products)->pluck('id')->all() === $expected)
                ->has('sellerProducts', 33)
                ->etc());
        }

        $this->get('/?page=marketplace&q=Harvest&category=Herbs&barangay=Rosario&price=under50&sort=name&market_page=2')
            ->assertInertia(fn (Assert $page) => $page
                ->where('marketplaceResults.currentPage', 2)
                ->where('marketplaceResults.lastPage', 2)
                ->where('marketplaceResults.total', 17)
                ->has('marketplaceResults.products', 1)
                ->where('marketplaceResults.products.0.id', $ids[16])
                ->where('marketplaceResults.filters', ['search' => 'Harvest', 'category' => 'Herbs', 'barangay' => 'Rosario', 'price' => 'under50', 'sort' => 'name'])
                ->has('sellerProducts', 33)
                ->etc());
        $this->get('/?page=marketplace&category=Vegetables')->assertInertia(fn (Assert $page) => $page
            ->where('marketplaceResults.lastPage', 1)
            ->has('marketplaceResults.products', 16)
            ->etc());
    }

    private function product(User $owner, string $name, string $category, float $price): Product
    {
        $product = new Product([
            'name' => $name,
            'category' => $category,
            'description' => 'Locally grown.',
            'price' => $price,
            'unit' => 'bunch',
            'stock' => 10,
            'threshold' => 2,
            'photo_path' => 'products/example.png',
        ]);
        $product->user_id = $owner->id;
        $product->save();

        return $product;
    }
}
