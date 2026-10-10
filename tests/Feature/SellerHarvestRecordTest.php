<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\HarvestRecord;
use App\Models\Product;
use App\Models\User;
use App\Services\WeatherService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SellerHarvestRecordTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('harvestRequestHeaders')]
    public function test_harvest_changes_support_inertia_redirects_and_json_clients(array $headers, bool $inertia): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 'Pechay', 'kg', 12);
        $payload = ['product_id' => $product->id, 'quantity' => 5, 'unit' => 'kg', 'harvest_date' => now()->toDateString()];
        $this->actingAs($seller)->withHeaders($headers)->from('/seller/dashboard?section=harvest-records');
        $response = $this->post(route('seller.harvest-records.store'), $payload)->assertSessionHasNoErrors();
        if ($inertia) {
            $response->assertRedirect('/seller/dashboard?section=harvest-records')->assertSessionHas('status');
        } else {
            $response->assertOk()->assertJson(['status' => 'success']);
        }
        $record = HarvestRecord::query()->sole();
        $response = $this->patch(route('seller.harvest-records.update', $record), [...$payload, 'quantity' => 6])->assertSessionHasNoErrors();
        if ($inertia) {
            $response->assertRedirect('/seller/dashboard?section=harvest-records')->assertSessionHas('status', 'Harvest record updated successfully.');
        } else {
            $response->assertOk()->assertJson(['status' => 'success']);
        }
        $this->assertSame('6.000', $record->fresh()->quantity);
        $response = $this->delete(route('seller.harvest-records.destroy', $record));
        if ($inertia) {
            $response->assertRedirect('/seller/dashboard?section=harvest-records')->assertSessionHas('status', 'Harvest record for Pechay deleted successfully.');
        } else {
            $response->assertOk()->assertJson(['status' => 'success']);
        }
        $this->assertDatabaseCount('harvest_records', 0);
        $this->assertSame(12, $product->fresh()->stock);
    }

    public static function harvestRequestHeaders(): array
    {
        return [
            'Inertia form' => [['X-Inertia' => 'true', 'X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'text/html'], true],
            'JSON client' => [['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'], false],
        ];
    }

    public function test_seller_can_record_a_harvest_without_changing_available_stock(): void
    {
        $this->withoutVite();
        $seller = User::factory()->seller()->create(['barangay' => 'Bagong Ilog']);
        $product = $this->product($seller, 'Fresh Pechay', 'kg', 12);

        $this->actingAs($seller)->from('/seller/dashboard?section=harvest-records')->post(route('seller.harvest-records.store'), [
            'product_id' => $product->id,
            'quantity' => '7.500',
            'unit' => 'kg',
            'harvest_date' => now()->toDateString(),
            'notes' => 'Morning harvest from the community garden.',
        ])->assertSessionHasNoErrors()
            ->assertSessionHas('status', 'Harvest recorded successfully. 7.5 kg of Fresh Pechay were recorded for '.now()->format('F j, Y').'.')
            ->assertRedirect('/seller/dashboard?section=harvest-records');

        $this->assertDatabaseHas('harvest_records', [
            'user_id' => $seller->id,
            'product_id' => $product->id,
            'product_name' => 'Fresh Pechay',
            'quantity' => '7.500',
            'unit' => 'kg',
        ]);
        $this->assertSame(12, $product->fresh()->stock);
        $this->get('/seller/dashboard?section=harvest-records')->assertInertia(fn (Assert $page) => $page
            ->has('harvestRecords', 1)
            ->where('harvestRecords.0.product_name', 'Fresh Pechay')
            ->where('harvestRecords.0.quantity', '7.500'));
    }

    public function test_harvest_records_require_the_sellers_own_product_and_valid_harvest_data(): void
    {
        $seller = User::factory()->seller()->create();
        $otherSeller = User::factory()->seller()->create();
        $otherProduct = $this->product($otherSeller, 'Other Pechay', 'kg', 8);

        $this->actingAs($seller)->post(route('seller.harvest-records.store'), [
            'product_id' => $otherProduct->id,
            'quantity' => '-0.5',
            'unit' => 'invalid',
            'harvest_date' => now('Asia/Manila')->addDay()->toDateString(),
        ])->assertSessionHasErrors(['product_id', 'quantity', 'unit', 'harvest_date']);

        $this->assertDatabaseCount('harvest_records', 0);
        $this->actingAs(User::factory()->create(['role' => UserRole::Customer]))->post(route('seller.harvest-records.store'), [
            'product_id' => $otherProduct->id,
            'quantity' => 2,
            'unit' => 'kg',
            'harvest_date' => now()->toDateString(),
        ])->assertForbidden();
    }

    public function test_harvest_today_uses_philippine_time_and_still_rejects_future_dates(): void
    {
        $this->travelTo(Carbon::parse('2026-10-10 16:15:00', 'UTC'));
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 'Pechay', 'kg', 12);
        $payload = ['product_id' => $product->id, 'quantity' => 5, 'unit' => 'kg', 'harvest_date' => '2026-10-11'];

        $this->actingAs($seller)->postJson(route('seller.harvest-records.store'), $payload)->assertOk();
        $record = HarvestRecord::sole();
        $this->assertSame('2026-10-11', $record->harvest_date->toDateString());
        $this->postJson(route('seller.harvest-records.store'), [...$payload, 'harvest_date' => '2026-10-12'])
            ->assertUnprocessable()->assertJsonValidationErrors('harvest_date');
        $this->patchJson(route('seller.harvest-records.update', $record), [...$payload, 'harvest_date' => '2026-10-12'])
            ->assertUnprocessable()->assertJsonValidationErrors('harvest_date');
        $this->patchJson(route('seller.harvest-records.update', $record), [...$payload, 'quantity' => 6])->assertOk();
        $this->assertSame('6.000', $record->fresh()->quantity);
        $this->assertDatabaseCount('harvest_records', 1);
    }

    public function test_seller_can_update_or_delete_their_own_harvest_record_without_changing_stock(): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 'Kangkong', 'bunch', 12);
        $record = $this->harvestRecord($seller, $product, '2.5', 'bundles', now()->subDay());

        $this->actingAs($seller)->patch(route('seller.harvest-records.update', $record), [
            'product_id' => $product->id,
            'quantity' => '0.500',
            'unit' => 'bundles',
            'harvest_date' => now()->toDateString(),
            'notes' => 'Updated entry',
        ])->assertSessionHasNoErrors()
            ->assertSessionHas('status', 'Harvest record updated successfully.');

        $this->assertDatabaseHas('harvest_records', ['id' => $record->id, 'quantity' => '0.500', 'notes' => 'Updated entry']);
        $this->assertSame(12, $product->fresh()->stock);

        $this->actingAs($seller)->delete(route('seller.harvest-records.destroy', $record))
            ->assertSessionHas('status', 'Harvest record for Kangkong deleted successfully.');
        $this->assertDatabaseMissing('harvest_records', ['id' => $record->id]);
    }

    public function test_seller_cannot_change_or_delete_another_sellers_harvest_record(): void
    {
        $seller = User::factory()->seller()->create();
        $otherSeller = User::factory()->seller()->create();
        $product = $this->product($otherSeller, 'Lettuce', 'piece', 8);
        $record = $this->harvestRecord($otherSeller, $product, '2', 'pieces', now());

        $this->actingAs($seller)->patch(route('seller.harvest-records.update', $record), [
            'product_id' => $product->id,
            'quantity' => '1',
            'unit' => 'pieces',
            'harvest_date' => now()->toDateString(),
        ])->assertNotFound();
        $this->actingAs($seller)->delete(route('seller.harvest-records.destroy', $record))->assertNotFound();

        $this->assertDatabaseHas('harvest_records', ['id' => $record->id, 'quantity' => '2.000']);
    }

    public function test_harvest_history_is_scoped_to_the_current_seller(): void
    {
        $this->withoutVite();
        $seller = User::factory()->seller()->create();
        $otherSeller = User::factory()->seller()->create();
        $product = $this->product($seller, 'Kangkong', 'bunch', 10);
        $otherProduct = $this->product($otherSeller, 'Lettuce', 'piece', 10);

        $this->harvestRecord($seller, $product, 4, 'bundles', now()->subDay());
        $this->harvestRecord($otherSeller, $otherProduct, 6, 'pieces', now());

        $this->actingAs($seller)->get('/seller/dashboard?section=harvest-records')->assertInertia(fn (Assert $page) => $page
            ->has('harvestRecords', 1)
            ->where('harvestRecords.0.product_name', 'Kangkong'));
    }

    public function test_harvest_refresh_skips_unrelated_dashboard_work(): void
    {
        $this->withoutVite();
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 'Pechay', 'kg', 5);
        $this->harvestRecord($seller, $product, '0.5', 'kg', now());

        $weather = Mockery::mock(WeatherService::class);
        $weather->shouldNotReceive('current');
        $this->app->instance(WeatherService::class, $weather);

        $response = $this->actingAs($seller)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Inertia-Version' => app(HandleInertiaRequests::class)->version(request()),
                'X-Inertia-Partial-Component' => 'Seller/Dashboard',
                'X-Inertia-Partial-Data' => 'products,harvestRecords',
            ])
            ->get('/seller/dashboard?section=harvest-records');

        $response->assertOk()
            ->assertHeader('X-Inertia', 'true')
            ->assertJsonPath('component', 'Seller/Dashboard')
            ->assertJsonCount(1, 'props.products')
            ->assertJsonCount(1, 'props.harvestRecords')
            ->assertJsonMissingPath('props.weather');
    }

    private function product(User $seller, string $name, string $unit, int $stock): Product
    {
        $product = new Product([
            'name' => $name,
            'category' => 'Vegetables',
            'description' => 'Fresh harvest',
            'price' => '35.50',
            'unit' => $unit,
            'stock' => $stock,
            'threshold' => 2,
            'photo_path' => 'products/test.png',
        ]);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }

    private function harvestRecord(User $seller, Product $product, string|int|float $quantity, string $unit, mixed $date): HarvestRecord
    {
        $record = new HarvestRecord([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => $quantity,
            'unit' => $unit,
            'harvest_date' => $date,
        ]);
        $record->user_id = $seller->id;
        $record->save();

        return $record;
    }
}
