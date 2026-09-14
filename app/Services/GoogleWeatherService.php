<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class GoogleWeatherService
{
    /**
     * Return normalized current conditions with a 24-hour and 10-day outlook.
     *
     * @return array<string, mixed>|null
     */
    public function current(): ?array
    {
        $apiKey = trim((string) config('services.google_weather.api_key'));

        if (! config('services.google_weather.enabled', false) || $apiKey === '') {
            return null;
        }

        $freshKey = $this->cacheKey('fresh');
        $staleKey = $this->cacheKey('last-good');
        $fresh = Cache::get($freshKey);

        if (is_array($fresh)) {
            return [...$fresh, 'is_stale' => false];
        }

        try {
            $parameters = [
                'key' => $apiKey,
                'location.latitude' => config('services.google_weather.latitude'),
                'location.longitude' => config('services.google_weather.longitude'),
                'unitsSystem' => 'METRIC',
                'languageCode' => 'en',
            ];

            $current = $this->client()->get('/v1/currentConditions:lookup', $parameters)->throw()->json();
            $hourly = $this->optionalForecast('/v1/forecast/hours:lookup', [
                ...$parameters,
                'hours' => 24,
                'pageSize' => 24,
            ], 'forecastHours');
            $daily = $this->optionalForecast('/v1/forecast/days:lookup', [
                ...$parameters,
                'days' => 10,
                'pageSize' => 10,
            ], 'forecastDays');

            $weather = $this->normalize($current, $hourly, $daily);

            if ($weather === null) {
                throw new \UnexpectedValueException('Google Weather returned an incomplete current response.');
            }

            Cache::put($freshKey, $weather, now()->addMinutes((int) config('services.google_weather.cache_minutes', 30)));
            Cache::put($staleKey, $weather, now()->addMinutes((int) config('services.google_weather.stale_minutes', 60)));

            return [...$weather, 'is_stale' => false];
        } catch (Throwable $exception) {
            Log::warning('Google Weather request failed.', $this->safeFailureContext($exception));
            $stale = Cache::get($staleKey);

            return is_array($stale) ? [...$stale, 'is_stale' => true] : null;
        }
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()
            ->baseUrl(rtrim((string) config('services.google_weather.base_url'), '/'))
            ->timeout(5)
            ->retry(2, 250);
    }

    /**
     * Forecast detail enhances the card but must not hide valid current conditions.
     *
     * @param  array<string, mixed>  $parameters
     * @return array<int, mixed>
     */
    private function optionalForecast(string $endpoint, array $parameters, string $key): array
    {
        try {
            $payload = $this->client()->get($endpoint, $parameters)->throw()->json();

            return is_array(data_get($payload, $key)) ? data_get($payload, $key) : [];
        } catch (Throwable $exception) {
            Log::notice('Google Weather forecast detail request failed.', [
                'endpoint' => $endpoint,
                ...$this->safeFailureContext($exception),
            ]);

            return [];
        }
    }

    /**
     * @param  array<string, mixed>  $current
     * @param  array<int, mixed>  $hourly
     * @param  array<int, mixed>  $daily
     * @return array<string, mixed>|null
     */
    private function normalize(array $current, array $hourly, array $daily): ?array
    {
        $temperature = data_get($current, 'temperature.degrees');
        $humidity = data_get($current, 'relativeHumidity');
        $rainChance = data_get($current, 'precipitation.probability.percent');
        $observedAt = data_get($current, 'currentTime');
        $condition = data_get($current, 'weatherCondition.description.text');

        if (! is_numeric($temperature) || ! is_numeric($humidity) || ! is_numeric($rainChance)
            || ! is_string($observedAt) || $observedAt === '' || ! is_string($condition) || $condition === '') {
            return null;
        }

        $humidity = (int) round((float) $humidity);
        $rainChance = (int) round((float) $rainChance);

        if (! $this->validPercentage($humidity) || ! $this->validPercentage($rainChance)) {
            return null;
        }

        try {
            $observedAt = CarbonImmutable::parse($observedAt)
                ->setTimezone((string) config('services.google_weather.timezone', 'Asia/Manila'))
                ->toIso8601String();
        } catch (Throwable) {
            return null;
        }

        return [
            'provider' => 'google',
            'location' => (string) config('services.google_weather.location', 'Pasig City'),
            'observed_at' => $observedAt,
            'temperature_c' => round((float) $temperature, 1),
            'feels_like_c' => $this->numberOrNull(data_get($current, 'feelsLikeTemperature.degrees')),
            'humidity_percent' => $humidity,
            'rain_chance_percent' => $rainChance,
            'thunderstorm_chance_percent' => $this->percentageOrNull(data_get($current, 'thunderstormProbability')),
            'wind_kph' => $this->numberOrNull(data_get($current, 'wind.speed.value')),
            'condition' => $condition,
            'condition_key' => strtolower((string) data_get($current, 'weatherCondition.type', 'current')),
            'icon_url' => $this->iconUrl(data_get($current, 'weatherCondition.iconBaseUri')),
            'icon_url_dark' => $this->iconUrl(data_get($current, 'weatherCondition.iconBaseUri'), true),
            'hourly' => collect($hourly)->map(fn ($item) => $this->normalizeHour($item))->filter()->values()->all(),
            'daily' => collect($daily)->map(fn ($item) => $this->normalizeDay($item))->filter()->values()->all(),
        ];
    }

    /** @param array<string, mixed> $item */
    private function normalizeHour(array $item): ?array
    {
        $time = data_get($item, 'interval.startTime');
        $temperature = data_get($item, 'temperature.degrees');
        $rainChance = data_get($item, 'precipitation.probability.percent');
        $wind = data_get($item, 'wind.speed.value');

        if (! is_string($time) || ! is_numeric($temperature) || ! is_numeric($rainChance) || ! is_numeric($wind)) {
            return null;
        }

        return [
            'time' => CarbonImmutable::parse($time)->setTimezone((string) config('services.google_weather.timezone', 'Asia/Manila'))->toIso8601String(),
            'temperature_c' => round((float) $temperature, 1),
            'rain_chance_percent' => max(0, min(100, (int) round((float) $rainChance))),
            'wind_kph' => round((float) $wind, 1),
        ];
    }

    /** @param array<string, mixed> $item */
    private function normalizeDay(array $item): ?array
    {
        $year = data_get($item, 'displayDate.year');
        $month = data_get($item, 'displayDate.month');
        $day = data_get($item, 'displayDate.day');
        $maximum = data_get($item, 'maxTemperature.degrees');
        $minimum = data_get($item, 'minTemperature.degrees');
        $condition = data_get($item, 'daytimeForecast.weatherCondition.description.text');

        if (! is_numeric($year) || ! is_numeric($month) || ! is_numeric($day)
            || ! is_numeric($maximum) || ! is_numeric($minimum) || ! is_string($condition)) {
            return null;
        }

        $dayRain = $this->percentageOrNull(data_get($item, 'daytimeForecast.precipitation.probability.percent')) ?? 0;
        $nightRain = $this->percentageOrNull(data_get($item, 'nighttimeForecast.precipitation.probability.percent')) ?? 0;

        return [
            'date' => sprintf('%04d-%02d-%02d', $year, $month, $day),
            'max_temperature_c' => round((float) $maximum, 1),
            'min_temperature_c' => round((float) $minimum, 1),
            'rain_chance_percent' => max($dayRain, $nightRain),
            'condition' => $condition,
            'condition_key' => strtolower((string) data_get($item, 'daytimeForecast.weatherCondition.type', 'current')),
            'icon_url' => $this->iconUrl(data_get($item, 'daytimeForecast.weatherCondition.iconBaseUri')),
            'icon_url_dark' => $this->iconUrl(data_get($item, 'daytimeForecast.weatherCondition.iconBaseUri'), true),
        ];
    }

    private function numberOrNull(mixed $value): ?float
    {
        return is_numeric($value) ? round((float) $value, 1) : null;
    }

    private function percentageOrNull(mixed $value): ?int
    {
        if (! is_numeric($value)) {
            return null;
        }

        $value = (int) round((float) $value);

        return $this->validPercentage($value) ? $value : null;
    }

    private function validPercentage(int $value): bool
    {
        return $value >= 0 && $value <= 100;
    }

    private function iconUrl(mixed $baseUrl, bool $dark = false): ?string
    {
        if (! is_string($baseUrl) || ! str_starts_with($baseUrl, 'https://maps.gstatic.com/weather/')) {
            return null;
        }

        return $baseUrl.($dark ? '_dark.svg' : '.svg');
    }

    /** @return array{exception: string, status: int|null} */
    private function safeFailureContext(Throwable $exception): array
    {
        return [
            'exception' => $exception::class,
            'status' => $exception instanceof RequestException ? $exception->response->status() : null,
        ];
    }

    private function cacheKey(string $suffix): string
    {
        $latitude = config('services.google_weather.latitude');
        $longitude = config('services.google_weather.longitude');

        return "weather:google:v2:{$latitude}:{$longitude}:{$suffix}";
    }
}
