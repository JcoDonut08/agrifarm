<?php

namespace App\Services;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Support\Collection;

class BarangayMonitoringService
{
    /**
     * Returns only actual seller, inventory, and order records.
     * Harvest logs and CENRO reports are intentionally empty until their
     * own persisted source exists; they are never inferred or forecast.
     */
    public function data(): array
    {
        $sellers = User::query()
            ->where('role', UserRole::Seller->value)
            ->where('account_status', AccountStatus::Active->value)
            ->whereNotNull('barangay')
            ->where('barangay', '!=', '')
            ->get(['id', 'name', 'barangay', 'avatar_url']);

        $barangays = $sellers->pluck('barangay')->unique()->sort()->values();
        $sellerIds = $sellers->pluck('id');
        $products = Product::query()->whereIn('user_id', $sellerIds)->get();
        $orders = WalkInOrder::query()->whereIn('user_id', $sellerIds)->get();
        $deliveredOrders = $orders->where('status', 'delivered');
        $reports = collect();
        $months = $this->months();

        $harvestRecords = \App\Models\HarvestRecord::query()->whereIn('user_id', $sellerIds)->get();
        $statusTable = $barangays->map(function (string $barangay) use ($sellers, $products, $orders, $deliveredOrders, $harvestRecords): array {
            $barangaySellers = $sellers->where('barangay', $barangay)->sortBy('name')->values();
            $sellerIds = $barangaySellers->pluck('id');
            $primarySeller = $barangaySellers->first();

            return [
                'name' => $barangay,
                'seller' => $primarySeller ? [
                    'name' => $primarySeller->name,
                    'photoUrl' => $primarySeller->avatar_url
                        ? route('admin.sellers.photo', $primarySeller)
                        : null,
                ] : null,
                'products' => $products->whereIn('user_id', $sellerIds)->count(),
                'harvest' => $harvestRecords->whereIn('user_id', $sellerIds)->count(),
                'sales' => (float) $deliveredOrders->whereIn('user_id', $sellerIds)->sum('total'),
                'demand' => (int) $orders->whereIn('user_id', $sellerIds)->sum('quantity'),
            ];
        })->values();

        $specificBarangayData = $barangays->mapWithKeys(function (string $barangay) use ($sellers, $products, $deliveredOrders, $months, $harvestRecords): array {
            $sellerIds = $sellers->where('barangay', $barangay)->pluck('id');
            $barangayProducts = $products->whereIn('user_id', $sellerIds);
            $barangayDeliveredOrders = $deliveredOrders->whereIn('user_id', $sellerIds);
            $barangayHarvestRecords = $harvestRecords->whereIn('user_id', $sellerIds);
            $productRows = $barangayProducts->map(function (Product $product) use ($barangayDeliveredOrders, $barangayHarvestRecords): array {
                $sold = (int) $barangayDeliveredOrders->where('product_id', $product->id)->sum('quantity');
                $harvested = (int) $barangayHarvestRecords->where('product_id', $product->id)->sum('quantity');

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'harvested' => $harvested,
                    'available' => (int) $product->stock,
                    'sold' => $sold,
                    'status' => $this->stockStatus($product),
                    'unit' => $product->unit,
                ];
            })->values();

            return [$barangay => [
                'overview' => [
                    'totalProducts' => $barangayProducts->count(),
                    'totalHarvest' => $barangayHarvestRecords->count(),
                    'totalSales' => (float) $barangayDeliveredOrders->sum('total'),
                    'activeReports' => 0,
                ],
                'products' => $productRows->all(),
                'salesTrend' => [
                    'labels' => $months->pluck('label')->all(),
                    'data' => $months->map(fn (array $month): float => (float) $barangayDeliveredOrders
                        ->filter(fn (WalkInOrder $order) => $order->created_at->format('Y-m') === $month['key'])
                        ->sum('total'))->all(),
                    'available' => $barangayDeliveredOrders->isNotEmpty(),
                ],
                'harvestTrend' => [
                    'labels' => $months->pluck('label')->all(),
                    'data' => $months->map(fn (array $month): int => (int) $barangayHarvestRecords
                        ->filter(fn (\App\Models\HarvestRecord $record) => $record->harvest_date->format('Y-m') === $month['key'])
                        ->count())->all(),
                    'available' => $barangayHarvestRecords->isNotEmpty(),
                ],
                'reports' => [],
            ]];
        })->all();

        return [
            'barangays' => $barangays->all(),
            'allBarangaysData' => [
                'overview' => [
                    'totalBarangays' => $barangays->count(),
                    'totalProducts' => $products->count(),
                    'totalSales' => (float) $deliveredOrders->sum('total'),
                ],
                'statusTable' => $statusTable->all(),
                'comparisonData' => [
                    'labels' => $statusTable->pluck('name')->all(),
                    'harvest' => $statusTable->pluck('harvest')->all(),
                    'sales' => $statusTable->pluck('sales')->all(),
                    'demand' => $statusTable->pluck('demand')->all(),
                ],
                'reports' => $reports->all(),
            ],
            'specificBarangayData' => $specificBarangayData,
            'dataAvailability' => ['harvest' => $harvestRecords->isNotEmpty(), 'reports' => false],
        ];
    }

    private function months(): Collection
    {
        return collect(range(1, 12))->map(function (int $monthNum): array {
            $month = now()->startOfYear()->addMonths($monthNum - 1);

            return ['key' => $month->format('Y-m'), 'label' => $month->format('M')];
        });
    }

    private function stockStatus(Product $product): string
    {
        if ($product->stock === 0) {
            return 'Sold Out';
        }

        return $product->stock <= $product->threshold ? 'Low Stock' : 'Sufficient';
    }
}
