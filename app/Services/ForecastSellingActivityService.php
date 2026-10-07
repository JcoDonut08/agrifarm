<?php

namespace App\Services;

use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use Carbon\CarbonImmutable;

class ForecastSellingActivityService
{
    public function context(User $seller, array $dataset, CarbonImmutable $asOf): array
    {
        $barangay = trim((string) (($dataset['scope'] ?? null) === 'barangay' ? ($dataset['barangay'] ?? '') : $seller->barangay));
        $scope = $barangay !== '' ? 'barangay' : 'seller';
        $orders = WalkInOrder::query()->where('status', 'delivered')->where('quantity', '>', 0);
        $products = Product::query();
        foreach ([$orders, $products] as $query) {
            if ($scope === 'barangay') {
                $query->whereHas('seller', fn ($user) => $user->where('role', 'seller')->where('barangay', $barangay));
            } else {
                $query->where('user_id', $seller->id);
            }
        }

        return [
            'scope' => $scope, 'barangay' => $barangay ?: null, 'as_of' => $asOf,
            // Orders use their placement date; no completion-date column exists.
            'orders' => $orders->whereBetween('created_at', [$asOf->startOfMonth()->subMonths(24)->utc(), $asOf->utc()])
                ->get(['id', 'user_id', 'customer_checkout_id', 'product_name', 'quantity', 'unit', 'created_at'])
                ->groupBy(fn ($order) => $this->cropKey($order->product_name)),
            'stock' => $products->where('stock', '>', 0)->get(['name', 'stock', 'unit'])
                ->groupBy(fn ($product) => $this->cropKey($product->name)),
        ];
    }

    public function forCrop(?array $context, string $crop, string $harvestMonth): array
    {
        $signal = ['scope' => $context['scope'] ?? null, 'barangay' => $context['barangay'] ?? null,
            'basis' => 'recent', 'level' => 'limited', 'score' => null, 'order_count' => 0,
            'periods' => [], 'sold' => [], 'stock' => [], 'stock_pressure' => false];
        if ($context === null) {
            return $signal;
        }

        $asOf = $context['as_of'];
        $key = $this->cropKey($crop);
        $records = $context['orders']->get($key, collect());
        $monthNumber = (int) substr($harvestMonth, 5, 2);
        $seasonal = $records->filter(fn ($record) => $record->created_at->setTimezone('Asia/Manila')->month === $monthNumber
            && $record->created_at->setTimezone('Asia/Manila')->format('Y-m') < $asOf->format('Y-m'));
        $years = $seasonal->map(fn ($record) => $record->created_at->setTimezone('Asia/Manila')->year)->unique();
        $useSeasonal = $years->count() >= 2 && $this->orderCount($seasonal) >= 3;
        $start = $asOf->subDays(90);
        $selected = $useSeasonal ? $seasonal : $records->filter(fn ($record) => $record->created_at >= $start->utc());
        $count = $this->orderCount($selected);
        $days = $selected->map(fn ($record) => $record->created_at->setTimezone('Asia/Manila')->format('Y-m-d'))->unique()->count();
        $signal['basis'] = $useSeasonal ? 'harvest_month' : 'recent';
        $signal['order_count'] = $count;
        $signal['periods'] = $useSeasonal
            ? $selected->map(fn ($record) => $record->created_at->setTimezone('Asia/Manila')->format('Y-m'))->unique()->sort()->values()->all()
            : [['from' => $start->toDateString(), 'to' => $asOf->toDateString()]];
        $sold = $this->quantities($selected, 'quantity');
        $stock = $this->quantities($context['stock']->get($key, collect()), 'stock');
        $signal['sold'] = $sold;
        $signal['stock'] = $stock;
        // Sparse records provide context, never a zero-demand penalty.
        if ($count < 3 || $days < 2) {
            return $signal;
        }

        // A transparent heuristic: five completed orders per month reaches 10.
        // Frequency counts receipts, so kg/pieces/bunches are never added together.
        $score = min(10, 2 * $count / ($useSeasonal ? $years->count() : 3));
        if (! $useSeasonal) {
            foreach ($sold as $unit => $quantity) {
                if (($stock[$unit] ?? 0) > $quantity) {
                    $signal['stock_pressure'] = true;
                    break;
                }
            }
            // Current stock is a separate caution, not historical sell-through.
            $score = max(0, $score - ($signal['stock_pressure'] ? 2 : 0));
        }
        $signal['score'] = round($score, 2);
        $signal['level'] = $score >= 7 ? 'regular' : ($score >= 3 ? 'some' : 'few');

        return $signal;
    }

    private function cropKey(string $name): string
    {
        return mb_strtolower(preg_replace('/\s+/u', ' ', trim($name)));
    }

    private function orderCount($records): int
    {
        return $records->map(fn ($record) => $record->customer_checkout_id !== null
            ? 'checkout:'.$record->user_id.':'.$record->customer_checkout_id : 'walk-in:'.$record->id)->unique()->count();
    }

    private function quantities($records, string $field): array
    {
        $totals = [];
        foreach ($records as $record) {
            $unit = mb_strtolower(trim($record->unit));
            $unit = ['bunches' => 'bunch', 'pieces' => 'piece', 'heads' => 'head', 'packs' => 'pack'][$unit] ?? $unit;
            if ($unit === '') {
                continue;
            }
            $totals[$unit] = ($totals[$unit] ?? 0) + (float) $record->{$field};
        }
        ksort($totals);

        return $totals;
    }
}
