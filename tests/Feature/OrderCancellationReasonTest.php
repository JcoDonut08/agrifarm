<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Notifications\OrderStatusUpdated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OrderCancellationReasonTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    #[DataProvider('invalidReasons')]
    public function test_invalid_reasons_do_not_cancel_or_restore_inventory(array $fields, string $error): void
    {
        [$seller, $buyer, $product, $order] = $this->checkout();
        $this->actingAs($seller)->patch('/seller/orders/'.$order->id.'/status', ['status' => 'cancelled', ...$fields])
            ->assertSessionHasErrors($error);
        $this->assertSame('pending', $order->fresh()->status);
        $this->assertSame(3, $product->fresh()->stock);
        $this->assertNull($order->fresh()->cancellation_reason);
        $this->assertSame(0, $buyer->notifications()->count());
    }

    public static function invalidReasons(): array
    {
        return [
            'missing reason' => [[], 'cancellation_reason'],
            'unknown reason' => [['cancellation_reason' => 'invented'], 'cancellation_reason'],
            'other without explanation' => [['cancellation_reason' => 'other'], 'cancellation_note'],
            'whitespace explanation' => [['cancellation_reason' => 'other', 'cancellation_note' => '   '], 'cancellation_note'],
            'short explanation' => [['cancellation_reason' => 'other', 'cancellation_note' => 'no'], 'cancellation_note'],
            'long explanation' => [['cancellation_reason' => 'other', 'cancellation_note' => str_repeat('a', 501)], 'cancellation_note'],
        ];
    }

    public function test_cancellation_reason_is_saved_notified_and_visible_only_to_the_customer_and_seller(): void
    {
        [$seller, $buyer, $product, $order] = $this->checkout(true);
        $this->actingAs($seller)->patch('/seller/orders/'.$order->id.'/status', [
            'status' => 'cancelled', 'cancellation_reason' => 'other',
            'cancellation_note' => '  The harvest was damaged by flooding.  ',
        ])->assertSessionHasNoErrors();
        $order->refresh();
        $this->assertSame('cancelled', $order->status);
        $this->assertSame('other', $order->cancellation_reason);
        $this->assertSame('The harvest was damaged by flooding.', $order->cancellation_note);
        $this->assertSame(0, $product->fresh()->stock);
        $this->assertSame(5, $product->fresh()->expected_yield);

        $this->get('/seller/dashboard?section=orders')->assertInertia(fn (Assert $page) => $page
            ->where('orders.0.cancellation_reason', 'other')->where('orders.0.cancellation_note', $order->cancellation_note));
        $this->actingAs($buyer)->get('/customer/orders')->assertInertia(fn (Assert $page) => $page
            ->where('checkouts.0.items.0.cancellation_reason', 'other')->where('checkouts.0.items.0.cancellation_note', $order->cancellation_note));
        $notice = $buyer->notifications()->sole();
        $this->assertSame('cancelled', $notice->data['status']);
        $this->assertSame($order->cancellation_note, $notice->data['cancellation_note']);
        $this->assertSame('/customer/orders', $notice->data['url']);
        $mail = (new OrderStatusUpdated($order))->toMail($buyer);
        $this->assertContains($order->cancellation_note, $mail->introLines);
        $this->get('/?page=notifications')->assertInertia(fn (Assert $page) => $page
            ->where('notifications.0.data.cancellation_note', $order->cancellation_note));
        $this->actingAs(User::factory()->create())->get('/customer/orders')->assertInertia(fn (Assert $page) => $page->has('checkouts', 0));
        $this->actingAs($seller)->patch('/seller/orders/'.$order->id.'/status', ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock'])
            ->assertSessionHasErrors('status');
        $this->assertSame('other', $order->fresh()->cancellation_reason);
        $this->assertSame(1, $buyer->notifications()->count());
        $this->assertSame(5, $product->fresh()->expected_yield);
    }

    public function test_another_seller_cannot_cancel_and_non_cancellation_updates_cannot_set_a_reason(): void
    {
        [$seller, $buyer, $product, $order] = $this->checkout();
        $this->actingAs(User::factory()->seller()->create())->patch('/seller/orders/'.$order->id.'/status', [
            'status' => 'cancelled', 'cancellation_reason' => 'out_of_stock',
        ])->assertNotFound();
        $this->actingAs($seller)->patch('/seller/orders/'.$order->id.'/status', [
            'status' => 'preparing', 'cancellation_reason' => 'out_of_stock', 'cancellation_note' => 'Injected reason',
        ])->assertSessionHasNoErrors();
        $this->assertSame('preparing', $order->fresh()->status);
        $this->assertNull($order->fresh()->cancellation_reason);
        $this->assertNull($order->fresh()->cancellation_note);
        $this->assertSame(3, $product->fresh()->stock);
    }

    private function checkout(bool $preorder = false): array
    {
        $seller = User::factory()->seller()->create();
        $buyer = User::factory()->create();
        $product = new Product(['name' => 'Cancellation Pechay', 'category' => 'Vegetables', 'price' => '35.50',
            'unit' => 'bunch', 'stock' => $preorder ? 0 : 5, 'expected_yield' => $preorder ? 5 : 0,
            'harvest_date' => $preorder ? now()->addMonth()->toDateString() : null, 'threshold' => 2]);
        $product->user_id = $seller->id;
        $product->photo_path = 'products/test-pechay.png';
        $product->save();
        $this->actingAs($buyer)->post('/checkout', [
            'checkout_id' => (string) Str::uuid(), 'recipient_name' => 'Test Customer', 'phone' => '09171234567',
            'address' => 'Rosario, Pasig', 'payment_method' => 'cod', 'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ])->assertSessionHasNoErrors();

        return [$seller, $buyer, $product, WalkInOrder::query()->sole()];
    }
}
