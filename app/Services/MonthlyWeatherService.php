<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use JsonException;

class MonthlyWeatherService
{
    public function __construct(private CropGrowingRequirementsService $requirements) {}

    public function outlook(?CarbonImmutable $date = null): array
    {
        $date ??= CarbonImmutable::now('Asia/Manila');
        $empty = ['status' => 'unavailable', 'current_month' => $date->format('Y-m'), 'forecast' => []];
        $data = null;
        foreach (config('services.monthly_weather.paths', [storage_path('app/private/monthly_weather/outlook.json'), storage_path('app/forecasting/monthly_weather_outlook.json')]) as $path) {
            if (! is_file($path)) {
                continue;
            }
            try {
                $candidate = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
            } catch (JsonException) {
                continue;
            }
            if ($this->valid($candidate) && ($data === null || [$candidate['forecast_origin'], $candidate['source']['as_of']] > [$data['forecast_origin'], $data['source']['as_of']])) {
                $data = $candidate;
            }
        }
        if ($data === null) {
            return $empty;
        }
        $expectedOrigin = $date->startOfMonth()->subMonth()->format('Y-m');
        $remaining = array_values(array_filter($data['forecast'], fn (array $point): bool => $point['month'] >= $date->format('Y-m')));
        $coversCurrentMonth = collect($remaining)->contains('month', $date->format('Y-m'));

        return [...$data, 'current_month' => $date->format('Y-m'),
            'forecast' => $remaining, 'refresh_recommended' => $data['forecast_origin'] !== $expectedOrigin,
            'status' => $coversCurrentMonth && $data['source']['as_of'] <= $date->toDateString() ? 'ready' : 'outdated'];
    }

    public function advice(string $crop, string $month, array $outlook): array
    {
        $result = ['month' => $month, 'crop' => $crop, 'status' => 'unavailable', 'messages' => [], 'source' => null,
            'condition' => null, 'preparation' => null, 'weather' => null];
        if (($outlook['status'] ?? null) !== 'ready') {
            return $result;
        }
        $point = collect($outlook['forecast'])->firstWhere('month', $month);
        if ($point === null) {
            return $result;
        }
        $comparison = round($point['rainfall_total_mm'], 1) <=> round($point['reference_rainfall_mm'], 1);
        $condition = match ($comparison) {
            1 => ['en' => 'More rain than usual is expected this month.', 'fil' => 'Mas maraming ulan kaysa karaniwan ang inaasahan sa buwang ito.'],
            -1 => ['en' => 'Less rain than usual is expected this month.', 'fil' => 'Mas kaunting ulan kaysa karaniwan ang inaasahan sa buwang ito.'],
            default => ['en' => 'Rainfall around the usual amount is expected this month.', 'fil' => 'Karaniwang dami ng ulan ang inaasahan sa buwang ito.'],
        };
        $result = [...$result, 'condition' => $condition, 'weather' => $point, 'reference_period' => $outlook['reference_period']];
        $guide = $this->requirements->forCrop($crop);
        $rules = json_decode(file_get_contents(storage_path('app/forecasting/crop_monthly_weather_rules.json')), true, 512, JSON_THROW_ON_ERROR);
        $rule = $guide ? ($rules['crops'][$guide['crop']] ?? null) : null;
        $result['source'] = $guide['source'] ?? null;
        $result['preparation'] = $rule['preparation'] ?? $guide['requirements']['water'] ?? $guide['requirements']['soil'] ?? null;
        if ($rule === null) {
            return [...$result, 'status' => 'not_assessed'];
        }
        $messages = [];
        $rain = $point['rainfall_total_mm'];
        $reference = $point['reference_rainfall_mm'];
        $field = $comparison > 0 ? ($rule['drainage_field'] ?? null) : ($comparison < 0 ? ($rule['water_field'] ?? null) : null);
        if ($field !== null && isset($guide['requirements'][$field])) {
            $higher = $rain > $reference;
            $messages[] = [
                'rule' => $higher ? 'review_drainage' : 'review_water_supply',
                'en' => sprintf('Estimated rainfall: %.1f mm; reference average: %.1f mm. %s', $rain, $reference,
                    $higher ? 'Review drainage for this planting month.' : 'Review water supply and soil moisture for this planting month.'),
                'fil' => sprintf('Tantyang ulan: %.1f mm; karaniwang sanggunian: %.1f mm. %s', $rain, $reference,
                    $higher ? 'Suriin ang daluyan ng tubig para sa buwang ito ng pagtatanim.' : 'Suriin ang patubig at halumigmig ng lupa para sa buwang ito ng pagtatanim.'),
                'guidance' => $guide['requirements'][$field],
            ];
        }
        if (isset($rule['daily_mean_temperature_range_c'])) {
            [$low, $high] = $rule['daily_mean_temperature_range_c'];
            $temperature = $point['temperature_mean_c'];
            if ($temperature < $low || $temperature > $high) {
                $messages[] = ['rule' => 'review_temperature',
                    'en' => sprintf('Estimated monthly mean: %.1f°C; the guide describes daily averages of %s–%s°C. Check the variety and growing conditions with CENRO.', $temperature, $low, $high),
                    'fil' => sprintf('Tantyang buwanang temperatura: %.1f°C; %s–%s°C ang pang-araw-araw na average sa gabay. Tiyakin ang barayti at kondisyon ng taniman sa CENRO.', $temperature, $low, $high),
                    'guidance' => $guide['requirements'][$rule['temperature_field']],
                ];
            }
        }

        $hasWeatherRule = isset($rule['drainage_field']) || isset($rule['water_field']) || isset($rule['daily_mean_temperature_range_c']);

        return [...$result, 'status' => $messages ? 'precautions' : ($hasWeatherRule ? 'no_trigger' : 'not_assessed'), 'messages' => $messages,
            'source' => $guide['source'], 'reference_period' => $outlook['reference_period']];
    }

    private function valid(mixed $data): bool
    {
        if (! is_array($data) || ($data['schema_version'] ?? null) !== 1 || ($data['method'] ?? null) !== 'SARIMA'
            || ! is_string($data['forecast_origin'] ?? null) || ! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $data['forecast_origin'])
            || ($data['source']['history_end'] ?? null) !== $data['forecast_origin']
            || ! is_string($data['reference_period'] ?? null) || ! is_string($data['source']['as_of'] ?? null)
            || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['source']['as_of'])
            || ! is_string($data['source']['history_start'] ?? null) || ! is_string($data['source']['documentation_url'] ?? null)
            || ! is_string($data['test_period'] ?? null) || ! is_numeric($data['source']['grid_latitude'] ?? null)
            || ! is_numeric($data['source']['grid_longitude'] ?? null)
            || ! is_array($data['forecast'] ?? null) || ! array_is_list($data['forecast']) || count($data['forecast']) !== 3) {
            return false;
        }
        foreach ($data['forecast'] as $index => $point) {
            $expected = CarbonImmutable::createFromFormat('!Y-m', $data['forecast_origin'], 'Asia/Manila')->addMonths($index + 1)->format('Y-m');
            if (($point['month'] ?? null) !== $expected) {
                return false;
            }
            foreach (['temperature_mean_c', 'rainfall_total_mm', 'reference_rainfall_mm'] as $field) {
                if (! is_numeric($point[$field] ?? null) || ! is_finite((float) $point[$field])
                    || ($field !== 'temperature_mean_c' && $point[$field] < 0)) {
                    return false;
                }
            }
        }
        foreach (['temperature_mean_c', 'rainfall_total_mm'] as $target) {
            foreach (['sarima', 'seasonal_naive', 'monthly_average'] as $method) {
                foreach (['mae', 'rmse'] as $metric) {
                    $value = $data['evaluation'][$target]['test'][$method][$metric] ?? null;
                    if (! is_numeric($value) || ! is_finite((float) $value) || $value < 0) {
                        return false;
                    }
                }
            }
        }

        return true;
    }
}
