<?php

namespace App\Services;

use App\Models\HarvestRecord;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

class BarangayHarvestExportService
{
    public function prepare(array $selection): array
    {
        $from = CarbonImmutable::parse($selection['from']);
        $to = CarbonImmutable::parse($selection['to']);
        $records = HarvestRecord::query()->whereHas('seller', fn ($query) => $query
            ->where('role', 'seller')->where('barangay', $selection['barangay']))
            ->whereBetween('harvest_date', [$selection['from'], $selection['to']])
            ->orderBy('harvest_date')->orderBy('product_name')
            ->get(['product_name', 'quantity', 'unit', 'measured_weight_kg', 'harvest_date']);

        $issues = [];
        $totals = [];
        $names = [];
        $unitProblems = [];
        $invalidNames = false;
        $invalidQuantities = false;
        foreach ($records as $record) {
            $name = trim($record->product_name);
            // Case/spacing variants require correction, not an assumed crop mapping.
            $key = mb_strtolower(preg_replace('/\s+/u', ' ', $name));
            $names[$key][$record->product_name] = true;
            $invalidNames = $invalidNames || $name === '' || mb_strlen($name) > 100
                || (bool) preg_match('/^[=+@\-]/u', $name)
                || (bool) preg_match('/^[\t\r\n]/u', $record->product_name);
            if ($record->unit !== 'kg' && $record->measured_weight_kg === null) {
                $unitProblems[$record->unit] = ($unitProblems[$record->unit] ?? 0) + 1;

                continue;
            }
            $quantity = (float) ($record->unit === 'kg' ? $record->quantity : $record->measured_weight_kg);
            if (! is_finite($quantity) || $quantity < 0 || $quantity > 1000000 || ($record->unit !== 'kg' && $quantity <= 0)) {
                $invalidQuantities = true;

                continue;
            }
            $month = $record->harvest_date->format('Y-m');
            // Sum the recorded three-decimal kg quantities as integer grams.
            $totals[$month][$name] = ($totals[$month][$name] ?? 0) + (int) round($quantity * 1000);
            $invalidQuantities = $invalidQuantities || $totals[$month][$name] > 1000000000;
        }
        if ($records->isEmpty()) {
            $issues[] = ['code' => 'empty'];
        }
        if ($unitProblems) {
            $issues[] = ['code' => 'non_kg', 'units' => $unitProblems];
        }
        $variants = array_values(array_filter(array_map(fn ($values) => array_keys($values), $names), fn ($values) => count($values) > 1));
        if ($invalidNames || $variants) {
            $issues[] = ['code' => 'crop_names', 'variants' => $variants];
        }
        if ($invalidQuantities) {
            $issues[] = ['code' => 'quantity_limit'];
        }
        if (count($names) > 50) {
            $issues[] = ['code' => 'crop_limit'];
        }

        $rows = [];
        ksort($totals);
        foreach ($totals as $month => $crops) {
            ksort($crops);
            foreach ($crops as $crop => $grams) {
                $rows[] = [$month, $crop, number_format($grams / 1000, 3, '.', ''), $selection['barangay']];
            }
        }
        if (count($rows) > 20000) {
            $issues[] = ['code' => 'row_limit'];
        }
        $start = $records->first()?->harvest_date;
        $end = $records->last()?->harvest_date;
        if ($start && (($end->year - $start->year) * 12 + $end->month - $start->month + 1) > 600) {
            $issues[] = ['code' => 'date_span'];
        }
        $stream = fopen('php://temp', 'w+');
        fputcsv($stream, ['Month', 'Vegetable Crop', 'Harvest (kg)', 'Barangay'], ',', '"', '');
        foreach ($rows as $row) {
            fputcsv($stream, $row, ',', '"', '');
        }
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);
        if (strlen($csv) > 5 * 1024 * 1024) {
            $issues[] = ['code' => 'file_limit'];
        }

        return [
            'preview' => [
                'barangay' => $selection['barangay'], 'from' => $selection['from'], 'to' => $selection['to'],
                'record_start' => $start?->format('Y-m-d'), 'record_end' => $end?->format('Y-m-d'),
                'record_count' => $records->count(), 'row_count' => count($rows),
                'rows' => $rows,
                'month_count' => count($totals),
                'total_kg' => number_format(array_sum(array_map('array_sum', $totals)) / 1000, 3, '.', ''),
                'generated_at' => now()->toIso8601String(),
                'crops' => array_values(array_unique(array_map(fn ($record) => trim($record->product_name), $records->all()))),
                'partial_months' => array_values(array_unique(array_filter([
                    $from->day !== 1 ? $from->format('Y-m') : null,
                    $to->day !== $to->daysInMonth ? $to->format('Y-m') : null,
                ]))),
                'issues' => $issues, 'can_export' => $issues === [],
            ],
            'csv' => $csv,
            'filename' => 'agrifarm-'.Str::slug($selection['barangay']).'-harvest-'.$from->format('Y-m').'-to-'.$to->format('Y-m').'.csv',
        ];
    }
}
