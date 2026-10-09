<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ForecastRecommendationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ForecastNewCropTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-09', 'Asia/Manila'));
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function row(string $status, float $strength): array
    {
        return ['status' => $status, 'unit' => 'season_strength', 'forecast' => [],
            'annual_profile_index' => array_fill(0, 12, $strength)];
    }

    private function payload(array $newCrops = []): array
    {
        return ['schema_version' => 2, 'data_end_month' => '2026-09',
            'forecast_months' => ['2026-10', '2026-11'],
            'crops' => [
                'Malunggay' => $this->row('fallback', 1),
                'Kangkong' => $this->row('fallback', 1),
                'Gabi' => $this->row('fallback', 1),
                'Pipino' => $this->row('fallback', 0.5),
                ...$newCrops,
            ]];
    }

    private function picks(array $newCrops = []): array
    {
        return app(ForecastRecommendationService::class)->recommend($this->payload($newCrops))['recommendations'];
    }

    public function test_a_suitable_new_crop_replaces_only_the_third_pick_without_claiming_a_yield(): void
    {
        $before = $this->picks();
        $after = $this->picks(['Okra' => $this->row('new_crop', 0.7)]);
        $this->assertCount(3, $after);
        $this->assertSame(array_slice(array_column($before, 'crop'), 0, 2), array_slice(array_column($after, 'crop'), 0, 2));
        $this->assertSame('Okra', $after[2]['crop']);
        $this->assertTrue($after[2]['new_crop']);
        $this->assertSame('area_profile', $after[2]['source']);
        $this->assertNull($after[2]['forecast']);
        $this->assertLessThan($before[2]['score'], $after[2]['score']);
    }

    public function test_the_highest_ranked_suitable_new_crop_is_selected(): void
    {
        $picks = $this->picks(['Okra' => $this->row('new_crop', 0.7), 'Alugbati' => $this->row('new_crop', 0.8)]);
        $this->assertSame('Alugbati', $picks[2]['crop']);
        $this->assertSame(1, count(array_filter($picks, fn ($pick) => $pick['new_crop'])));
    }

    public function test_an_already_ranked_new_crop_is_kept_without_duplicates_or_an_extra_replacement(): void
    {
        $picks = $this->picks(['Okra' => $this->row('new_crop', 1), 'Alugbati' => $this->row('new_crop', 0.7)]);
        $this->assertSame(['Malunggay', 'Kangkong', 'Okra'], array_column($picks, 'crop'));
        $this->assertCount(3, array_unique(array_column($picks, 'crop')));
    }

    public function test_no_replacement_is_forced_for_off_season_poor_weather_long_term_or_unknown_crops(): void
    {
        $unchanged = array_column($this->picks(), 'crop');
        foreach ([
            ['Okra' => $this->row('new_crop', 0.39)],
            ['Pechay' => $this->row('new_crop', 0.7)],
            ['Kalamansi' => $this->row('new_crop', 1)],
            ['Spinach' => $this->row('new_crop', 1)],
            ['Unknown' => $this->row('new_crop', 1)],
            [],
        ] as $newCrops) {
            $this->assertSame($unchanged, array_column($this->picks($newCrops), 'crop'));
        }
        $this->assertSame('Okra', $this->picks(['Okra' => $this->row('new_crop', 0.4)])[2]['crop']);
    }

    public function test_short_history_and_expired_forecasts_are_not_mislabeled_as_new_crops(): void
    {
        $payload = $this->payload();
        $payload['crops']['Malunggay']['status'] = 'success';
        $picks = app(ForecastRecommendationService::class)->recommend($payload)['recommendations'];
        $this->assertFalse($picks[0]['new_crop']);
        $this->assertTrue($picks[0]['outside_forecast_horizon']);
        $this->assertSame('area_profile', $picks[0]['source']);
        $this->assertSame([false, false, false], array_column($picks, 'new_crop'));
    }

    public function test_case_or_whitespace_variants_in_the_upload_do_not_create_a_new_crop_suggestion(): void
    {
        $picks = $this->picks([' OKRA ' => $this->row('fallback', 0.7), 'Okra' => $this->row('new_crop', 0.7)]);
        $this->assertSame(['Malunggay', 'Kangkong', 'Gabi'], array_column($picks, 'crop'));
    }

    public function test_dashboard_and_plan_saves_use_the_same_reserved_crop_and_reject_the_displaced_pick(): void
    {
        $seller = User::factory()->seller()->create();
        $seller->forecastRuns()->create(['source_filename' => 'harvest.csv',
            'result' => $this->payload(['Okra' => $this->row('new_crop', 0.7)])]);
        $this->actingAs($seller)->get('/seller/dashboard?section=forecasting')->assertInertia(fn (Assert $page) => $page
            ->has('forecastData.recommendations', 3)
            ->where('forecastData.recommendations.2.crop', 'Okra')
            ->where('forecastData.recommendations.2.new_crop', true)
            ->where('forecastData.recommendations.2.source', 'area_profile')
            ->where('forecastData.recommendations.2.forecast', null));
        $this->post('/seller/planting-plans', ['crop' => 'Okra', 'planting_month' => '2026-10',
            'harvest_month' => '2099-01', 'days_to_harvest' => 999])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('planting_plans', ['user_id' => $seller->id, 'crop' => 'Okra',
            'planting_month' => '2026-10-01 00:00:00', 'harvest_month' => '2026-12-01 00:00:00', 'days_to_harvest' => 60]);
        $this->post('/seller/planting-plans', ['crop' => 'Gabi', 'planting_month' => '2026-10'])->assertSessionHasErrors('crop');
        $this->assertDatabaseCount('planting_plans', 1);
    }

    public function test_the_full_original_catalog_can_recommend_an_online_crop_without_another_upload(): void
    {
        $profiles = json_decode(file_get_contents(storage_path('app/forecasting/seasonal_profiles.json')), true);
        $payload = $this->payload();
        $payload['crops'] = array_map(fn ($profile) => ['status' => 'fallback', 'unit' => 'season_strength',
            'annual_profile_index' => $profile, 'forecast' => []], $profiles);
        $seller = User::factory()->seller()->create();
        $run = $seller->forecastRuns()->create(['source_filename' => 'synthetic_harvest_1_year.csv', 'result' => $payload]);
        $this->actingAs($seller)->get('/seller/dashboard?section=forecasting')->assertInertia(fn (Assert $page) => $page
            ->has('forecastData.recommendations', 3)
            ->where('forecastData.recommendations.2.crop', 'Pipino')
            ->where('forecastData.recommendations.2.new_crop', true)
            ->where('forecastData.recommendations.2.source', 'online_reference')
            ->where('forecastData.recommendations.2.reference.name', 'DA–ATI MIMAROPA')
            ->where('forecastData.recommendations.2.forecast', null));
        $this->assertSame($payload, $run->fresh()->result);
        $this->post('/seller/planting-plans', ['crop' => 'Pipino', 'planting_month' => '2026-10'])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('planting_plans', ['crop' => 'Pipino', 'days_to_harvest' => 40]);
    }

    public function test_recorded_online_crop_names_and_aliases_are_not_presented_as_new(): void
    {
        $service = app(ForecastRecommendationService::class);
        foreach (['Pipino', ' CUCUMBER ', 'Cucumis sativus'] as $name) {
            $payload = $this->payload();
            unset($payload['crops']['Pipino']);
            $payload['crops'][$name] = $this->row('fallback', 0.8);
            $output = $service->recommend($payload);
            $this->assertArrayHasKey($name, $output['crops']);
            $this->assertSame([], array_filter($output['recommendations'], fn ($pick) => $pick['new_crop']));
        }
    }

    public function test_a_fitted_online_crop_preserves_its_actual_harvest_forecast(): void
    {
        $payload = $this->payload();
        $payload['crops']['Pipino'] = [...$this->row('success', 0.8), 'unit' => 'kg',
            'forecast' => [['month' => '2026-11', 'value' => 100, 'lower' => 80, 'upper' => 120]]];
        $payload['crops'] = ['Pipino' => $payload['crops']['Pipino']];
        $output = app(ForecastRecommendationService::class)->recommend($payload);
        $pick = collect($output['recommendations'])->firstWhere('crop', 'Pipino');
        $this->assertFalse($pick['new_crop']);
        $this->assertSame('farm_history', $pick['source']);
        $this->assertSame(100, $pick['forecast']['value']);
        $this->assertSame($payload['crops']['Pipino']['forecast'], $output['crops']['Pipino']['forecast']);
    }
}
