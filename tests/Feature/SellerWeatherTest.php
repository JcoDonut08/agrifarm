<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use App\Services\GoogleWeatherService;
use App\Services\OpenMeteoWeatherService;
use App\Services\WeatherService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SellerWeatherTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.google_weather.enabled' => false,
            'services.google_weather.api_key' => null,
            'services.google_weather.base_url' => 'https://weather.googleapis.test',
            'services.google_weather.location' => 'Pasig City',
            'services.google_weather.latitude' => 14.5764,
            'services.google_weather.longitude' => 121.0851,
            'services.google_weather.timezone' => 'Asia/Manila',
            'services.google_weather.cache_minutes' => 30,
            'services.google_weather.stale_minutes' => 60,
            'services.open_meteo.enabled' => true,
            'services.open_meteo.base_url' => 'https://api.open-meteo.test',
            'services.open_meteo.location' => 'Pasig City',
            'services.open_meteo.latitude' => 14.5764,
            'services.open_meteo.longitude' => 121.0851,
            'services.open_meteo.timezone' => 'Asia/Manila',
            'services.open_meteo.cache_minutes' => 30,
            'services.open_meteo.stale_hours' => 6,
        ]);

        Cache::flush();
    }

    public function test_dashboard_receives_normalized_open_meteo_weather(): void
    {
        $this->withoutVite();
        Http::fake(['api.open-meteo.test/*' => Http::response($this->openMeteoPayload())]);
        $seller = User::factory()->create(['role' => UserRole::Seller]);

        $this->actingAs($seller)->get('/seller/dashboard')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Dashboard')
                ->where('weather.provider', 'open_meteo')
                ->where('weather.location', 'Pasig City')
                ->where('weather.observed_at', '2026-09-12T19:30:00+08:00')
                ->where('weather.temperature_c', 25.5)
                ->where('weather.feels_like_c', 29.1)
                ->where('weather.humidity_percent', 91)
                ->where('weather.rain_chance_percent', 61)
                ->where('weather.wind_kph', 8.4)
                ->where('weather.condition', 'Overcast')
                ->where('weather.is_stale', false)
                ->has('weather.hourly', 3)
                ->has('weather.daily', 2)
                ->missing('weather.current'));

        Http::assertSent(fn (Request $request) => str_starts_with($request->url(), 'https://api.open-meteo.test/v1/forecast?')
            && $request['timezone'] === 'Asia/Manila'
            && $request['forecast_days'] === 10
            && str_contains($request['current'], 'relative_humidity_2m')
            && str_contains($request['hourly'], 'precipitation_probability')
            && str_contains($request['daily'], 'temperature_2m_max'));
    }

    public function test_google_weather_is_the_primary_normalized_dashboard_provider(): void
    {
        $this->withoutVite();
        config([
            'services.google_weather.enabled' => true,
            'services.google_weather.api_key' => 'test-server-key',
        ]);
        Http::fake([
            'weather.googleapis.test/v1/currentConditions*' => Http::response($this->googleCurrentPayload()),
            'weather.googleapis.test/v1/forecast/hours*' => Http::response($this->googleHourlyPayload()),
            'weather.googleapis.test/v1/forecast/days*' => Http::response($this->googleDailyPayload()),
        ]);
        $seller = User::factory()->create(['role' => UserRole::Seller]);

        $this->actingAs($seller)->get('/seller/dashboard')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('weather.provider', 'google')
                ->where('weather.temperature_c', 29.2)
                ->where('weather.feels_like_c', 35.1)
                ->where('weather.humidity_percent', 83)
                ->where('weather.rain_chance_percent', 75)
                ->where('weather.thunderstorm_chance_percent', 80)
                ->where('weather.condition', 'Heavy thunderstorms')
                ->where('weather.icon_url', 'https://maps.gstatic.com/weather/v1/thunderstorms.svg')
                ->has('weather.hourly', 2)
                ->has('weather.daily', 2)
                ->missing('weather.raw'));

        Http::assertSentCount(3);
        Http::assertSent(fn (Request $request) => str_contains($request->url(), '/v1/forecast/days:lookup')
            && $request['days'] === 10
            && $request['pageSize'] === 10
            && $request['unitsSystem'] === 'METRIC');
    }

    public function test_open_meteo_is_used_when_google_current_conditions_fail(): void
    {
        config([
            'services.google_weather.enabled' => true,
            'services.google_weather.api_key' => 'test-server-key',
        ]);
        Http::fake([
            'weather.googleapis.test/*' => Http::response([], 503),
            'api.open-meteo.test/*' => Http::response($this->openMeteoPayload()),
        ]);

        $weather = app(WeatherService::class)->current();

        $this->assertSame('open_meteo', $weather['provider']);
        $this->assertFalse($weather['is_stale']);
        Http::assertSentCount(3);
    }

    public function test_fresh_open_meteo_weather_is_reused_without_another_provider_call(): void
    {
        Http::fake(['api.open-meteo.test/*' => Http::response($this->openMeteoPayload())]);
        $service = app(OpenMeteoWeatherService::class);

        $this->assertSame($service->current(), $service->current());
        Http::assertSentCount(1);
    }

    public function test_google_weather_is_cached_and_never_exposes_the_api_key(): void
    {
        config([
            'services.google_weather.enabled' => true,
            'services.google_weather.api_key' => 'test-server-key',
        ]);
        Http::fake([
            'weather.googleapis.test/v1/currentConditions*' => Http::response($this->googleCurrentPayload()),
            'weather.googleapis.test/v1/forecast/hours*' => Http::response($this->googleHourlyPayload()),
            'weather.googleapis.test/v1/forecast/days*' => Http::response($this->googleDailyPayload()),
        ]);
        $service = app(GoogleWeatherService::class);

        $first = $service->current();
        $second = $service->current();

        $this->assertSame($first, $second);
        $this->assertStringNotContainsString('test-server-key', json_encode($first, JSON_THROW_ON_ERROR));
        Http::assertSentCount(3);
    }

    public function test_last_successful_open_meteo_weather_is_returned_as_stale_after_failure(): void
    {
        Http::fakeSequence()
            ->push($this->openMeteoPayload())
            ->pushFailedConnection('The weather provider timed out.')
            ->pushFailedConnection('The weather provider timed out.');
        $service = app(OpenMeteoWeatherService::class);

        $fresh = $service->current();
        $this->travel(31)->minutes();
        $stale = $service->current();

        $this->assertFalse($fresh['is_stale']);
        $this->assertTrue($stale['is_stale']);
        $this->assertSame($fresh['temperature_c'], $stale['temperature_c']);
        Http::assertSentCount(3);
    }

    public function test_malformed_open_meteo_response_uses_the_unavailable_state(): void
    {
        Http::fake(['api.open-meteo.test/*' => Http::response([
            'current' => ['temperature_2m' => 25.5],
            'hourly' => [],
            'daily' => [],
        ])]);

        $this->assertNull(app(OpenMeteoWeatherService::class)->current());
    }

    public function test_last_successful_open_meteo_weather_expires_after_six_hours(): void
    {
        Http::fake(['api.open-meteo.test/*' => Http::response($this->openMeteoPayload())]);
        $service = app(OpenMeteoWeatherService::class);
        $service->current();

        $this->travel(361)->minutes();
        Http::fake(['api.open-meteo.test/*' => Http::failedConnection('The weather provider timed out.')]);

        $this->assertNull($service->current());
    }

    public function test_connection_failure_without_cached_weather_uses_the_unavailable_state(): void
    {
        Http::fake(['api.open-meteo.test/*' => Http::failedConnection('The weather provider timed out.')]);

        $this->assertNull(app(OpenMeteoWeatherService::class)->current());
        Http::assertSentCount(2);
    }

    /** @return array<string, mixed> */
    private function openMeteoPayload(): array
    {
        return [
            'timezone' => 'Asia/Manila',
            'current' => [
                'time' => '2026-09-12T19:30',
                'temperature_2m' => 25.5,
                'apparent_temperature' => 29.1,
                'relative_humidity_2m' => 91,
                'weather_code' => 3,
                'wind_speed_10m' => 8.4,
                'is_day' => 0,
            ],
            'hourly' => [
                'time' => ['2026-09-12T19:00', '2026-09-12T20:00', '2026-09-12T21:00'],
                'temperature_2m' => [25.5, 25.2, 25.0],
                'precipitation_probability' => [61, 64, 58],
                'weather_code' => [3, 61, 61],
                'wind_speed_10m' => [8.4, 7.8, 7.2],
            ],
            'daily' => [
                'time' => ['2026-09-12', '2026-09-13'],
                'weather_code' => [95, 61],
                'temperature_2m_max' => [31.0, 30.0],
                'temperature_2m_min' => [24.0, 25.0],
                'precipitation_probability_max' => [80, 70],
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function googleCurrentPayload(): array
    {
        return [
            'currentTime' => '2026-09-13T06:30:00Z',
            'weatherCondition' => [
                'iconBaseUri' => 'https://maps.gstatic.com/weather/v1/thunderstorms',
                'description' => ['text' => 'Heavy thunderstorms', 'languageCode' => 'en'],
                'type' => 'THUNDERSTORMS',
            ],
            'temperature' => ['degrees' => 29.2, 'unit' => 'CELSIUS'],
            'feelsLikeTemperature' => ['degrees' => 35.1, 'unit' => 'CELSIUS'],
            'relativeHumidity' => 83,
            'precipitation' => ['probability' => ['percent' => 75, 'type' => 'RAIN']],
            'thunderstormProbability' => 80,
            'wind' => ['speed' => ['value' => 5.0, 'unit' => 'KILOMETERS_PER_HOUR']],
        ];
    }

    /** @return array<string, mixed> */
    private function googleHourlyPayload(): array
    {
        return ['forecastHours' => [
            $this->googleHour('2026-09-13T07:00:00Z', 29.0, 75, 5.0),
            $this->googleHour('2026-09-13T08:00:00Z', 28.0, 70, 6.0),
        ]];
    }

    /** @return array<string, mixed> */
    private function googleHour(string $time, float $temperature, int $rain, float $wind): array
    {
        return [
            'interval' => ['startTime' => $time],
            'temperature' => ['degrees' => $temperature],
            'precipitation' => ['probability' => ['percent' => $rain]],
            'wind' => ['speed' => ['value' => $wind]],
        ];
    }

    /** @return array<string, mixed> */
    private function googleDailyPayload(): array
    {
        return ['forecastDays' => [
            $this->googleDay(2026, 9, 13, 31, 24, 80),
            $this->googleDay(2026, 9, 14, 32, 25, 70),
        ]];
    }

    /** @return array<string, mixed> */
    private function googleDay(int $year, int $month, int $day, float $maximum, float $minimum, int $rain): array
    {
        $condition = [
            'iconBaseUri' => 'https://maps.gstatic.com/weather/v1/thunderstorms',
            'description' => ['text' => 'Thunderstorms'],
            'type' => 'THUNDERSTORMS',
        ];

        return [
            'displayDate' => compact('year', 'month', 'day'),
            'maxTemperature' => ['degrees' => $maximum],
            'minTemperature' => ['degrees' => $minimum],
            'daytimeForecast' => [
                'weatherCondition' => $condition,
                'precipitation' => ['probability' => ['percent' => $rain]],
            ],
            'nighttimeForecast' => [
                'precipitation' => ['probability' => ['percent' => max(0, $rain - 10)]],
            ],
        ];
    }
}
