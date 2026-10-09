<?php

namespace Tests\Feature;

use App\Models\CustomerCheckout;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Notifications\OrderStatusUpdated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NotificationSellerTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_notifications_include_the_seller_and_a_public_photo_url(): void
    {
        [$buyer, $seller, $order] = $this->order();
        $data = (new OrderStatusUpdated($order))->toArray($buyer);
        $this->assertSame($seller->id, $data['seller_id']);
        $this->assertSame('Barangay Rosario', $data['seller_name']);
        $this->assertStringStartsWith('/marketplace/sellers/'.$seller->id.'/photo?v=', $data['seller_avatar_url']);
        $this->assertStringNotContainsString('/seller/profile', $data['seller_avatar_url']);
        $this->assertSame('/customer/orders', $data['url']);
    }

    public function test_old_notifications_resolve_current_seller_details_from_the_owned_order(): void
    {
        [$buyer, $seller, $order] = $this->order();
        $this->notice($buyer, $order->id);
        $this->actingAs($buyer)->get('/?page=notifications')->assertInertia(fn (Assert $page) => $page
            ->has('notifications', 1)
            ->where('notifications.0.data.seller_id', $seller->id)
            ->where('notifications.0.data.seller_name', 'Barangay Rosario')
            ->where('notifications.0.data.seller_avatar_url', '/marketplace/sellers/'.$seller->id.'/photo?v='.substr(sha1($seller->avatar_url), 0, 12))
            ->where('notifications.0.data.message', 'Original order message')
            ->etc());
        // Enrichment is display-only; it does not rewrite historical notification data.
        $this->assertArrayNotHasKey('seller_name', $buyer->notifications()->sole()->data);
    }

    public function test_notifications_cannot_resolve_seller_details_from_another_customers_order(): void
    {
        [, $seller, $order] = $this->order();
        $other = User::factory()->create();
        $this->notice($other, $order->id);
        $this->actingAs($other)->get('/?page=notifications')->assertInertia(fn (Assert $page) => $page
            ->has('notifications', 1)
            ->missing('notifications.0.data.seller_id')
            ->missing('notifications.0.data.seller_name')
            ->missing('notifications.0.data.seller_avatar_url')
            ->etc());
    }

    private function notice(User $buyer, int $orderId): void
    {
        $buyer->notifications()->create([
            'id' => (string) Str::uuid(), 'type' => OrderStatusUpdated::class,
            'data' => ['order_id' => $orderId, 'status' => 'preparing', 'product_name' => 'Pechay', 'message' => 'Original order message'],
        ]);
    }

    private function order(): array
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->seller()->create(['name' => 'Barangay Rosario', 'avatar_url' => '/seller/profile/photo?image=avatar.png']);
        $checkout = CustomerCheckout::create([
            'id' => (string) Str::uuid(), 'user_id' => $buyer->id, 'recipient_name' => 'Test Customer',
            'phone' => '09123456789', 'address' => 'Test address', 'barangay' => 'Rosario', 'goods_total' => 35,
        ]);
        $order = new WalkInOrder(['product_name' => 'Pechay', 'unit' => 'kg', 'quantity' => 1, 'unit_price' => 35, 'total' => 35, 'status' => 'preparing']);
        $order->forceFill(['user_id' => $seller->id, 'customer_checkout_id' => $checkout->id])->save();

        return [$buyer, $seller, $order];
    }
}
