<?php

namespace Tests\Feature;

use App\Models\HarvestRecord;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HarvestWeightTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $seller): Product
    {
        $product = new Product(['name' => 'Kangkong', 'category' => 'Vegetables', 'description' => 'Harvest test',
            'price' => '35.00', 'unit' => 'bunch', 'stock' => 12, 'threshold' => 2, 'photo_path' => 'products/test.png']);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }

    private function payload(Product $product, array $overrides = []): array
    {
        return [...['product_id' => $product->id, 'quantity' => '20', 'unit' => 'bunch', 'harvest_date' => '2025-01-15', 'measured_weight_kg' => '5.125'], ...$overrides];
    }

    public function test_measured_weight_is_saved_separately_from_quantity_unit_and_stock_and_reloads(): void
    {
        $this->withoutVite();
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $product = $this->product($seller);
        $this->actingAs($seller)->postJson('/seller/crop-yields', $this->payload($product))->assertOk();
        $this->assertDatabaseHas('harvest_records', ['user_id' => $seller->id, 'quantity' => '20.000', 'unit' => 'bunch', 'measured_weight_kg' => '5.125']);
        $this->assertSame(12, $product->fresh()->stock);
        $this->assertSame('bunch', $product->fresh()->unit);
        $this->get('/seller/dashboard?section=harvest-records')->assertInertia(fn (Assert $page) => $page->where('harvestRecords.0.measured_weight_kg', '5.125'));
    }

    public function test_older_plural_unit_records_can_be_weighed_updated_and_cleared_without_guessing_a_conversion(): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller);
        $record = new HarvestRecord(['product_id' => $product->id, 'product_name' => 'Kangkong', 'quantity' => '20', 'unit' => 'bunches', 'harvest_date' => '2025-01-15']);
        $record->user_id = $seller->id;
        $record->save();
        $this->actingAs($seller)->patchJson('/seller/crop-yields/'.$record->id, $this->payload($product, ['unit' => 'bunches']))->assertOk();
        $this->assertSame('bunches', $record->fresh()->unit);
        $this->assertSame('5.125', $record->fresh()->measured_weight_kg);
        $this->patchJson('/seller/crop-yields/'.$record->id, $this->payload($product, ['unit' => 'bunches', 'measured_weight_kg' => null]))->assertOk();
        $this->assertNull($record->fresh()->measured_weight_kg);
        $this->postJson('/seller/crop-yields', $this->payload($product, ['unit' => 'not-a-unit']))->assertUnprocessable()->assertJsonValidationErrors('unit');
    }

    public function test_weight_is_optional_and_kg_quantity_is_the_only_weight_for_kg_records(): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller);
        $this->actingAs($seller)->postJson('/seller/crop-yields', $this->payload($product, ['measured_weight_kg' => null]))->assertOk();
        $this->postJson('/seller/crop-yields', $this->payload($product, ['unit' => 'kg', 'measured_weight_kg' => 'invalid']))->assertOk();
        $this->assertDatabaseCount('harvest_records', 2);
        $this->assertSame(0, HarvestRecord::whereNotNull('measured_weight_kg')->count());
    }

    public function test_invalid_weights_and_foreign_product_or_record_are_rejected(): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller);
        $this->actingAs($seller);
        foreach (['0', '-1', 'NaN', '1000000000', '1.2345'] as $weight) {
            $this->postJson('/seller/crop-yields', $this->payload($product, ['measured_weight_kg' => $weight]))
                ->assertUnprocessable()->assertJsonValidationErrors('measured_weight_kg');
        }
        $this->postJson('/seller/crop-yields', $this->payload($product, ['measured_weight_kg' => '0', 'language' => 'filipino']))
            ->assertJsonPath('errors.measured_weight_kg.0', 'Ilagay ang aktuwal na kabuuang timbang sa kg, higit sa 0 at hanggang 999999999.999, na may hanggang 3 decimal.');
        $this->postJson('/seller/crop-yields', $this->payload($product))->assertOk();
        $record = HarvestRecord::first();
        $this->actingAs(User::factory()->seller()->create())->postJson('/seller/crop-yields', $this->payload($product))
            ->assertUnprocessable()->assertJsonValidationErrors('product_id');
        $this->patchJson('/seller/crop-yields/'.$record->id, $this->payload($product))->assertNotFound();
        $this->assertSame('5.125', $record->fresh()->measured_weight_kg);
    }
}
