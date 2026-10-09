<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Services\AdminDashboardService;
use App\Services\AdminReportService;
use App\Services\BarangayMonitoringService;
use App\Services\ForecastSellingActivityService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OrderDeliveryDateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->travelTo(CarbonImmutable::parse('2026-09-20 12:00:00', 'Asia/Manila')->utc());
    }

    #[DataProvider('orderSources')]
    public function test_delivery_records_server_time_once_for_customer_and_walk_in_orders(bool $checkout): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $product = $this->product($seller);
        if ($checkout) {
            $this->actingAs(User::factory()->create())->post('/checkout', [
                'checkout_id' => (string) Str::uuid(), 'recipient_name' => 'Test buyer',
                'phone' => '09171234567', 'address' => 'Test address, Rosario', 'payment_method' => 'cod',
                'items' => [['product_id' => $product->id, 'quantity' => 2]],
            ])->assertSessionHasNoErrors();
            $this->post('/logout');
        } else {
            $this->actingAs($seller)->post('/seller/orders/walk-in', [
                'product_id' => $product->id, 'quantity' => 2, 'delivered_at' => '2000-01-01',
            ])->assertSessionHasNoErrors();
        }
        $order = WalkInOrder::query()->sole();
        $placed = $order->created_at->toIso8601String();
        $this->assertNull($order->delivered_at);
        $this->actingAs($seller);
        foreach (['preparing', 'out_for_delivery'] as $status) {
            $this->patch('/seller/orders/'.$order->id.'/status', ['status' => $status])->assertSessionHasNoErrors();
            $this->assertNull($order->fresh()->delivered_at);
        }

        $delivery = CarbonImmutable::parse('2026-10-01 00:30:00', 'Asia/Manila')->utc();
        $this->travelTo($delivery);
        $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'delivered', 'delivered_at' => '2000-01-01'])
            ->assertSessionHasNoErrors();
        $this->assertTrue($order->fresh()->delivered_at->equalTo($delivery));
        $this->assertSame($placed, $order->fresh()->created_at->toIso8601String());
        $this->get('/seller/dashboard?section=orders')->assertInertia(fn (Assert $page) => $page
            ->where('orders.0.delivered_at', $delivery->toJSON()));

        $this->travelTo($delivery->addDay());
        $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'delivered'])->assertSessionHasErrors('status');
        $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock'])
            ->assertSessionHasErrors('status');
        $this->assertTrue($order->fresh()->delivered_at->equalTo($delivery));
        $this->assertSame(8, $product->fresh()->stock);
    }

    public static function orderSources(): array
    {
        return ['customer checkout' => [true], 'walk-in' => [false]];
    }

    public function test_cancellation_and_rejected_delivery_do_not_record_a_delivery_date(): void
    {
        $seller = User::factory()->seller()->create();
        $order = $this->order($seller, 'pending');
        $this->actingAs($seller)->patch('/seller/orders/'.$order->id.'/status', ['status' => 'delivered'])
            ->assertSessionHasErrors('status');
        $this->assertNull($order->fresh()->delivered_at);
        $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock'])
            ->assertSessionHasNoErrors();
        $this->assertNull($order->fresh()->delivered_at);
    }

    public function test_other_sellers_cannot_record_delivery_for_an_order(): void
    {
        $order = $this->order(User::factory()->seller()->create(), 'out_for_delivery');
        $this->actingAs(User::factory()->seller()->create())->patch('/seller/orders/'.$order->id.'/status', ['status' => 'delivered'])
            ->assertNotFound();
        $this->assertNull($order->fresh()->delivered_at);
        $this->assertSame('out_for_delivery', $order->fresh()->status);
    }

    public function test_delivery_timestamp_rolls_back_with_the_status(): void
    {
        $seller = User::factory()->seller()->create();
        $order = $this->order($seller, 'out_for_delivery');
        $this->actingAs($seller);
        DB::beginTransaction();
        try {
            $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'delivered'])->assertSessionHasNoErrors();
            $this->assertNotNull($order->fresh()->delivered_at);
        } finally {
            DB::rollBack();
        }
        $this->assertSame('out_for_delivery', $order->fresh()->status);
        $this->assertNull($order->fresh()->delivered_at);
    }

    public function test_admin_charts_use_philippine_delivery_month_and_keep_undated_orders_in_all_time_totals(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-07 12:00:00', 'Asia/Manila')->utc());
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $october = $this->order($seller, 'delivered', '2026-10-01 00:30:00', 100);
        $this->order($seller, 'delivered', '2026-09-30 23:59:59', 50);
        $legacy = $this->order($seller, 'delivered', total: 25);
        $this->order($seller, 'cancelled', '2026-10-02 10:00:00', 999);
        $this->order($seller, 'pending', total: 999);
        $dashboard = app(AdminDashboardService::class)->data(User::factory()->cenroAdmin()->create());
        $this->assertEquals(175, $dashboard['summary']['totalSales']);
        $this->assertSame(3, $dashboard['summary']['completedOrders']);
        $this->assertEquals(50, $dashboard['monthlySales']['series'][0]['sales'][10]);
        $this->assertEquals(100, $dashboard['monthlySales']['series'][0]['sales'][11]);
        $this->assertSame(1, $dashboard['monthlySales']['undatedOrders']);
        $barangay = app(BarangayMonitoringService::class)->data()['specificBarangayData']['Rosario'];
        $this->assertEquals(175, $barangay['overview']['totalSales']);
        $this->assertEquals(50, $barangay['salesTrend']['data'][8]);
        $this->assertEquals(100, $barangay['salesTrend']['data'][9]);
        $this->assertSame(1, $barangay['salesTrend']['undatedOrders']);
        $reports = collect(app(AdminReportService::class)->data()['walkInOrders']);
        $this->assertSame($october->delivered_at->toJSON(), $reports->firstWhere('id', $october->id)['delivered_at']);
        $this->assertNull($reports->firstWhere('id', $legacy->id)['delivered_at']);
    }

    public function test_recent_selling_activity_uses_delivery_time_and_excludes_undated_and_future_deliveries(): void
    {
        $asOf = CarbonImmutable::parse('2026-10-07 12:00:00', 'Asia/Manila');
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        foreach (['2026-10-01 00:30:00', '2026-10-02 10:00:00', '2026-10-03 10:00:00'] as $date) {
            $this->order($seller, 'delivered', $date);
        }
        $this->order($seller, 'delivered');
        $this->order($seller, 'delivered', '2026-10-08 12:00:00');
        $this->order($seller, 'delivered', '2026-03-01 12:00:00');
        $service = app(ForecastSellingActivityService::class);
        $signal = $service->forCrop($service->context($seller, [], $asOf), 'Pechay', '2027-01');
        $this->assertSame(3, $signal['order_count']);
        $this->assertEquals(['kg' => 3], $signal['sold']);
        $this->assertNotNull($signal['score']);
    }

    public function test_seasonal_selling_activity_uses_delivery_month_instead_of_placement_month(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        foreach (['2025-04-01 00:30:00', '2025-04-02 10:00:00', '2026-04-01 00:30:00'] as $date) {
            $this->order($seller, 'delivered', $date);
        }
        $service = app(ForecastSellingActivityService::class);
        $context = $service->context($seller, [], CarbonImmutable::parse('2026-10-07', 'Asia/Manila'));
        $signal = $service->forCrop($context, 'Pechay', '2027-04');
        $this->assertSame('harvest_month', $signal['basis']);
        $this->assertSame(['2025-04', '2026-04'], $signal['periods']);
        $this->assertSame(3, $signal['order_count']);
    }

    public function test_migration_does_not_guess_delivery_dates_for_existing_orders(): void
    {
        $migration = require database_path('migrations/2026_10_09_000001_add_delivered_at_to_walk_in_orders.php');
        $migration->down();
        $order = $this->order(User::factory()->seller()->create(), 'delivered');
        $updated = $order->updated_at->toIso8601String();
        $migration->up();
        $this->assertNull($order->fresh()->delivered_at);
        $this->assertSame($updated, $order->fresh()->updated_at->toIso8601String());
        $this->assertSame('delivered', $order->fresh()->status);
    }

    private function order(User $seller, string $status, ?string $delivered = null, int $total = 35): WalkInOrder
    {
        $order = new WalkInOrder(['product_name' => 'Pechay', 'unit' => 'kg', 'quantity' => 1,
            'unit_price' => $total, 'total' => $total, 'status' => $status]);
        $order->user_id = $seller->id;
        $order->created_at = CarbonImmutable::parse('2024-01-01', 'Asia/Manila')->utc();
        if ($delivered !== null) {
            $order->delivered_at = CarbonImmutable::parse($delivered, 'Asia/Manila')->utc();
        }
        $order->save();

        return $order;
    }

    private function product(User $seller): Product
    {
        $product = new Product(['name' => 'Pechay', 'category' => 'Vegetables', 'price' => 35,
            'unit' => 'kg', 'stock' => 10, 'threshold' => 2, 'photo_path' => 'products/test.jpg']);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }
}
