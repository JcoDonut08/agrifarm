<?php

namespace Tests\Feature;

use App\Models\CustomerCheckout;
use App\Models\Report;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Services\AdminOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuditRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_chatbot_limits_do_not_block_profile_saves_and_profile_limit_still_applies(): void
    {
        $buyer = User::factory()->create();
        $this->actingAs($buyer);
        for ($i = 0; $i < 30; $i++) {
            $this->getJson('/api/chatbot/latest-order')->assertOk();
        }
        $this->getJson('/api/chatbot/order-status?reference=unknown')->assertTooManyRequests();
        $data = ['name' => 'Saved buyer', 'username' => '', 'mobile_number' => '09171234567', 'delivery_address' => '123 Test Street, Rosario'];
        for ($i = 0; $i < 6; $i++) {
            $this->patch('/customer/profile', $data)->assertSessionHasNoErrors()->assertRedirect();
        }
        $this->patchJson('/customer/profile', $data)->assertTooManyRequests();
        $this->from('/customer')->withHeader('X-Inertia', 'true')->patch('/customer/profile', $data)
            ->assertStatus(303)->assertRedirect('/customer')->assertSessionHasErrors('request');
        $this->assertSame('Saved buyer', $buyer->fresh()->name);
    }

    public function test_product_report_uses_verified_product_metadata_and_appears_to_admin(): void
    {
        [$seller, $product] = $this->product();
        $buyer = User::factory()->create();
        $this->actingAs($buyer)->postJson('/customer/reports', [
            'product_id' => $product->id, 'product_name' => 'Wrong crop',
            'seller_name' => 'Wrong seller', 'barangay' => 'Maybunga',
            'type' => 'Product quality issue', 'description' => 'The delivered leaves were damaged.',
        ])->assertOk()->assertJson(['success' => true]);
        $this->assertDatabaseHas('reports', [
            'product_id' => $product->id, 'product_name' => $product->name,
            'seller_name' => $seller->name, 'barangay' => 'Rosario', 'reporter_name' => $buyer->name,
        ]);
        $this->actingAs(User::factory()->cenroAdmin()->create())->get('/admin/dashboard?section=products')
            ->assertInertia(fn (Assert $page) => $page->has('productManagement.products.0.reports', 1)->etc());
    }

    public function test_dismissal_resolves_only_pending_reports_and_preserves_history_and_product(): void
    {
        [, $product] = $this->product();
        $pending = Report::create(['product_id' => $product->id, 'type' => 'Other', 'description' => 'Pending report', 'status' => 'Pending']);
        $resolved = Report::create(['product_id' => $product->id, 'type' => 'Other', 'description' => 'Old report', 'status' => 'Resolved', 'resolution' => 'Already reviewed']);
        $this->actingAs(User::factory()->create())->post('/admin/products/'.$product->id.'/dismiss')->assertForbidden();
        $this->actingAs(User::factory()->cenroAdmin()->create())->post('/admin/products/'.$product->id.'/dismiss')->assertRedirect();
        $this->assertSame('Resolved', $pending->fresh()->status);
        $this->assertSame('Already reviewed', $resolved->fresh()->resolution);
        $this->assertDatabaseCount('reports', 2);
        $this->assertSame('active', $product->fresh()->status);
    }

    public function test_general_report_cannot_impersonate_a_product_seller_or_barangay(): void
    {
        $this->actingAs(User::factory()->create())->postJson('/customer/reports', [
            'product_id' => null, 'product_name' => 'Claimed product', 'seller_name' => 'Claimed seller',
            'barangay' => 'Rosario', 'type' => 'Other', 'description' => 'A general marketplace concern.',
        ])->assertOk();

        $report = Report::sole();
        $this->assertNull($report->product_id);
        $this->assertNull($report->product_name);
        $this->assertNull($report->seller_name);
        $this->assertNull($report->barangay);
    }

    public function test_mixed_delivered_cancelled_order_is_finished_but_any_active_item_keeps_it_processing(): void
    {
        [$seller] = $this->product();
        $buyer = User::factory()->create();
        $checkout = CustomerCheckout::create([
            'id' => (string) Str::uuid(), 'user_id' => $buyer->id, 'reference_number' => 'AgFrm-AUDITORDER',
            'recipient_name' => 'Buyer', 'phone' => '09171234567', 'address' => 'Rosario',
            'payment_method' => 'cod', 'goods_total' => 70,
        ]);
        foreach (['delivered', 'cancelled'] as $status) {
            $checkout->items()->save((new WalkInOrder)->forceFill([
                'user_id' => $seller->id, 'product_name' => 'Pechay', 'unit' => 'kg',
                'quantity' => 1, 'unit_price' => 35, 'total' => 35, 'status' => $status,
            ]));
        }
        $this->assertSame('completed', app(AdminOrderService::class)->data()['orders']->sole()['status']);
        $checkout->items()->where('status', 'cancelled')->update(['status' => 'preparing']);
        $this->assertSame('processing', app(AdminOrderService::class)->data()['orders']->sole()['status']);
    }

    public function test_notification_preference_persists_for_current_customer_only(): void
    {
        $buyer = User::factory()->create();
        $other = User::factory()->create();
        $this->actingAs($buyer)->get('/customer/settings')->assertInertia(fn (Assert $page) => $page->where('orderUpdateEmails', true)->etc());
        $this->patch('/customer/settings', ['order_update_emails' => false, 'user_id' => $other->id])->assertSessionHasNoErrors();
        $this->assertFalse($buyer->fresh()->order_update_emails);
        $this->assertTrue($other->fresh()->order_update_emails);
        $this->get('/customer/settings')->assertInertia(fn (Assert $page) => $page->where('orderUpdateEmails', false)->etc());
        $this->patchJson('/customer/settings', ['order_update_emails' => 'invalid'])->assertUnprocessable();
        $this->actingAs(User::factory()->seller()->create())->get('/customer/settings')->assertForbidden();
        $this->patch('/customer/settings', ['order_update_emails' => true])->assertForbidden();
    }

    public function test_editing_old_or_undated_sales_does_not_make_a_product_trending(): void
    {
        [$seller, $product] = $this->product();
        foreach ([now()->subDays(90), null] as $delivery) {
            (new WalkInOrder)->forceFill([
                'user_id' => $seller->id, 'product_id' => $product->id, 'customer_name' => 'Buyer',
                'product_name' => $product->name, 'unit' => 'kg', 'quantity' => 1, 'unit_price' => 35,
                'total' => 35, 'status' => 'delivered', 'delivered_at' => $delivery,
            ])->save();
        }
        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('sellerProducts.0.isTrending', false)->etc());
    }

    private function product(): array
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $product = $seller->products()->create([
            'name' => 'Audit Pechay', 'category' => 'Vegetables', 'price' => 35, 'unit' => 'kg',
            'stock' => 10, 'threshold' => 2, 'photo_path' => 'products/audit.png',
        ]);

        return [$seller, $product];
    }
}
