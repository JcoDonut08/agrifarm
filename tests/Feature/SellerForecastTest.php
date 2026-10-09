<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use App\Services\ForecastRecommendationService;
use App\Services\ForecastService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SellerForecastTest extends TestCase
{
    use RefreshDatabase;

    private function row(string $status = 'success', array $points = []): array
    {
        return ['status' => $status, 'unit' => $status === 'success' ? 'kg' : 'season_strength',
            'forecast' => $points,
            'annual_profile_index' => [0.9, 1, 0.9, 0.7, 0.5, 0.4, 0.3, 0.3, 0.4, 0.6, 0.8, 0.9]];
    }

    private function forecastPayload(array $crops): array
    {
        return ['schema_version' => 2, 'forecast_months' => ['2025-11', '2025-12'],
            'data_end_month' => '2025-10', 'crops' => $crops];
    }

    public function test_recommendation_uses_expected_harvest_month_and_not_planting_month(): void
    {
        $result = $this->forecastPayload(['Pechay' => $this->row(points: [
            ['month' => '2025-11', 'value' => 10, 'lower' => 5, 'upper' => 15],
            ['month' => '2025-12', 'value' => 100, 'lower' => 80, 'upper' => 120],
        ])]);
        $output = app(ForecastRecommendationService::class)->recommend($result, CarbonImmutable::parse('2025-11-30', 'Asia/Manila'));
        $pick = $output['recommendations'][0];
        $this->assertSame('2025-12', $pick['harvest_month']);
        $this->assertEquals(1, $pick['season_strength']);
        $this->assertSame('farm_history', $pick['source']);
        $this->assertSame(100, $pick['forecast']['value']);
        $this->assertSame(30, $output['crops']['Pechay']['metadata']['days_to_harvest']);
    }

    public function test_old_forecast_is_not_reused_for_another_year(): void
    {
        $result = $this->forecastPayload(['Pechay' => $this->row(points: [
            ['month' => '2025-12', 'value' => 100, 'lower' => 80, 'upper' => 120],
        ])]);
        $output = app(ForecastRecommendationService::class)->recommend($result, CarbonImmutable::parse('2026-11-01'));
        $pick = $output['recommendations'][0];
        $this->assertSame('2026-12', $pick['harvest_month']);
        $this->assertSame('area_profile', $pick['source']);
        $this->assertTrue($pick['outside_forecast_horizon']);
        $this->assertNull($pick['forecast']);
        $this->assertEquals(0.9, $pick['season_strength']);
    }

    public function test_barangay_scope_survives_saving_refresh_and_recommendations_without_claiming_reference_crops(): void
    {
        $this->withoutVite();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2025-11-01', 'Asia/Manila'));
        try {
            $seller = User::factory()->seller()->create(['barangay' => 'Maybunga']);
            $result = $this->forecastPayload([
                'Pechay' => $this->row(points: [['month' => '2025-12', 'value' => 100, 'lower' => 80, 'upper' => 120]]),
                'Okra' => $this->row('new_crop'),
            ]);
            $result['dataset'] = ['scope' => 'barangay', 'barangay' => 'Rosario', 'record_start_month' => '2023-01', 'record_end_month' => '2025-10'];
            $this->mock(ForecastService::class)->shouldReceive('generateForecast')->once()->andReturn($result);
            $this->actingAs($seller)->post('/seller/forecasting', ['harvest_data' => UploadedFile::fake()->create('rosario.csv', 1, 'text/csv')])->assertSessionHasNoErrors();
            $picks = app(ForecastRecommendationService::class)->recommend($result)['recommendations'];
            $this->assertSame('barangay_history', collect($picks)->firstWhere('crop', 'Pechay')['source']);
            $this->assertSame('area_profile', collect($picks)->firstWhere('crop', 'Okra')['source']);
            foreach (range(1, 2) as $visit) {
                $this->get('/seller/dashboard?section=forecasting')->assertInertia(fn (Assert $page) => $page
                    ->where('forecastData.dataset.barangay', 'Rosario')->where('forecastData.dataset.record_start_month', '2023-01'));
            }
            $later = app(ForecastRecommendationService::class)->recommend($result, CarbonImmutable::parse('2027-01-01'));
            $this->assertSame('area_profile', collect($later['recommendations'])->firstWhere('crop', 'Pechay')['source']);
            $this->actingAs(User::factory()->seller()->create())->get('/seller/dashboard')->assertInertia(fn (Assert $page) => $page->where('forecastData', null));
        } finally {
            CarbonImmutable::setTestNow();
        }
    }

    public function test_a_recorded_zero_forecast_does_not_become_a_profile_recommendation(): void
    {
        $result = $this->forecastPayload(['Pechay' => $this->row(points: [
            ['month' => '2025-12', 'value' => 0, 'lower' => 0, 'upper' => 0],
        ])]);
        $pick = collect(app(ForecastRecommendationService::class)->recommend($result, CarbonImmutable::parse('2025-11-01'))['recommendations'])->firstWhere('crop', 'Pechay');
        $this->assertEquals(0, $pick['season_strength']);
        $this->assertSame('farm_history', $pick['source']);
    }

    public function test_new_crops_can_rank_but_are_capped_at_two(): void
    {
        $result = $this->forecastPayload([
            'Pechay' => $this->row('fallback'), 'Okra' => $this->row('new_crop'),
            'Alugbati' => $this->row('new_crop'), 'Kangkong' => $this->row('new_crop'),
        ]);
        $picks = app(ForecastRecommendationService::class)->recommend($result, CarbonImmutable::parse('2025-06-01'))['recommendations'];
        $this->assertCount(3, $picks);
        $this->assertSame(2, count(array_filter($picks, fn ($pick) => $pick['new_crop'])));
        $this->assertContains('Pechay', array_column($picks, 'crop'));
    }

    public function test_seasonal_weighting_favors_rain_in_wet_months_and_heat_in_dry_months(): void
    {
        $result = $this->forecastPayload(['Pechay' => $this->row('fallback')]);
        $service = app(ForecastRecommendationService::class);
        $wet = $service->recommend($result, CarbonImmutable::parse('2025-06-01'))['recommendations'][0];
        $dry = $service->recommend($result, CarbonImmutable::parse('2025-03-01'))['recommendations'][0];
        $this->assertSame('rain', $wet['weather_focus']);
        $this->assertEquals(0.7, $wet['rain_weight']);
        $this->assertSame('heat', $dry['weather_focus']);
        $this->assertEquals(0.3, $dry['rain_weight']);
    }

    public function test_long_tree_establishment_and_unknown_crop_are_not_shortlisted(): void
    {
        $result = $this->forecastPayload(['Kalamansi' => $this->row('new_crop'), 'Unknown' => $this->row('fallback')]);
        $output = app(ForecastRecommendationService::class)->recommend($result, CarbonImmutable::parse('2025-01-01'));
        $this->assertNotContains('Kalamansi', array_column($output['recommendations'], 'crop'));
        $this->assertNotContains('Unknown', array_column($output['recommendations'], 'crop'));
        $this->assertArrayHasKey('Kalamansi', $output['crops']);
    }

    public function test_every_reference_crop_has_timing_metadata(): void
    {
        $profiles = json_decode(file_get_contents(storage_path('app/forecasting/seasonal_profiles.json')), true);
        $metadata = json_decode(file_get_contents(storage_path('app/forecasting/crop_metadata.json')), true);
        $this->assertCount(20, $metadata);
        foreach (array_keys($profiles) as $crop) {
            $this->assertGreaterThan(0, $metadata[$crop]['days_to_harvest']);
            $this->assertContains($metadata[$crop]['growth_class'], ['fast', 'standard', 'long']);
        }
    }

    public function test_upload_returns_the_dated_contract_and_server_recommendations_in_inertia(): void
    {
        $this->withoutVite();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2025-11-01', 'Asia/Manila'));
        try {
            $seller = User::factory()->create(['role' => UserRole::Seller]);
            $result = $this->forecastPayload(['Pechay' => $this->row('fallback')]);
            $this->mock(ForecastService::class)->shouldReceive('generateForecast')->once()->andReturn($result);
            $this->actingAs($seller)->from('/seller/dashboard?section=forecasting')
                ->post('/seller/forecasting', ['harvest_data' => UploadedFile::fake()->create('harvest.csv', 1, 'text/csv')])
                ->assertRedirect('/seller/dashboard?section=forecasting')->assertSessionHasNoErrors();
            $this->get('/seller/dashboard?section=forecasting')->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Dashboard')
                ->where('forecastData.schema_version', 2)
                ->where('forecastData.forecast_months.0', '2025-11')
                ->where('forecastData.recommendations.0.harvest_month', '2025-12')
                ->where('forecastData.crops.Pechay.metadata.days_to_harvest', 30)
                ->where('forecastRun.source_filename', 'harvest.csv'));
            $this->assertDatabaseHas('forecast_runs', ['user_id' => $seller->id, 'source_filename' => 'harvest.csv']);
            $this->get('/seller/dashboard?section=forecasting')->assertInertia(fn (Assert $page) => $page
                ->where('forecastData.schema_version', 2));
        } finally {
            CarbonImmutable::setTestNow();
        }
    }

    public function test_guests_and_customers_cannot_upload_or_download_samples(): void
    {
        $this->post('/seller/forecasting')->assertRedirect('/login');
        $this->get('/seller/forecasting/sample')->assertRedirect('/login');
        $this->actingAs(User::factory()->create());
        $this->post('/seller/forecasting')->assertForbidden();
        $this->get('/seller/forecasting/sample')->assertForbidden();
        $this->assertDatabaseCount('forecast_runs', 0);
    }

    public function test_suspended_sellers_cannot_run_forecasts(): void
    {
        $seller = User::factory()->seller()->create(['account_status' => AccountStatus::Suspended]);
        $this->actingAs($seller)->post('/seller/forecasting')->assertRedirect('/login');
        $this->assertGuest();
        $this->assertDatabaseCount('forecast_runs', 0);
    }

    public function test_harvest_requests_do_not_consume_the_forecast_upload_allowance(): void
    {
        $this->actingAs(User::factory()->seller()->create());
        foreach (range(1, 6) as $attempt) {
            $this->postJson('/seller/crop-yields', [])->assertUnprocessable();
        }
        $this->mock(ForecastService::class)->shouldReceive('generateForecast')->once()
            ->andReturn($this->forecastPayload(['Pechay' => $this->row('fallback')]));
        $this->post('/seller/forecasting', ['harvest_data' => UploadedFile::fake()->create('harvest.csv', 1, 'text/csv')])
            ->assertSessionHasNoErrors()->assertRedirect();
        $this->assertDatabaseCount('forecast_runs', 1);
    }

    public function test_missing_wrong_type_and_oversize_files_are_rejected_before_running_python(): void
    {
        $this->mock(ForecastService::class)->shouldNotReceive('generateForecast');
        $this->actingAs(User::factory()->seller()->create());
        foreach ([null, UploadedFile::fake()->create('photo.jpg', 1, 'image/jpeg'), UploadedFile::fake()->create('big.csv', 5121, 'text/csv'), UploadedFile::fake()->create('script.php', 1, 'text/plain')] as $file) {
            $this->post('/seller/forecasting', ['harvest_data' => $file])->assertSessionHasErrors('harvest_data');
        }
        $this->assertDatabaseCount('forecast_runs', 0);
    }

    public function test_validation_errors_follow_the_selected_language(): void
    {
        $this->actingAs(User::factory()->seller()->create())
            ->post('/seller/forecasting', ['language' => 'filipino'])
            ->assertSessionHasErrors(['harvest_data' => 'Pumili muna ng file ng ani.']);
    }

    public function test_excel_upload_is_accepted_and_keeps_its_source_filename(): void
    {
        $this->mock(ForecastService::class)->shouldReceive('generateForecast')->once()->andReturn($this->forecastPayload(['Pechay' => $this->row('fallback')]));
        $seller = User::factory()->seller()->create();
        $this->actingAs($seller)->post('/seller/forecasting', [
            'harvest_data' => UploadedFile::fake()->create('harvest.xlsx', 1, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('forecast_runs', ['user_id' => $seller->id, 'source_filename' => 'harvest.xlsx']);
    }

    public function test_failed_runs_keep_the_previous_saved_result(): void
    {
        $this->withoutVite();
        $seller = User::factory()->seller()->create();
        $seller->forecastRuns()->create(['result' => $this->forecastPayload(['Pechay' => $this->row('fallback')]), 'source_filename' => 'previous.csv']);
        $this->mock(ForecastService::class)->shouldReceive('generateForecast')->twice()->andReturn(null, [
            'error' => 'Missing required columns: Month', 'error_code' => 'missing_columns', 'details' => ['columns' => ['Month']],
        ]);
        foreach (['service_failed', 'missing_columns'] as $code) {
            $this->actingAs($seller)->post('/seller/forecasting', ['harvest_data' => UploadedFile::fake()->create('bad.csv', 1, 'text/csv')])
                ->assertSessionHas('forecastError.error_code', $code);
            $this->assertDatabaseCount('forecast_runs', 1);
            $this->get('/seller/dashboard?section=forecasting')->assertInertia(fn (Assert $page) => $page
                ->where('forecastRun.source_filename', 'previous.csv')
                ->where('forecastData.schema_version', 2));
        }
    }

    public function test_a_seller_only_receives_their_latest_result(): void
    {
        $this->withoutVite();
        $seller = User::factory()->seller()->create();
        $other = User::factory()->seller()->create();
        $seller->forecastRuns()->create(['result' => $this->forecastPayload(['Pechay' => $this->row('fallback')]), 'source_filename' => 'older.csv']);
        $seller->forecastRuns()->create(['result' => $this->forecastPayload(['Okra' => $this->row('fallback')]), 'source_filename' => 'latest.csv']);
        $other->forecastRuns()->create(['result' => $this->forecastPayload(['Kamatis' => $this->row('fallback')]), 'source_filename' => 'private.csv']);
        $this->actingAs($seller)->get('/seller/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('forecastRun.source_filename', 'latest.csv')
            ->has('forecastData.crops.Okra')
            ->missing('forecastData.crops.Kamatis')
            ->missing('forecastData.crops.Pechay'));
        $this->actingAs(User::factory()->seller()->create())->get('/seller/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('forecastData', null)->where('forecastRun', null));
    }

    public function test_sellers_can_download_the_documented_sample(): void
    {
        $this->actingAs(User::factory()->seller()->create())->get('/seller/forecasting/sample')
            ->assertOk()->assertDownload('sample-harvest.csv');
    }

    public function test_uploads_are_limited_to_five_per_minute(): void
    {
        $this->actingAs(User::factory()->seller()->create());
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post('/seller/forecasting')->assertSessionHasErrors('harvest_data');
        }
        $this->post('/seller/forecasting')->assertStatus(429);
    }

    public function test_process_uses_unique_paths_and_always_cleans_uploaded_files(): void
    {
        Storage::fake('local');
        $paths = [];
        Process::fake(function ($process) use (&$paths) {
            $this->assertIsArray($process->command);
            $this->assertSame(config('services.forecasting.python_bin'), $process->command[0]);
            $path = $process->command[2];
            $this->assertFileExists($path);
            $this->assertMatchesRegularExpression('/[a-f0-9-]{36}\\.xlsx$/', $path);
            $paths[] = $path;

            return Process::result(output: json_encode(['error' => 'Unreadable file', 'error_code' => 'unreadable_file', 'details' => []]), exitCode: 1);
        });
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $result = app(ForecastService::class)->generateForecast(UploadedFile::fake()->create('same.xlsx', 1));
            $this->assertSame('unreadable_file', $result['error_code']);
            $this->assertSame([], Storage::disk('local')->allFiles('forecasting_temp'));
        }
        $this->assertNotSame($paths[0], $paths[1]);
    }

    public function test_invalid_process_output_and_process_exceptions_are_cleaned_up(): void
    {
        Storage::fake('local');
        Process::fake(fn () => Process::result(output: '{}'));
        $this->assertNull(app(ForecastService::class)->generateForecast(UploadedFile::fake()->create('harvest.csv', 1)));
        $this->assertSame([], Storage::disk('local')->allFiles('forecasting_temp'));
        Process::fake(function () {
            throw new \RuntimeException('Process failed');
        });
        $this->assertNull(app(ForecastService::class)->generateForecast(UploadedFile::fake()->create('harvest.csv', 1)));
        $this->assertSame([], Storage::disk('local')->allFiles('forecasting_temp'));
    }

    public function test_process_result_validates_optional_barangay_metadata_and_preserves_legacy_uploads(): void
    {
        Storage::fake('local');
        $months = array_map(fn ($month) => sprintf('2026-%02d', $month), range(1, 12));
        $points = array_map(fn ($month) => ['month' => $month, 'value' => 0.5, 'lower' => null, 'upper' => null], $months);
        $payload = ['schema_version' => 2, 'data_end_month' => '2025-12', 'forecast_months' => $months, 'crops' => ['Pechay' => $this->row('fallback', $points)],
            'dataset' => ['scope' => 'barangay', 'barangay' => 'Rosario', 'record_start_month' => '2025-01', 'record_end_month' => '2025-12']];
        Process::fake(fn () => Process::result(output: json_encode($payload)));
        $this->assertSame($payload, app(ForecastService::class)->generateForecast(UploadedFile::fake()->create('harvest.csv', 1)));
        foreach ([['barangay' => ''], ['scope' => 'personal'], ['record_start_month' => '2026-01'], ['record_end_month' => '2025-11']] as $invalid) {
            $bad = $payload;
            $bad['dataset'] = [...$bad['dataset'], ...$invalid];
            Process::fake(fn () => Process::result(output: json_encode($bad)));
            $this->assertNull(app(ForecastService::class)->generateForecast(UploadedFile::fake()->create('harvest.csv', 1)));
        }
        $this->assertSame([], Storage::disk('local')->allFiles('forecasting_temp'));
    }

    public function test_process_accepts_the_complete_contract_and_rejects_partial_or_invalid_points(): void
    {
        Storage::fake('local');
        $months = array_map(fn ($month) => sprintf('2026-%02d', $month), range(1, 12));
        $points = array_map(fn ($month) => ['month' => $month, 'value' => 0.5, 'lower' => null, 'upper' => null], $months);
        $payload = ['schema_version' => 2, 'data_end_month' => '2025-12', 'forecast_months' => $months, 'crops' => ['Pechay' => $this->row('fallback', $points)]];
        Process::fake(fn () => Process::result(output: json_encode($payload)));
        $this->assertSame($payload, app(ForecastService::class)->generateForecast(UploadedFile::fake()->create('harvest.csv', 1)));

        $partial = $payload;
        array_pop($partial['crops']['Pechay']['forecast']);
        $invalid = $payload;
        $invalid['crops']['Pechay']['forecast'][0]['value'] = -1;
        $misdated = $payload;
        $misdated['crops']['Pechay']['forecast'][0]['month'] = '2025-01';
        foreach ([$partial, $invalid, $misdated] as $badResult) {
            Process::fake(fn () => Process::result(output: json_encode($badResult)));
            $this->assertNull(app(ForecastService::class)->generateForecast(UploadedFile::fake()->create('harvest.csv', 1)));
            $this->assertSame([], Storage::disk('local')->allFiles('forecasting_temp'));
        }
    }
}
