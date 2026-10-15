<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Models\CustomerCheckout;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StorefrontRecommendationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_completed_purchases_and_related_categories_rank_before_general_popularity(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $customer = User::factory()->create();
        $basil = $this->product($seller, 'Basil', 'Herbs');
        $mint = $this->product($seller, 'Mint', 'Herbs');
        $fruit = $this->product($seller, 'Calamansi', 'Fruits');
        $popular = $this->product($seller, 'Pechay', 'Vegetables');
        $this->order($basil, $customer);
        $this->order($basil, $customer);
        for ($i = 0; $i < 5; $i++) {
            $this->order($popular);
        }

        $this->actingAs($customer)->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('productRecommendations.personalized', true)
            ->where('productRecommendations.productIds', ['seller-'.$basil->id, 'seller-'.$mint->id, 'seller-'.$popular->id, 'seller-'.$fruit->id]));
    }

    public function test_personalization_uses_only_the_authenticated_customers_completed_online_orders(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $customer = User::factory()->create();
        $otherCustomer = User::factory()->create();
        $ownProduct = $this->product($seller, 'Pechay', 'Vegetables');
        $related = $this->product($seller, 'Okra', 'Vegetables');
        $otherProduct = $this->product($seller, 'Basil', 'Herbs');
        $this->order($ownProduct, $customer);
        for ($i = 0; $i < 5; $i++) {
            $this->order($otherProduct, $otherCustomer);
        }
        foreach (['pending', 'cancelled', 'reservation', 'preparing', 'out_for_delivery'] as $status) {
            $this->order($otherProduct, $customer, $status);
        }

        $this->actingAs($customer)->get('/?user_id='.$otherCustomer->id)->assertInertia(fn (Assert $page) => $page
            ->has('productRecommendations', 2)
            ->where('productRecommendations.personalized', true)
            ->where('productRecommendations.productIds', ['seller-'.$ownProduct->id, 'seller-'.$related->id, 'seller-'.$otherProduct->id]));
        $this->actingAs($otherCustomer)->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('productRecommendations.productIds.0', 'seller-'.$otherProduct->id));
    }

    public function test_guests_and_customers_without_history_get_up_to_four_available_products(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $products = collect(range(1, 6))->map(fn ($number) => $this->product($seller, 'Produce '.$number, 'Vegetables'));
        $this->order($products[0]);
        $expected = ['seller-'.$products[0]->id, 'seller-'.$products[5]->id, 'seller-'.$products[4]->id, 'seller-'.$products[3]->id];

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('productRecommendations.personalized', false)
            ->where('productRecommendations.productIds', $expected));
        $this->actingAs(User::factory()->create())->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('productRecommendations.personalized', false)
            ->where('productRecommendations.productIds', $expected));
    }

    public function test_only_public_orderable_listings_are_recommended_including_available_preorders(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $customer = User::factory()->create();
        $available = $this->product($seller, 'Available basil', 'Herbs');
        $preorder = $this->product($seller, 'Mint harvest', 'Herbs', ['stock' => 0, 'expected_yield' => 5, 'harvest_date' => now()->addWeek()->toDateString()]);
        $soldOut = $this->product($seller, 'Sold out', 'Herbs', ['stock' => 0]);
        $hidden = $this->product($seller, 'Hidden', 'Herbs', ['status' => 'hidden']);
        $suspended = User::factory()->seller()->create(['barangay' => 'Rosario', 'account_status' => AccountStatus::Suspended]);
        $suspendedProduct = $this->product($suspended, 'Suspended listing', 'Herbs');
        $this->product($customer, 'Not a seller listing', 'Herbs');
        foreach ([$soldOut, $hidden, $suspendedProduct] as $product) {
            $this->order($product, $customer);
        }

        $this->actingAs($customer)->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('productRecommendations.personalized', true)
            ->where('productRecommendations.productIds', ['seller-'.$preorder->id, 'seller-'.$available->id]));
    }

    public function test_no_available_matches_do_not_claim_personalization(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $customer = User::factory()->create();
        $soldOut = $this->product($seller, 'Sold out basil', 'Herbs', ['stock' => 0]);
        $fruit = $this->product($seller, 'Available calamansi', 'Fruits');
        $this->order($soldOut, $customer);

        $this->actingAs($customer)->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('productRecommendations.personalized', false)
            ->where('productRecommendations.productIds', ['seller-'.$fruit->id]));
        $fruit->update(['stock' => 0]);
        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('productRecommendations.personalized', false)
            ->where('productRecommendations.productIds', []));
    }

    public function test_deleted_historical_products_fall_back_without_errors(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $customer = User::factory()->create();
        $old = $this->product($seller, 'Old basil', 'Herbs');
        $this->order($old, $customer);
        $old->delete();
        $available = $this->product($seller, 'Pechay', 'Vegetables');

        $this->actingAs($customer)->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('productRecommendations.personalized', false)
            ->where('productRecommendations.productIds', ['seller-'.$available->id]));
    }

    public function test_recommendations_are_only_computed_for_the_homepage(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $this->product($seller, 'Basil', 'Herbs');

        foreach (['marketplace', 'cart', 'favorites'] as $page) {
            $this->get('/?page='.$page)->assertInertia(fn (Assert $props) => $props->missing('productRecommendations'));
        }
    }

    private function product(User $seller, string $name, string $category, array $overrides = []): Product
    {
        $product = new Product(['name' => $name, 'category' => $category, 'price' => 20, 'unit' => 'bunch', 'stock' => 10, 'threshold' => 1, 'photo_path' => 'test/recommendations.jpg']);
        $product->forceFill(['user_id' => $seller->id, ...$overrides])->save();

        return $product;
    }

    private function order(Product $product, ?User $customer = null, string $status = 'delivered'): void
    {
        $checkout = $customer ? CustomerCheckout::create([
            'id' => (string) Str::uuid(), 'user_id' => $customer->id,
            'recipient_name' => 'Recommendation customer', 'phone' => '09170000000',
            'address' => 'Test garden', 'barangay' => 'Rosario', 'payment_method' => 'cod', 'goods_total' => 20,
        ]) : null;
        $order = new WalkInOrder(['product_name' => $product->name, 'unit' => $product->unit, 'quantity' => 1, 'unit_price' => 20, 'total' => 20, 'status' => $status]);
        $order->forceFill(['user_id' => $product->user_id, 'product_id' => $product->id, 'customer_checkout_id' => $checkout?->id])->save();
    }
}
