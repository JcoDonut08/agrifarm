<?php

namespace Tests\Feature;

use App\Models\HarvestRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BarangayHarvestExportTest extends TestCase
{
    use RefreshDatabase;

    private function record(User $seller, string $date, string $crop = 'Pechay', string $quantity = '2.500', string $unit = 'kg'): HarvestRecord
    {
        $record = new HarvestRecord(['product_name' => $crop, 'harvest_date' => $date, 'quantity' => $quantity, 'unit' => $unit]);
        $record->user_id = $seller->id;
        $record->save();

        return $record;
    }

    private function url(string $action = 'preview', array $overrides = []): string
    {
        return '/admin/reports/harvest-forecast/'.$action.'?'.http_build_query([...[
            'barangay' => 'Rosario', 'from' => '2025-01-01', 'to' => '2025-12-31',
        ], ...$overrides]);
    }

    public function test_only_admins_can_preview_or_download(): void
    {
        foreach (['preview', 'download'] as $action) {
            $this->get($this->url($action))->assertRedirect('/login');
        }
        foreach ([User::factory()->create(), User::factory()->seller()->create()] as $user) {
            foreach (['preview', 'download'] as $action) {
                $this->actingAs($user)->getJson($this->url($action))->assertForbidden();
            }
        }
    }

    public function test_export_combines_only_matching_barangay_month_crop_and_preserves_gaps_and_precision(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $second = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $other = User::factory()->seller()->create(['barangay' => 'Maybunga']);
        $this->record($seller, '2025-01-02', quantity: '0.001');
        $this->record($second, '2025-01-29', quantity: '1.234');
        $this->record($seller, '2025-01-20', 'Okra', '5.000');
        $this->record($seller, '2025-03-10', quantity: '3.125');
        $this->record($seller, '2024-12-31', quantity: '999.000');
        $this->record($other, '2025-01-02', quantity: '999.000', unit: 'bunch');
        $this->actingAs(User::factory()->cenroAdmin()->create());
        $this->getJson($this->url())->assertOk()->assertJsonPath('can_export', true)
            ->assertJsonPath('record_count', 4)->assertJsonPath('row_count', 3)
            ->assertJsonPath('record_start', '2025-01-02')->assertJsonPath('record_end', '2025-03-10')
            ->assertJsonPath('rows.1', ['2025-01', 'Pechay', '1.235', 'Rosario'])
            ->assertJsonPath('month_count', 2)->assertJsonPath('total_kg', '9.360')
            ->assertJsonPath('partial_months', []);
        $response = $this->get($this->url('download'))->assertOk()
            ->assertDownload('agrifarm-rosario-harvest-2025-01-to-2025-12.csv');
        $rows = array_map(fn ($line) => str_getcsv($line, ',', '"', ''), explode("\n", trim($response->streamedContent())));
        $this->assertSame([
            ['Month', 'Vegetable Crop', 'Harvest (kg)', 'Barangay'],
            ['2025-01', 'Okra', '5.000', 'Rosario'],
            ['2025-01', 'Pechay', '1.235', 'Rosario'],
            ['2025-03', 'Pechay', '3.125', 'Rosario'],
        ], $rows);
    }

    public function test_empty_and_non_kg_scopes_block_download_instead_of_exporting_misleading_totals(): void
    {
        $this->actingAs(User::factory()->cenroAdmin()->create());
        $this->getJson($this->url())->assertOk()->assertJsonPath('issues.0.code', 'empty');
        $this->getJson($this->url('download'))->assertUnprocessable();
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $this->record($seller, '2025-01-01');
        $this->record($seller, '2025-02-01', unit: 'head');
        $this->getJson($this->url())->assertJsonPath('can_export', false)->assertJsonPath('issues.0.code', 'non_kg')->assertJsonPath('issues.0.units.head', 1);
        $this->getJson($this->url('download'))->assertUnprocessable();
        $this->getJson($this->url('download', ['to' => '2025-01-31']))->assertOk();
    }

    public function test_partial_months_are_identified_and_download_is_rechecked_after_preview(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $this->record($seller, '2025-01-02');
        $this->record($seller, '2025-01-16');
        $this->actingAs(User::factory()->cenroAdmin()->create());
        $selection = ['from' => '2025-01-15', 'to' => '2025-01-20'];
        $this->getJson($this->url('preview', $selection))->assertJsonPath('partial_months', ['2025-01'])
            ->assertJsonPath('record_count', 1)->assertJsonPath('can_export', true);
        $this->record($seller, '2025-01-17', unit: 'piece');
        $this->getJson($this->url('download', $selection))->assertUnprocessable()->assertJsonPath('can_export', false);
    }

    public function test_measured_non_kg_weights_join_kg_totals_but_unweighed_records_still_block(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $this->record($seller, '2025-01-01', quantity: '2.000');
        $bunches = $this->record($seller, '2025-01-02', quantity: '20', unit: 'bunches');
        $bunches->update(['measured_weight_kg' => '5.125']);
        $pieces = $this->record($seller, '2025-01-03', quantity: '8', unit: 'pieces');
        $this->actingAs(User::factory()->cenroAdmin()->create());
        $this->getJson($this->url('download'))->assertUnprocessable()->assertJsonPath('issues.0.units.pieces', 1);
        $pieces->update(['measured_weight_kg' => '1.875']);
        $response = $this->get($this->url('download'))->assertOk();
        $this->assertStringContainsString('2025-01,Pechay,9.000,Rosario', $response->streamedContent());
        $bunches->update(['measured_weight_kg' => '1000000.001']);
        $this->getJson($this->url('download'))->assertUnprocessable()->assertJsonPath('issues.0.code', 'quantity_limit');
        $bunches->update(['measured_weight_kg' => null]);
        $this->getJson($this->url('preview'))->assertJsonPath('can_export', false)->assertJsonPath('issues.0.units.bunches', 1);
    }

    public function test_case_spacing_variants_unsafe_names_and_excessive_monthly_quantities_are_blocked(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $this->record($seller, '2025-01-01', 'Pechay', '600000.001');
        $this->record($seller, '2025-01-02', 'Pechay', '400000.000');
        $this->record($seller, '2025-01-03', ' pechay ');
        $this->record($seller, '2025-01-04', ' =HYPERLINK("x")');
        $this->actingAs(User::factory()->cenroAdmin()->create());
        $this->getJson($this->url('download'))->assertUnprocessable()
            ->assertJsonPath('issues.0.code', 'crop_names')->assertJsonPath('issues.1.code', 'quantity_limit');
    }

    public function test_crop_count_and_date_span_limits_match_the_importer(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        foreach (range(1, 51) as $index) {
            $this->record($seller, '2025-01-01', 'Crop '.$index);
        }
        $this->record($seller, '1900-01-01');
        $this->actingAs(User::factory()->cenroAdmin()->create());
        $this->getJson($this->url('download', ['from' => '1900-01-01']))->assertUnprocessable()
            ->assertJsonPath('issues.0.code', 'crop_limit')->assertJsonPath('issues.1.code', 'date_span');
    }

    public function test_invalid_barangays_and_dates_are_rejected_in_both_languages(): void
    {
        $this->actingAs(User::factory()->cenroAdmin()->create());
        $this->getJson($this->url('preview', ['barangay' => 'Other', 'from' => '2025-12-01', 'to' => '2025-01-01']))
            ->assertUnprocessable()->assertJsonValidationErrors(['barangay', 'to']);
        $this->getJson($this->url('download', ['from' => '1800-01-01']))->assertUnprocessable()->assertJsonValidationErrors('from');
        $this->getJson($this->url('preview', ['barangay' => '', 'language' => 'filipino']))
            ->assertUnprocessable()->assertJsonPath('errors.barangay.0', 'Pumili ng barangay.');
        $this->getJson($this->url('download', ['format' => 'pdf']))->assertUnprocessable()->assertJsonValidationErrors('format');
    }

    public function test_excel_data_uses_fresh_authorized_monthly_totals_and_blocks_missing_weights(): void
    {
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $this->record($seller, '2025-01-01', quantity: '1.125');
        $this->actingAs($seller)->getJson($this->url('download', ['format' => 'xlsx']))->assertForbidden();
        $this->actingAs(User::factory()->cenroAdmin()->create());
        $this->getJson($this->url())->assertJsonPath('total_kg', '1.125');
        $this->record($seller, '2025-01-02', quantity: '0.001');
        $this->getJson($this->url('download', ['format' => 'xlsx']))->assertOk()
            ->assertJsonPath('filename', 'agrifarm-rosario-harvest-2025-01-to-2025-12.xlsx')
            ->assertJsonPath('headers', ['Month', 'Vegetable Crop', 'Harvest (kg)', 'Barangay'])
            ->assertJsonPath('preview.rows', [['2025-01', 'Pechay', '1.126', 'Rosario']])
            ->assertJsonPath('preview.total_kg', '1.126');
        $this->record($seller, '2025-01-03', unit: 'bunch');
        $this->getJson($this->url('download', ['format' => 'xlsx']))->assertUnprocessable()
            ->assertJsonPath('can_export', false)->assertJsonMissingPath('filename');
    }
}
