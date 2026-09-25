<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use App\Services\WeatherService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class AdminWeatherTest extends TestCase
{
    use RefreshDatabase;

    public function test_cenro_dashboard_receives_the_shared_pasig_weather_forecast(): void
    {
        $this->withoutVite();
        $weather = [
            'provider' => 'open_meteo',
            'location' => 'Pasig City',
            'temperature_c' => 29.4,
            'humidity_percent' => 78,
            'rain_chance_percent' => 45,
            'hourly' => [],
            'daily' => [],
            'is_stale' => false,
        ];
        $service = Mockery::mock(WeatherService::class);
        $service->shouldReceive('current')->once()->andReturn($weather);
        $this->app->instance(WeatherService::class, $service);
        $admin = User::factory()->create(['role' => UserRole::CenroAdmin]);

        $this->actingAs($admin)->get('/admin/dashboard')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Dashboard')
                ->where('weather.provider', 'open_meteo')
                ->where('weather.location', 'Pasig City')
                ->where('weather.temperature_c', 29.4)
                ->where('weather.rain_chance_percent', 45));
    }
}
