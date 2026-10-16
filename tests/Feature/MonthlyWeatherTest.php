<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ForecastRecommendationService;
use App\Services\MonthlyWeatherService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Process;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MonthlyWeatherTest extends TestCase
{
    use RefreshDatabase;

    private string $path;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-16', 'Asia/Manila'));
        $this->path = tempnam(sys_get_temp_dir(), 'agrifarm-weather-');
        copy(storage_path('app/forecasting/monthly_weather_outlook.json'), $this->path);
        config(['services.monthly_weather.paths' => [$this->path]]);
    }

    protected function tearDown(): void
    {
        unlink($this->path);
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_seller_gets_a_current_monthly_outlook_without_a_harvest_upload_or_weather_request(): void
    {
        Process::fake();
        $this->actingAs(User::factory()->seller()->create())
            ->get('/seller/dashboard?section=forecasting')->assertInertia(fn (Assert $page) => $page
            ->where('monthlyWeather.status', 'ready')->where('monthlyWeather.forecast_origin', '2026-09')
            ->where('monthlyWeather.source.type', 'historical_reanalysis')
            ->where('monthlyWeather.source.grid_latitude', 14.5)->has('monthlyWeather.forecast', 3)
            ->where('monthlyWeather.forecast.0.month', '2026-10')->where('forecastData', null));
        Process::assertNothingRan();
    }

    public function test_weather_advice_uses_the_matched_month_actual_values_aliases_and_source_guidance(): void
    {
        $service = app(MonthlyWeatherService::class);
        $outlook = $service->outlook();
        $outlook['forecast'][0]['rainfall_total_mm'] = 250;
        $outlook['forecast'][0]['reference_rainfall_mm'] = 100;
        $wet = $service->advice('Cucumber', '2026-10', $outlook);
        $this->assertSame('precautions', $wet['status']);
        $this->assertSame('review_drainage', $wet['messages'][0]['rule']);
        $this->assertStringContainsString('250.0 mm', $wet['messages'][0]['en']);
        $this->assertStringContainsString('waterlogging', $wet['messages'][0]['guidance']['en']);
        $this->assertSame('DA–ATI MIMAROPA', $wet['source']['publisher']);
        $canonical = $service->advice('Pipino', '2026-10', $outlook);
        $this->assertSame($wet['messages'], $canonical['messages']);
        $this->assertSame($wet['preparation'], $canonical['preparation']);
        $this->assertSame('More rain than usual is expected this month.', $wet['condition']['en']);
        $kangkong = $service->advice('Kangkong', '2026-10', $outlook);
        $this->assertSame('no_trigger', $kangkong['status']);
        $this->assertSame($wet['condition'], $kangkong['condition']);
        $this->assertStringContainsString('keep the soil moist', $kangkong['preparation']['en']);
        $this->assertStringContainsString('mamasa-masa', $kangkong['preparation']['fil']);
        $this->assertNotNull($kangkong['source']);
        $outlook['forecast'][0]['rainfall_total_mm'] = 20;
        $dry = $service->advice('Pipino', '2026-10', $outlook);
        $this->assertSame('review_water_supply', $dry['messages'][0]['rule']);
        $this->assertStringContainsString('20.0 mm', $dry['messages'][0]['en']);
        $this->assertNotSame($wet['messages'][0]['en'], $dry['messages'][0]['en']);
        $this->assertSame('Less rain than usual is expected this month.', $dry['condition']['en']);
        $outlook['forecast'][0]['rainfall_total_mm'] = 100;
        $this->assertSame('Rainfall around the usual amount is expected this month.', $service->advice('Pipino', '2026-10', $outlook)['condition']['en']);
    }

    public function test_temperature_comparison_is_limited_to_a_reviewed_daily_mean_requirement(): void
    {
        $service = app(MonthlyWeatherService::class);
        $outlook = $service->outlook();
        $outlook['forecast'][0]['temperature_mean_c'] = 28;
        $gabi = $service->advice('Taro', '2026-10', $outlook);
        $this->assertSame('review_temperature', $gabi['messages'][0]['rule']);
        $this->assertStringContainsString('21–27', $gabi['messages'][0]['en']);
        $outlook['forecast'][0]['temperature_mean_c'] = 25;
        $this->assertSame('no_trigger', $service->advice('Gabi', '2026-10', $outlook)['status']);
        $this->assertSame('not_assessed', $service->advice('Luya', '2026-10', $outlook)['status']);
        $this->assertSame('not_assessed', $service->advice('Unknown', '2026-10', $outlook)['status']);
        $this->assertSame('unavailable', $service->advice('Pipino', '2027-01', $outlook)['status']);
    }

    public function test_stale_missing_or_invalid_data_never_produce_current_weather_advice(): void
    {
        $service = app(MonthlyWeatherService::class);
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-01', 'Asia/Manila'));
        $later = $service->outlook();
        $this->assertSame('ready', $later['status']);
        $this->assertTrue($later['refresh_recommended']);
        $this->assertSame(['2026-11', '2026-12'], array_column($later['forecast'], 'month'));
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2027-01-01', 'Asia/Manila'));
        $stale = $service->outlook();
        $this->assertSame('outdated', $stale['status']);
        $this->assertSame('unavailable', $service->advice('Pipino', '2026-11', $stale)['status']);
        file_put_contents($this->path, '{bad');
        $this->assertSame('unavailable', $service->outlook()['status']);
        config(['services.monthly_weather.paths' => [$this->path.'-missing']]);
        $this->assertSame('unavailable', $service->outlook()['status']);
    }

    public function test_corrupt_month_or_negative_rain_is_rejected_and_valid_fallback_is_used(): void
    {
        $data = json_decode(file_get_contents($this->path), true);
        $data['forecast'][0]['rainfall_total_mm'] = -1;
        file_put_contents($this->path, json_encode($data));
        $service = app(MonthlyWeatherService::class);
        $this->assertSame('unavailable', $service->outlook()['status']);
        config(['services.monthly_weather.paths' => [$this->path, storage_path('app/forecasting/monthly_weather_outlook.json')]]);
        $this->assertSame('ready', $service->outlook()['status']);
        config(['services.monthly_weather.paths' => [$this->path]]);
        $data['forecast'][0]['rainfall_total_mm'] = 100;
        $data['forecast'][0]['month'] = '2027-10';
        file_put_contents($this->path, json_encode($data));
        $this->assertSame('unavailable', $service->outlook()['status']);
    }

    public function test_monthly_advice_does_not_change_crop_scores_order_or_harvest_forecasts(): void
    {
        $payload = ['schema_version' => 2, 'forecast_months' => ['2026-11'], 'data_end_month' => '2026-10', 'crops' => []];
        foreach (['Kangkong', 'Malunggay'] as $crop) {
            $payload['crops'][$crop] = ['status' => 'fallback', 'unit' => 'season_strength', 'forecast' => [['month' => '2026-11', 'value' => .8]], 'annual_profile_index' => array_fill(0, 12, .8)];
        }
        $seller = User::factory()->seller()->create();
        $seller->forecastRuns()->create(['source_filename' => 'test-harvest.csv', 'result' => $payload]);
        $expected = app(ForecastRecommendationService::class)->recommend($payload, seller: $seller);
        $this->actingAs($seller)->get('/seller/dashboard?section=forecasting')->assertInertia(function (Assert $page) use ($expected) {
            $page->where('forecastData.crops', $expected['crops']);
            foreach ($expected['recommendations'] as $index => $recommendation) {
                foreach (['crop', 'score', 'forecast', 'harvest_month'] as $field) {
                    $page->where("forecastData.recommendations.$index.$field", $recommendation[$field]);
                }
                $page->has("forecastData.recommendations.$index.monthly_weather_advice");
            }
        });
    }

    public function test_refresh_runs_offline_and_saves_under_the_persistent_private_volume(): void
    {
        Process::fake();
        $this->artisan('weather:refresh', ['--as-of' => '2026-10-16'])->assertSuccessful();
        Process::assertRan(fn ($process) => in_array(storage_path('app/private/monthly_weather/outlook.json'), $process->command)
            && in_array('--download', $process->command));
        $this->artisan('weather:refresh', ['--as-of' => '2099-01-01'])->assertFailed();
    }
}
