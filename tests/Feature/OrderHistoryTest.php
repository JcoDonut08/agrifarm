<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OrderHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    #[DataProvider('openStatuses')]
    public function test_unit_changes_are_rejected_atomically_while_an_order_is_open(string $status): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, $status === 'reservation');
        $this->checkout($product, User::factory()->create());
        $order = WalkInOrder::first();
        $order->update(['status' => $status]);
        $product->refresh();
        $payload = $this->editPayload($product);
        $payload['unit'] = 'kg';
        $payload['stock'] = 20;

        $this->actingAs($seller)->patch('/seller/products/'.$product->id, $payload)
            ->assertSessionHasErrors(['unit' => 'Finish or cancel open orders before changing the selling unit.']);

        $this->assertSame('Original Pechay', $product->fresh()->name);
        $this->assertSame('bunch', $product->fresh()->unit);
        $this->assertSame($product->stock, $product->fresh()->stock);
        $this->assertSame('Original Pechay', $order->fresh()->product_name);
        $this->assertSame('bunch', $order->fresh()->unit);
    }

    public static function openStatuses(): array
    {
        return array_map(fn ($status) => [$status], ['pending', 'reservation', 'preparing', 'out_for_delivery']);
    }

    #[DataProvider('closedStatuses')]
    public function test_unit_changes_after_closed_orders_keep_history_and_new_orders_use_the_new_listing(string $status): void
    {
        $seller = User::factory()->seller()->create();
        $buyer = User::factory()->create();
        $product = $this->product($seller);
        $this->checkout($product, $buyer);
        $oldOrder = WalkInOrder::first();
        $oldOrder->update(['status' => $status]);
        $product->refresh();
        $payload = $this->editPayload($product);
        $payload['unit'] = 'kg';

        $this->actingAs($seller)->patch('/seller/products/'.$product->id, $payload)->assertSessionHasNoErrors();
        $this->assertSame('kg', $product->fresh()->unit);
        $this->assertOriginalDetails($oldOrder->fresh());

        $this->checkout($product->fresh(), $buyer);
        $this->assertDatabaseHas('walk_in_orders', [
            'id' => WalkInOrder::latest('id')->first()->id,
            'product_name' => 'Renamed Pechay', 'unit' => 'kg',
            'quantity' => 2, 'unit_price' => '120.00', 'total' => '240.00',
        ]);
        $this->assertOriginalDetails($oldOrder->fresh());
    }

    public static function closedStatuses(): array
    {
        return [['delivered'], ['cancelled']];
    }

    public function test_customer_confirmation_order_history_and_seller_props_preserve_order_snapshots_after_listing_edits(): void
    {
        $seller = User::factory()->seller()->create();
        $buyer = User::factory()->create();
        $product = $this->product($seller);
        $checkoutId = $this->checkout($product, $buyer);
        $order = WalkInOrder::first();

        $this->actingAs($seller)->patch('/seller/products/'.$product->id, $this->editPayload($product->fresh()))
            ->assertSessionHasNoErrors();
        $this->assertOriginalDetails($order->fresh());
        $this->get('/seller/dashboard?section=orders')->assertInertia(fn (Assert $page) => $page
            ->where('products.0.name', 'Renamed Pechay')
            ->where('orders.0.product_name', 'Original Pechay')
            ->where('orders.0.unit', 'bunch')
            ->where('orders.0.unit_price', '35.50')
            ->where('orders.0.total', '71.00'));

        $this->actingAs($buyer)->get('/?page=order-success&order='.$checkoutId)->assertInertia(fn (Assert $page) => $page
            ->where('checkoutOrder.items.0.name', 'Original Pechay')
            ->where('checkoutOrder.items.0.unit', 'bunch')
            ->where('checkoutOrder.items.0.quantity', 2)
            ->where('checkoutOrder.items.0.price', 35.5)
            ->where('checkoutOrder.goodsTotal', 71));
        $this->get(route('customer.orders'))->assertInertia(fn (Assert $page) => $page
            ->where('checkouts.0.items.0.name', 'Original Pechay')
            ->where('checkouts.0.items.0.unit', 'bunch')
            ->where('checkouts.0.items.0.price', 35.5)
            ->where('checkouts.0.items.0.quantity', 2)
            ->where('checkouts.0.items.0.total', 71));
    }

    #[DataProvider('inventorySources')]
    public function test_listing_edits_do_not_change_cancellation_quantities_or_original_order_details(bool $preorder): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, $preorder);
        $this->checkout($product, User::factory()->create());
        $order = WalkInOrder::first();
        $this->actingAs($seller)->patch('/seller/products/'.$product->id, $this->editPayload($product->fresh()))
            ->assertSessionHasNoErrors();
        $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'preparing'])->assertSessionHasNoErrors();
        $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock'])->assertSessionHasNoErrors();

        $this->assertSame($preorder ? 0 : 10, $product->fresh()->stock);
        $this->assertSame($preorder ? 10 : 0, $product->fresh()->expected_yield);
        $this->assertOriginalDetails($order->fresh());
    }

    public static function inventorySources(): array
    {
        return ['available stock' => [false], 'preorder' => [true]];
    }

    private function assertOriginalDetails(WalkInOrder $order): void
    {
        $this->assertSame('Original Pechay', $order->product_name);
        $this->assertSame('bunch', $order->unit);
        $this->assertSame(2, $order->quantity);
        $this->assertSame('35.50', $order->unit_price);
        $this->assertSame('71.00', $order->total);
    }

    private function checkout(Product $product, User $buyer): string
    {
        $id = (string) Str::uuid();
        $this->actingAs($buyer)->post('/checkout', [
            'checkout_id' => $id, 'recipient_name' => 'Test Customer',
            'phone' => '09171234567', 'address' => '123 Example Street, Rosario', 'payment_method' => 'cod',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ])->assertSessionHasNoErrors();

        return $id;
    }

    private function editPayload(Product $product): array
    {
        return [
            'name' => 'Renamed Pechay', 'category' => 'Vegetables', 'price' => '120.00',
            'unit' => $product->unit, 'stock' => $product->stock, 'original_stock' => $product->stock,
            'threshold' => 2,
        ];
    }

    private function product(User $seller, bool $preorder = false): Product
    {
        $product = new Product([
            'name' => 'Original Pechay', 'category' => 'Vegetables', 'price' => '35.50',
            'unit' => 'bunch', 'stock' => $preorder ? 0 : 10, 'expected_yield' => $preorder ? 10 : 0,
            'threshold' => 2, 'photo_path' => 'products/test.png',
        ]);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }
}
