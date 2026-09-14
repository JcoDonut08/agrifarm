<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class OpenMeteoWeatherService
{
    /** @return array<string, mixed>|null */
    public function current(): ?array
    {
        if (! config('services.open_meteo.enabled', true)) {
            return null;
        }

        $freshKey = $this->cacheKey('fresh');
        $staleKey = $this->cacheKey('last-good');
        $fresh = Cache::get($freshKey);

        if (is_array($fresh)) {
            return [...$fresh, 'is_stale' => false];
        }

        try {
            $response = Http::acceptJson()
                ->baseUrl(rtrim((string) config('services.open_meteo.base_url'), '/'))
                ->timeout(5)
                ->retry(2, 250)
                ->get('/v1/forecast', [
                    'latitude' => config('services.open_meteo.latitude'),
                    'longitude' => config('services.open_meteo.longitude'),
                    'timezone' => config('services.open_meteo.timezone'),
                    'current' => 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
                    'hourly' => 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m',
                    'daily' => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
                    'forecast_days' => 10,
                ])->throw();

            $weather = $this->normalize($response->json());

            if ($weather === null) {
                throw new \UnexpectedValueException('Open-Meteo returned an incomplete weather response.');
            }

            Cache::put($freshKey, $weather, now()->addMinutes((int) config('services.open_meteo.cache_minutes', 30)));
            Cache::put($staleKey, $weather, now()->addHours((int) config('services.open_meteo.stale_hours', 6)));

            return [...$weather, 'is_stale' => false];
        } catch (Throwable $exception) {
            Log::warning('Open-Meteo weather request failed.', ['message' => $exception->getMessage()]);
            $stale = Cache::get($staleKey);

            return is_array($stale) ? [...$stale, 'is_stale' => true] : null;
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>|null
     */
    private function normalize(array $payload): ?array
    {
        $temperature = data_get($payload, 'current.temperature_2m');
        $humidity = data_get($payload, 'current.relative_humidity_2m');
        $weatherCode = data_get($payload, 'current.weather_code');
        $wind = data_get($payload, 'current.wind_speed_10m');
        $observedAt = data_get($payload, 'current.time');

        if (! is_numeric($temperature) || ! is_numeric($humidity) || ! is_numeric($weatherCode)
            || ! is_numeric($wind) || ! is_string($observedAt) || $observedAt === '') {
            return null;
        }

        $humidity = (int) round((float) $humidity);
        $weatherCode = (int) $weatherCode;

        if ($humidity < 0 || $humidity > 100) {
            return null;
        }

        try {
            $observed = CarbonImmutable::parse(
                $observedAt,
                (string) config('services.open_meteo.timezone', 'Asia/Manila')
            );
        } catch (Throwable) {
            return null;
        }

        $hours = $this->normalizeHours($payload, $observed);
        $rainChance = data_get($hours, '0.rain_chance_percent');

        if (! is_numeric($rainChance)) {
            return null;
        }

        return [
            'provider' => 'open_meteo',
            'location' => (string) config('services.open_meteo.location', 'Pasig City'),
            'observed_at' => $observed->toIso8601String(),
            'temperature_c' => round((float) $temperature, 1),
            'feels_like_c' => $this->numberOrNull(data_get($payload, 'current.apparent_temperature')),
            'humidity_percent' => $humidity,
            'rain_chance_percent' => (int) round((float) $rainChance),
            'thunderstorm_chance_percent' => null,
            'wind_kph' => round((float) $wind, 1),
            'condition' => $this->conditionFor($weatherCode),
            'condition_key' => $this->conditionKeyFor($weatherCode),
            'icon_url' => null,
            'icon_url_dark' => null,
            'hourly' => $hours,
            'daily' => $this->normalizeDays($payload),
        ];
    }

    /** @return array<int, array<string, float|int|string>> */
    private function normalizeHours(array $payload, CarbonImmutable $observed): array
    {
        $times = data_get($payload, 'hourly.time', []);
        $temperatures = data_get($payload, 'hourly.temperature_2m', []);
        $rainChances = data_get($payload, 'hourly.precipitation_probability', []);
        $winds = data_get($payload, 'hourly.wind_speed_10m', []);

        if (! is_array($times) || ! is_array($temperatures) || ! is_array($rainChances) || ! is_array($winds)) {
            return [];
        }

        $timezone = (string) config('services.open_meteo.timezone', 'Asia/Manila');
        $start = $observed->startOfHour();
        $hours = [];

        foreach ($times as $index => $time) {
            if (! is_string($time) || ! is_numeric($temperatures[$index] ?? null)
                || ! is_numeric($rainChances[$index] ?? null) || ! is_numeric($winds[$index] ?? null)) {
                continue;
            }

            try {
                $at = CarbonImmutable::parse($time, $timezone);
            } catch (Throwable) {
                continue;
            }

            if ($at->lessThan($start)) {
                continue;
            }

            $hours[] = [
                'time' => $at->toIso8601String(),
                'temperature_c' => round((float) $temperatures[$index], 1),
                'rain_chance_percent' => max(0, min(100, (int) round((float) $rainChances[$index]))),
                'wind_kph' => round((float) $winds[$index], 1),
            ];

            if (count($hours) === 24) {
                break;
            }
        }

        return $hours;
    }

    /** @return array<int, array<string, float|int|string|null>> */
    private function normalizeDays(array $payload): array
    {
        $times = data_get($payload, 'daily.time', []);
        $codes = data_get($payload, 'daily.weather_code', []);
        $maximums = data_get($payload, 'daily.temperature_2m_max', []);
        $minimums = data_get($payload, 'daily.temperature_2m_min', []);
        $rainChances = data_get($payload, 'daily.precipitation_probability_max', []);

        if (! is_array($times) || ! is_array($codes) || ! is_array($maximums)
            || ! is_array($minimums) || ! is_array($rainChances)) {
            return [];
        }

        $days = [];

        foreach (array_slice($times, 0, 8) as $index => $date) {
            if (! is_string($date) || ! is_numeric($codes[$index] ?? null)
                || ! is_numeric($maximums[$index] ?? null) || ! is_numeric($minimums[$index] ?? null)
                || ! is_numeric($rainChances[$index] ?? null)) {
                continue;
            }

            $code = (int) $codes[$index];
            $days[] = [
                'date' => $date,
                'max_temperature_c' => round((float) $maximums[$index], 1),
                'min_temperature_c' => round((float) $minimums[$index], 1),
                'rain_chance_percent' => max(0, min(100, (int) round((float) $rainChances[$index]))),
                'condition' => $this->conditionFor($code),
                'condition_key' => $this->conditionKeyFor($code),
                'icon_url' => null,
                'icon_url_dark' => null,
            ];
        }

        return $days;
    }

    private function numberOrNull(mixed $value): ?float
    {
        return is_numeric($value) ? round((float) $value, 1) : null;
    }

    private function conditionFor(int $code): string
    {
        return match ($code) {
            0 => 'Clear sky',
            1 => 'Mainly clear',
            2 => 'Partly cloudy',
            3 => 'Overcast',
            45, 48 => 'Foggy',
            51, 53, 55 => 'Drizzle',
            56, 57 => 'Freezing drizzle',
            61 => 'Light rain',
            63 => 'Moderate rain',
            65 => 'Heavy rain',
            66, 67 => 'Freezing rain',
            71, 73, 75, 77 => 'Snowfall',
            80 => 'Light rain showers',
            81 => 'Moderate rain showers',
            82 => 'Heavy rain showers',
            85, 86 => 'Snow showers',
            95 => 'Thunderstorm',
            96, 99 => 'Thunderstorm with hail',
            default => 'Current conditions',
        };
    }

    private function conditionKeyFor(int $code): string
    {
        return match (true) {
            $code === 0 => 'clear',
            in_array($code, [1, 2], true) => 'partly_cloudy',
            $code === 3 => 'cloudy',
            in_array($code, [45, 48], true) => 'fog',
            in_array($code, [95, 96, 99], true) => 'thunderstorm',
            in_array($code, [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], true) => 'rain',
            default => 'cloudy',
        };
    }

    private function cacheKey(string $suffix): string
    {
        $latitude = config('services.open_meteo.latitude');
        $longitude = config('services.open_meteo.longitude');

        return "weather:open-meteo:v2:{$latitude}:{$longitude}:{$suffix}";
    }
}
