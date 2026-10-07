<?php

namespace Tests\Feature;

use App\Models\CustomerCheckout;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Services\ForecastRecommendationService;
use App\Services\ForecastSellingActivityService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ForecastSellingActivityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-07 12:00:00', 'Asia/Manila'));
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function order(User $seller, string $crop, string $date, string $status = 'delivered', string $unit = 'bunch', int $quantity = 1): WalkInOrder
    {
        $order = new WalkInOrder(['product_name' => $crop, 'quantity' => $quantity, 'unit' => $unit,
            'unit_price' => '30.00', 'total' => number_format(30 * $quantity, 2, '.', ''), 'status' => $status]);
        $order->user_id = $seller->id;
        $order->created_at = CarbonImmutable::parse($date, 'Asia/Manila')->utc();
        $order->updated_at = $order->created_at;
        $order->save();

        return $order;
    }

    private function payload(): array
    {
        return ['schema_version' => 2, 'forecast_months' => ['2026-11'], 'data_end_month' => '2026-10',
            'crops' => array_fill_keys(['Malunggay', 'Kangkong', 'Gabi', 'Okra'], [
                'status' => 'fallback', 'unit' => 'season_strength', 'forecast' => [],
                'annual_profile_index' => array_fill(0, 12, 0.8),
            ])];
    }

    private function signal(User $seller, string $month = '2027-04', array $dataset = []): array
    {
        $service = app(ForecastSellingActivityService::class);

        return $service->forCrop($service->context($seller, $dataset, CarbonImmutable::now('Asia/Manila')), 'Kangkong', $month);
    }

    public function test_sparse_or_absent_sales_leave_the_existing_rank_unchanged(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        foreach (['2026-09-10', '2026-09-11'] as $date) {
            $this->order($seller, 'Kangkong', $date, quantity: 1000);
        }
        $service = app(ForecastRecommendationService::class);
        $original = $service->recommend($this->payload());
        $withSales = $service->recommend($this->payload(), seller: $seller);
        $this->assertSame(array_column($original['recommendations'], 'score', 'crop'), array_column($withSales['recommendations'], 'score', 'crop'));
        $pick = collect($withSales['recommendations'])->firstWhere('crop', 'Kangkong');
        $this->assertSame('limited', $pick['selling_activity']['level']);
        $this->assertNull($pick['selling_activity']['score']);
        $this->assertEquals(0, $pick['selling_adjustment']);
    }

    public function test_frequent_completed_barangay_sales_change_ranking_and_plan_validation_consistently(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $neighbor = User::factory()->seller()->create(['barangay' => 'Rosario']);
        foreach (range(1, 20) as $day) {
            $this->order($neighbor, ' KANGKONG ', sprintf('2026-09-%02d', $day));
        }
        $seller->forecastRuns()->create(['source_filename' => 'harvest.csv', 'result' => $this->payload()]);
        $result = app(ForecastRecommendationService::class)->recommend($this->payload(), seller: $seller);
        $this->assertSame('Kangkong', $result['recommendations'][0]['crop']);
        $this->assertSame('regular', $result['recommendations'][0]['selling_activity']['level']);
        $this->assertEquals(1, $result['recommendations'][0]['selling_adjustment']);
        $this->actingAs($seller)->get('/seller/dashboard?section=forecasting')->assertInertia(fn (Assert $page) => $page
            ->where('forecastData.recommendations.0.crop', 'Kangkong')
            ->where('forecastData.recommendations.0.selling_activity.order_count', 20)
            ->where('forecastData.recommendations.0.selling_activity.barangay', 'Rosario')
            ->missing('forecastData.recommendations.0.selling_activity.customer_name')
            ->missing('forecastData.recommendations.0.selling_activity.user_id'));
        $this->post('/seller/planting-plans', ['crop' => 'Kangkong', 'planting_month' => '2026-10'])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('planting_plans', ['user_id' => $seller->id, 'crop' => 'Kangkong']);
    }

    public function test_uploaded_barangay_sets_market_scope_and_other_roles_and_barangays_are_excluded(): void
    {
        $viewer = User::factory()->seller()->create(['barangay' => 'Maybunga']);
        $rosario = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $admin = User::factory()->cenroAdmin()->create(['barangay' => 'Rosario']);
        foreach (range(1, 4) as $day) {
            $date = sprintf('2026-09-%02d', $day);
            $this->order($rosario, 'Kangkong', $date);
            $this->order($viewer, 'Kangkong', $date, quantity: 100);
            $this->order($admin, 'Kangkong', $date, quantity: 100);
        }
        $signal = $this->signal($viewer, dataset: ['scope' => 'barangay', 'barangay' => 'Rosario']);
        $this->assertSame('Rosario', $signal['barangay']);
        $this->assertSame(4, $signal['order_count']);
        $this->assertEquals(['bunch' => 4], $signal['sold']);
        $this->assertSame('limited', $this->signal($viewer, dataset: ['scope' => 'barangay', 'barangay' => 'Unknown'])['level']);
    }

    public function test_harvest_month_history_requires_two_past_years_otherwise_recent_sales_are_used(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        foreach (['2025-04-01', '2025-04-02', '2026-04-01', '2026-04-02'] as $date) {
            $this->order($seller, 'Kangkong', $date);
        }
        foreach (range(1, 20) as $day) {
            $this->order($seller, 'Kangkong', sprintf('2026-09-%02d', $day));
        }
        $signal = $this->signal($seller);
        $this->assertSame('harvest_month', $signal['basis']);
        $this->assertSame(['2025-04', '2026-04'], $signal['periods']);
        $this->assertSame(4, $signal['order_count']);
        $this->assertSame(20, $this->signal($seller, '2027-05')['order_count']);
        $this->assertSame('recent', $this->signal($seller, '2027-05')['basis']);
    }

    public function test_pending_cancelled_future_and_old_records_do_not_count_and_receipts_are_deduplicated(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        foreach (['pending', 'reservation', 'preparing', 'out_for_delivery', 'cancelled'] as $status) {
            $this->order($seller, 'Kangkong', '2026-09-01', $status);
        }
        $this->order($seller, 'Kangkong', '2026-10-08');
        $this->order($seller, 'Kangkong', '2024-09-01');
        $checkout = CustomerCheckout::create(['id' => (string) Str::uuid(), 'user_id' => User::factory()->create()->id,
            'recipient_name' => 'Private customer', 'contact_email' => 'private@example.test', 'phone' => '09123456789',
            'address' => 'Private address', 'barangay' => 'Rosario', 'payment_method' => 'cod', 'goods_total' => '60.00']);
        foreach (range(1, 2) as $index) {
            $order = $this->order($seller, 'Kangkong', '2026-09-05');
            $order->customer_checkout_id = $checkout->id;
            $order->save();
        }
        $signal = $this->signal($seller);
        $this->assertSame(1, $signal['order_count']);
        $this->assertEquals(['bunch' => 2], $signal['sold']);
        $this->assertSame('limited', $signal['level']);
    }

    public function test_stock_comparison_preserves_units_and_only_reduces_recent_activity(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        foreach (range(1, 15) as $day) {
            $this->order($seller, 'Kangkong', sprintf('2026-09-%02d', $day), unit: 'bunches', quantity: 2);
        }
        $stock = new Product(['name' => 'Kangkong', 'category' => 'Vegetables', 'price' => 30, 'unit' => 'kg', 'stock' => 100,
            'threshold' => 2, 'photo_path' => 'test.png']);
        $stock->user_id = $seller->id;
        $stock->save();
        $signal = $this->signal($seller);
        $this->assertFalse($signal['stock_pressure']);
        $this->assertEquals(10, $signal['score']);
        $this->assertEquals(['bunch' => 30], $signal['sold']);
        $this->assertEquals(['kg' => 100], $signal['stock']);
        $stock->update(['unit' => 'bunch', 'stock' => 31]);
        $signal = $this->signal($seller);
        $this->assertTrue($signal['stock_pressure']);
        $this->assertEquals(8, $signal['score']);
    }

    public function test_selling_bonus_is_bounded_and_cannot_promote_off_season_strength(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        foreach (range(1, 20) as $day) {
            $this->order($seller, 'Kangkong', sprintf('2026-09-%02d', $day));
        }
        $result = $this->payload();
        $result['crops'] = ['Kangkong' => [...$result['crops']['Kangkong'], 'annual_profile_index' => array_fill(0, 12, 0.2)]];
        $pick = app(ForecastRecommendationService::class)->recommend($result, seller: $seller)['recommendations'][0];
        $this->assertEquals(0, $pick['selling_adjustment']);
        $this->assertEquals($pick['base_score'], $pick['score']);
    }
}
