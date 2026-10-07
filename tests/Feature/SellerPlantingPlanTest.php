<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SellerPlantingPlanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-06', 'Asia/Manila'));
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function sellerWithForecast(): User
    {
        $seller = User::factory()->seller()->create();
        $seller->forecastRuns()->create([
            'source_filename' => 'harvest.csv',
            'result' => [
                'schema_version' => 2,
                'data_end_month' => '2025-12',
                'forecast_months' => ['2026-01', '2026-02'],
                'crops' => ['Pechay' => [
                    'status' => 'fallback',
                    'unit' => 'season_strength',
                    'forecast' => [],
                    'annual_profile_index' => array_fill(0, 12, 0.8),
                ]],
            ],
        ]);

        return $seller;
    }

    private function savePlan(User $seller, array $extra = []): void
    {
        $this->actingAs($seller)->from('/seller/dashboard?section=forecasting')
            ->post('/seller/planting-plans', [...['crop' => 'Pechay', 'planting_month' => '2026-10'], ...$extra])
            ->assertRedirect('/seller/dashboard?section=forecasting')->assertSessionHasNoErrors();
    }

    public function test_dates_and_owner_are_derived_from_the_sellers_recommendation(): void
    {
        $seller = $this->sellerWithForecast();
        $other = User::factory()->seller()->create();
        $this->savePlan($seller, ['user_id' => $other->id, 'harvest_month' => '2099-01', 'days_to_harvest' => 999]);

        $this->assertDatabaseHas('planting_plans', [
            'user_id' => $seller->id, 'crop' => 'Pechay', 'planting_month' => CarbonImmutable::parse('2026-10-01'),
            'harvest_month' => CarbonImmutable::parse('2026-11-01'), 'days_to_harvest' => 30,
        ]);
        $this->assertDatabaseMissing('planting_plans', ['user_id' => $other->id]);
    }

    public function test_repeated_saves_create_one_plan_and_dates_survive_forecast_removal_and_month_change(): void
    {
        $seller = $this->sellerWithForecast();
        $this->savePlan($seller);
        $this->savePlan($seller);
        $this->assertDatabaseCount('planting_plans', 1);

        $seller->forecastRuns()->delete();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-12-01', 'Asia/Manila'));
        $this->get('/seller/dashboard?section=forecasting')->assertInertia(fn (Assert $page) => $page
            ->where('forecastData', null)->has('plantingPlans', 1)
            ->where('plantingPlans.0.crop', 'Pechay')->where('plantingPlans.0.planting_month', '2026-10')
            ->where('plantingPlans.0.harvest_month', '2026-11')->where('plantingPlans.0.days_to_harvest', 30));
    }

    public function test_dashboard_shows_only_the_signed_in_sellers_plan(): void
    {
        $seller = $this->sellerWithForecast();
        $this->savePlan($seller);
        $other = User::factory()->seller()->create();
        $this->actingAs($other)->get('/seller/dashboard?section=forecasting')
            ->assertInertia(fn (Assert $page) => $page->has('plantingPlans', 0));
        $this->actingAs($seller)->get('/seller/dashboard?section=forecasting')
            ->assertInertia(fn (Assert $page) => $page->has('plantingPlans', 1)
                ->missing('plantingPlans.0.user_id')->missing('plantingPlans.0.created_at'));
    }

    public function test_a_new_planting_month_can_have_a_separate_plan_for_the_same_crop(): void
    {
        $seller = $this->sellerWithForecast();
        $this->savePlan($seller);
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-12-01', 'Asia/Manila'));
        $this->savePlan($seller, ['planting_month' => '2026-12']);
        $this->assertDatabaseCount('planting_plans', 2);
        $this->get('/seller/dashboard?section=forecasting')->assertInertia(fn (Assert $page) => $page
            ->where('plantingPlans.0.planting_month', '2026-12')->where('plantingPlans.0.harvest_month', '2027-01')
            ->where('plantingPlans.1.planting_month', '2026-10')->where('plantingPlans.1.harvest_month', '2026-11'));
    }

    public function test_a_seller_can_remove_their_plan_but_cannot_remove_another_sellers_plan(): void
    {
        $seller = $this->sellerWithForecast();
        $this->savePlan($seller);
        $plan = $seller->plantingPlans()->first();
        $this->actingAs(User::factory()->seller()->create())->delete("/seller/planting-plans/{$plan->id}")->assertNotFound();
        $this->assertDatabaseCount('planting_plans', 1);
        $this->actingAs($seller)->from('/seller/dashboard?section=forecasting')
            ->delete("/seller/planting-plans/{$plan->id}")->assertRedirect('/seller/dashboard?section=forecasting');
        $this->assertDatabaseCount('planting_plans', 0);
    }

    public function test_missing_forecasts_and_unrecommended_crops_cannot_be_saved(): void
    {
        $this->actingAs(User::factory()->seller()->create())
            ->post('/seller/planting-plans', ['crop' => 'Pechay', 'planting_month' => '2026-10'])->assertSessionHasErrors('crop');
        $seller = $this->sellerWithForecast();
        $this->actingAs($seller)->post('/seller/planting-plans', ['crop' => 'Unknown crop', 'planting_month' => '2026-10'])
            ->assertSessionHasErrors('crop');
        $this->assertDatabaseCount('planting_plans', 0);
    }

    public function test_stale_and_invalid_planting_months_are_rejected_with_translated_errors(): void
    {
        $this->actingAs($this->sellerWithForecast())
            ->post('/seller/planting-plans', ['crop' => 'Pechay', 'planting_month' => '2026-09', 'language' => 'filipino'])
            ->assertSessionHasErrors(['planting_month' => 'Nagbago na ang buwan ng pagtatanim. I-refresh ang pahina at pumili muli.']);
        foreach (['2026-13', 'October 2026', null] as $month) {
            $this->post('/seller/planting-plans', ['crop' => 'Pechay', 'planting_month' => $month])->assertSessionHasErrors('planting_month');
        }
        $this->post('/seller/planting-plans', ['planting_month' => '2026-10', 'language' => 'filipino'])
            ->assertSessionHasErrors(['crop' => 'Pumili ng mungkahing pananim.']);
        $this->assertDatabaseCount('planting_plans', 0);
    }

    public function test_guest_and_customer_cannot_save_or_remove_plans(): void
    {
        $seller = $this->sellerWithForecast();
        $this->savePlan($seller);
        $id = $seller->plantingPlans()->first()->id;
        auth()->logout();
        $this->post('/seller/planting-plans')->assertRedirect('/login');
        $this->delete("/seller/planting-plans/{$id}")->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->post('/seller/planting-plans')->assertForbidden();
        $this->delete("/seller/planting-plans/{$id}")->assertForbidden();
        $this->assertDatabaseCount('planting_plans', 1);
    }

    public function test_suspended_sellers_cannot_manage_plans(): void
    {
        $seller = $this->sellerWithForecast();
        $this->savePlan($seller);
        $id = $seller->plantingPlans()->first()->id;
        $seller->forceFill(['account_status' => AccountStatus::Suspended])->save();
        $this->actingAs($seller)->post('/seller/planting-plans')->assertRedirect('/login');
        $this->actingAs($seller)->delete("/seller/planting-plans/{$id}")->assertRedirect('/login');
        $this->assertDatabaseCount('planting_plans', 1);
    }
}
