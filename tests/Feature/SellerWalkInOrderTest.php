<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SellerWalkInOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_record_a_walk_in_order_and_stock_is_reduced(): void
    {
        $this->withoutVite();
        $seller = User::factory()->create(['role' => UserRole::Seller]);
        $product = $this->product($seller, 8);

        $this->actingAs($seller)->post('/seller/orders/walk-in', [
            'customer_name' => 'Maria Santos',
            'product_id' => $product->id,
            'quantity' => 3,
        ])->assertSessionHasNoErrors()->assertRedirect('/seller/dashboard?section=orders');

        $this->assertDatabaseHas('walk_in_orders', [
            'user_id' => $seller->id,
            'product_id' => $product->id,
            'customer_name' => 'Maria Santos',
            'product_name' => 'Fresh Pechay',
            'quantity' => 3,
            'unit_price' => '35.50',
            'total' => '106.50',
            'status' => 'pending',
        ]);
        $this->assertSame(5, $product->fresh()->stock);
        $this->get('/seller/dashboard?section=orders')->assertInertia(fn (Assert $page) => $page
            ->has('orders', 1)
            ->where('orders.0.customer_name', 'Maria Santos')
            ->where('orders.0.total', '106.50'));
    }

    public function test_walk_in_orders_are_scoped_to_the_seller_and_cannot_exceed_stock(): void
    {
        $seller = User::factory()->create(['role' => UserRole::Seller]);
        $otherSeller = User::factory()->create(['role' => UserRole::Seller]);
        $product = $this->product($seller, 2);
        $otherProduct = $this->product($otherSeller, 10);

        $this->actingAs($seller)->post('/seller/orders/walk-in', ['product_id' => $otherProduct->id, 'quantity' => 1])
            ->assertSessionHasErrors('product_id');
        $this->post('/seller/orders/walk-in', ['product_id' => $product->id, 'quantity' => 3])
            ->assertSessionHasErrors('quantity');
        $this->assertDatabaseCount('walk_in_orders', 0);
        $this->assertSame(2, $product->fresh()->stock);
    }

    public function test_seller_can_progress_an_order_through_the_delivery_workflow(): void
    {
        $seller = User::factory()->create(['role' => UserRole::Seller]);
        $product = $this->product($seller, 8);

        $this->actingAs($seller)->post('/seller/orders/walk-in', [
            'product_id' => $product->id,
            'quantity' => 2,
        ])->assertSessionHasNoErrors();

        $order = WalkInOrder::firstOrFail();

        $this->patch("/seller/orders/{$order->id}/status", ['status' => 'preparing'])
            ->assertSessionHasNoErrors()
            ->assertRedirect('/seller/dashboard?section=orders');
        $this->assertSame('preparing', $order->fresh()->status);

        $this->patch("/seller/orders/{$order->id}/status", ['status' => 'out_for_delivery'])
            ->assertSessionHasNoErrors();
        $this->assertSame('out_for_delivery', $order->fresh()->status);

        $this->patch("/seller/orders/{$order->id}/status", ['status' => 'delivered'])
            ->assertSessionHasNoErrors();
        $this->assertSame('delivered', $order->fresh()->status);

        $this->patch("/seller/orders/{$order->id}/status", ['status' => 'cancelled'])
            ->assertSessionHasErrors('status');
        $this->assertSame('delivered', $order->fresh()->status);
        $this->assertSame(6, $product->fresh()->stock);
    }

    public function test_cancelling_restores_stock_once_and_other_sellers_cannot_update_the_order(): void
    {
        $seller = User::factory()->create(['role' => UserRole::Seller]);
        $otherSeller = User::factory()->create(['role' => UserRole::Seller]);
        $product = $this->product($seller, 6);

        $this->actingAs($seller)->post('/seller/orders/walk-in', [
            'product_id' => $product->id,
            'quantity' => 2,
        ])->assertSessionHasNoErrors();

        $order = WalkInOrder::firstOrFail();
        $this->assertSame(4, $product->fresh()->stock);

        $this->patch("/seller/orders/{$order->id}/status", ['status' => 'cancelled'])
            ->assertSessionHasNoErrors();
        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertSame(6, $product->fresh()->stock);

        $this->patch("/seller/orders/{$order->id}/status", ['status' => 'cancelled'])
            ->assertSessionHasErrors('status');
        $this->assertSame(6, $product->fresh()->stock);

        $this->actingAs($otherSeller)->patch("/seller/orders/{$order->id}/status", ['status' => 'preparing'])
            ->assertNotFound();
    }

    private function product(User $seller, int $stock): Product
    {
        $product = new Product([
            'name' => 'Fresh Pechay',
            'category' => 'Vegetables',
            'description' => 'Fresh harvest',
            'price' => '35.50',
            'unit' => 'bunch',
            'stock' => $stock,
            'threshold' => 2,
            'photo_path' => 'products/test.png',
        ]);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }
}
