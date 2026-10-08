<?php

namespace Tests\Feature;

use App\Models\CustomerCheckout;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OrderInventoryTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('preorderCancellations')]
    public function test_cancelling_preorders_restores_expected_yield_once_even_after_stock_changes(bool $checkout, bool $accepted): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 0, 3);
        if ($checkout) {
            $this->actingAs(User::factory()->create())->post('/checkout', $this->checkoutPayload($product))->assertSessionHasNoErrors();
        } else {
            $this->actingAs($seller)->post('/seller/orders/walk-in', ['product_id' => $product->id, 'quantity' => 3, 'inventory_source' => 'stock'])->assertSessionHasNoErrors();
        }
        $order = WalkInOrder::query()->sole();
        $this->assertSame('reservation', $order->status);
        $this->assertSame('expected_yield', $order->inventory_source);
        $this->assertSame(0, $product->fresh()->expected_yield);
        $this->actingAs($seller);
        if ($accepted) {
            $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'preparing'])->assertSessionHasNoErrors();
        }

        // Current inventory cannot tell us which quantity the original order reserved.
        $product->update(['stock' => 4, 'expected_yield' => 7]);
        $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock'])->assertSessionHasNoErrors();
        $this->assertSame(4, $product->fresh()->stock);
        $this->assertSame(10, $product->fresh()->expected_yield);
        $this->assertSame('cancelled', $order->fresh()->status);
        $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock'])->assertSessionHasErrors('status');
        $this->assertSame(4, $product->fresh()->stock);
        $this->assertSame(10, $product->fresh()->expected_yield);
    }

    public static function preorderCancellations(): array
    {
        return [
            'walk-in reservation' => [false, false],
            'accepted walk-in preorder' => [false, true],
            'customer reservation' => [true, false],
            'accepted customer preorder' => [true, true],
        ];
    }

    public function test_cancelling_an_accepted_stock_order_restores_stock_even_when_only_future_harvest_is_available(): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 3, 7);
        $this->actingAs($seller)->post('/seller/orders/walk-in', ['product_id' => $product->id, 'quantity' => 3])->assertSessionHasNoErrors();
        $order = WalkInOrder::query()->sole();
        $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'preparing'])->assertSessionHasNoErrors();
        $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock'])->assertSessionHasNoErrors();
        $this->assertSame(3, $product->fresh()->stock);
        $this->assertSame(7, $product->fresh()->expected_yield);
    }

    #[DataProvider('hiddenProducts')]
    public function test_hidden_products_reject_the_entire_checkout_without_reserving_inventory(bool $preorder): void
    {
        $seller = User::factory()->seller()->create();
        $available = $this->product($seller, 5, 0);
        $hidden = $this->product($seller, $preorder ? 0 : 5, $preorder ? 5 : 0);
        $payload = $this->checkoutPayload($available);
        $payload['items'][] = ['product_id' => $hidden->id, 'quantity' => 2];
        $this->actingAs(User::factory()->cenroAdmin()->create())->post(route('admin.products.delist', $hidden))->assertRedirect();

        $this->actingAs(User::factory()->create())->post('/checkout', $payload)->assertSessionHasErrors('items');
        $this->assertDatabaseCount('customer_checkouts', 0);
        $this->assertDatabaseCount('walk_in_orders', 0);
        $this->assertSame(5, $available->fresh()->stock);
        $this->assertSame($preorder ? 0 : 5, $hidden->fresh()->stock);
        $this->assertSame($preorder ? 5 : 0, $hidden->fresh()->expected_yield);
    }

    public static function hiddenProducts(): array
    {
        return ['hidden stock product' => [false], 'hidden preorder product' => [true]];
    }

    public function test_retrying_a_successful_checkout_after_delisting_does_not_reserve_inventory_again(): void
    {
        $seller = User::factory()->seller()->create();
        $buyer = User::factory()->create();
        $product = $this->product($seller, 5, 0);
        $payload = $this->checkoutPayload($product);
        $this->actingAs($buyer)->post('/checkout', $payload)->assertSessionHasNoErrors();
        $product->forceFill(['status' => 'delisted'])->save();
        $this->post('/checkout', $payload)->assertSessionHasNoErrors()->assertRedirect('/?page=order-success&order='.$payload['checkout_id']);
        $this->assertDatabaseCount('customer_checkouts', 1);
        $this->assertDatabaseCount('walk_in_orders', 1);
        $this->assertSame(2, $product->fresh()->stock);
        $this->assertSame($buyer->id, CustomerCheckout::query()->sole()->user_id);
    }

    #[DataProvider('legacyOrders')]
    public function test_migration_backfills_known_legacy_sources_and_does_not_guess_accepted_orders(string $status, ?string $source): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 4, 7);
        $order = new WalkInOrder([
            'product_name' => $product->name, 'unit' => $product->unit, 'quantity' => 3,
            'unit_price' => '35.50', 'total' => '106.50', 'status' => $status,
        ]);
        $order->user_id = $seller->id;
        $order->product_id = $product->id;
        $order->save();
        Schema::table('walk_in_orders', function (Blueprint $table) {
            $table->dropColumn('inventory_source');
        });
        $migration = require database_path('migrations/2026_10_07_000001_add_inventory_source_to_walk_in_orders.php');
        $migration->up();
        $this->assertSame($source, $order->fresh()->inventory_source);

        $this->actingAs($seller);
        if ($source !== null) {
            $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'preparing'])->assertSessionHasNoErrors();
            $this->assertSame($source, $order->fresh()->inventory_source);
            $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock'])->assertSessionHasNoErrors();
        } else {
            $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock'])->assertSessionHasErrors('cancellation_inventory_source');
            $this->assertSame('preparing', $order->fresh()->status);
        }
        $this->assertSame($source === 'stock' ? 7 : 4, $product->fresh()->stock);
        $this->assertSame($source === 'expected_yield' ? 10 : 7, $product->fresh()->expected_yield);
    }

    public static function legacyOrders(): array
    {
        return [
            'pending stock order' => ['pending', 'stock'],
            'unaccepted preorder' => ['reservation', 'expected_yield'],
            'accepted order with unknown source' => ['preparing', null],
        ];
    }

    #[DataProvider('confirmedLegacySources')]
    public function test_seller_can_cancel_an_older_accepted_order_after_confirming_its_original_source(string $source): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 4, 7);
        $this->actingAs($seller)->post('/seller/orders/walk-in', ['product_id' => $product->id, 'quantity' => 3])->assertSessionHasNoErrors();
        $order = WalkInOrder::query()->sole();
        $order->forceFill(['status' => 'preparing', 'inventory_source' => null])->save();
        $product->refresh()->update(['stock' => 4, 'expected_yield' => 7]);

        $fields = ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock'];
        $this->patch('/seller/orders/'.$order->id.'/status', [...$fields, 'cancellation_inventory_source' => 'invented'])
            ->assertSessionHasErrors('cancellation_inventory_source');
        $this->assertSame('preparing', $order->fresh()->status);
        $this->assertSame(4, $product->fresh()->stock);
        $this->assertSame(7, $product->fresh()->expected_yield);

        $this->patch('/seller/orders/'.$order->id.'/status', [...$fields, 'cancellation_inventory_source' => $source])->assertSessionHasNoErrors();
        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertSame($source, $order->fresh()->inventory_source);
        $this->assertSame('out_of_stock', $order->fresh()->cancellation_reason);
        $this->assertSame($source === 'stock' ? 7 : 4, $product->fresh()->stock);
        $this->assertSame($source === 'expected_yield' ? 10 : 7, $product->fresh()->expected_yield);
        $this->patch('/seller/orders/'.$order->id.'/status', [...$fields, 'cancellation_inventory_source' => $source])->assertSessionHasErrors('status');
        $this->assertSame($source === 'stock' ? 7 : 4, $product->fresh()->stock);
        $this->assertSame($source === 'expected_yield' ? 10 : 7, $product->fresh()->expected_yield);
    }

    public static function confirmedLegacySources(): array
    {
        return ['stock' => ['stock'], 'future harvest' => ['expected_yield']];
    }

    public function test_confirmation_cannot_override_the_recorded_reservation_source(): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 0, 5);
        $this->actingAs($seller)->post('/seller/orders/walk-in', ['product_id' => $product->id, 'quantity' => 3])->assertSessionHasNoErrors();
        $order = WalkInOrder::query()->sole();
        $this->patch('/seller/orders/'.$order->id.'/status', [
            'status' => 'cancelled', 'cancellation_reason' => 'out_of_stock', 'cancellation_inventory_source' => 'stock',
        ])->assertSessionHasNoErrors();
        $this->assertSame('expected_yield', $order->fresh()->inventory_source);
        $this->assertSame(0, $product->fresh()->stock);
        $this->assertSame(5, $product->fresh()->expected_yield);
    }

    private function checkoutPayload(Product $product): array
    {
        return [
            'checkout_id' => (string) Str::uuid(),
            'recipient_name' => 'Test Customer',
            'phone' => '09171234567',
            'address' => '123 Example Street, Rosario',
            'payment_method' => 'cod',
            'items' => [['product_id' => $product->id, 'quantity' => 3]],
        ];
    }

    private function product(User $seller, int $stock, int $expectedYield): Product
    {
        $product = new Product([
            'name' => 'Garden Pechay', 'category' => 'Vegetables', 'description' => 'Fresh harvest',
            'price' => '35.50', 'unit' => 'bunch', 'stock' => $stock, 'expected_yield' => $expectedYield,
            'threshold' => 2, 'photo_path' => 'products/test.png',
        ]);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }
}
