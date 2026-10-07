<?php

namespace App\Services;

use App\Models\User;
use Carbon\CarbonImmutable;

class ForecastRecommendationService
{
    public function __construct(private ForecastSellingActivityService $sellingActivity) {}

    public function recommend(array $result, ?CarbonImmutable $plantingDate = null, ?User $seller = null): array
    {
        $plantingDate ??= CarbonImmutable::now('Asia/Manila');
        $plantingMonth = $plantingDate->startOfMonth();
        $metadata = json_decode(file_get_contents(storage_path('app/forecasting/crop_metadata.json')), true);
        $tolerances = json_decode(file_get_contents(storage_path('app/forecasting/crop_weather_tolerance.json')), true);
        $scored = [];
        $sellingContext = $seller ? $this->sellingActivity->context($seller, $result['dataset'] ?? [], $plantingDate) : null;

        foreach ($result['crops'] as $crop => &$details) {
            $details['metadata'] = $metadata[$crop] ?? null;
            $meta = $details['metadata'];
            if (! $meta || ! ($meta['recommendable'] ?? true)) {
                continue;
            }

            $offset = (int) round($meta['days_to_harvest'] / 30);
            // Trees requiring more than a year are retained in the calendar,
            // but cannot be presented as a short-term planting choice.
            if ($offset > 12) {
                continue;
            }
            $harvestMonth = $plantingMonth->addMonths($offset)->format('Y-m');
            $point = collect($details['forecast'])->firstWhere('month', $harvestMonth);
            $maxHarvest = collect($details['forecast'])->max('value');
            $usesFarmHistory = $details['status'] === 'success' && $point !== null;
            if ($usesFarmHistory) {
                $strength = $maxHarvest > 0 ? $point['value'] / $maxHarvest : 0;
            } else {
                $profile = $details['annual_profile_index'] ?? [];
                $monthIndex = (int) substr($harvestMonth, 5, 2) - 1;
                if (! array_key_exists($monthIndex, $profile)) {
                    continue;
                }
                $strength = $profile[$monthIndex];
            }

            // Seasonal weighting, not a months-ahead weather prediction.
            // June–November: 70% rain; March–May: 70% heat; otherwise balanced.
            $rainWeight = 0;
            for ($month = 0; $month <= $offset; $month++) {
                $number = $plantingMonth->addMonths($month)->month;
                $rainWeight += $number >= 6 && $number <= 11 ? 0.7 : ($number >= 3 && $number <= 5 ? 0.3 : 0.5);
            }
            $rainWeight /= $offset + 1;
            $tolerance = $tolerances[$crop] ?? ['rain' => 5, 'heat' => 5];
            $weatherScore = $tolerance['rain'] * $rainWeight + $tolerance['heat'] * (1 - $rainWeight);
            $baseScore = 6 * $strength + 0.4 * $weatherScore;
            $selling = $this->sellingActivity->forCrop($sellingContext, $crop, $harvestMonth);
            $sellingAdjustment = $selling['score'] === null ? 0 : ($selling['score'] - 5) / 5;
            // Selling activity cannot add a bonus to an off-season choice.
            if ($strength < 0.4) {
                $sellingAdjustment = min(0, $sellingAdjustment);
            }
            $scored[] = [
                'crop' => $crop,
                'score' => round(max(0, min(10, $baseScore + $sellingAdjustment)), 2),
                'base_score' => round($baseScore, 2),
                'selling_adjustment' => round($sellingAdjustment, 2),
                'selling_activity' => $selling,
                'harvest_month' => $harvestMonth,
                'days_to_harvest' => $meta['days_to_harvest'],
                'growth_class' => $meta['growth_class'],
                'season_strength' => $strength,
                'season' => $strength >= 0.7 ? 'peak' : ($strength >= 0.4 ? 'okay' : 'low'),
                'weather_score' => round($weatherScore, 2),
                'weather_focus' => $rainWeight > 0.55 ? 'rain' : ($rainWeight < 0.45 ? 'heat' : 'balanced'),
                'weather_tolerance' => $tolerance,
                'rain_weight' => round($rainWeight, 4),
                'source' => $usesFarmHistory ? (($result['dataset']['scope'] ?? null) === 'barangay' ? 'barangay_history' : 'farm_history') : 'area_profile',
                'outside_forecast_horizon' => $details['status'] === 'success' && ! $usesFarmHistory,
                'new_crop' => $details['status'] === 'new_crop',
                'forecast' => $usesFarmHistory ? $point : null,
            ];
        }
        unset($details);

        usort($scored, fn (array $a, array $b): int => ($b['score'] <=> $a['score']) ?: strcmp($a['crop'], $b['crop']));
        $recommendations = [];
        $newCrops = 0;
        foreach ($scored as $candidate) {
            if ($candidate['new_crop'] && $newCrops >= 2) {
                continue;
            }
            $recommendations[] = $candidate;
            $newCrops += (int) $candidate['new_crop'];
            if (count($recommendations) === 3) {
                break;
            }
        }

        return [...$result, 'planting_month' => $plantingMonth->format('Y-m'),
            'recommendations' => $recommendations, 'weather_basis' => 'seasonal'];
    }
}
