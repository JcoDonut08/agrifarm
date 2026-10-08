<?php

namespace App\Services;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\AdminTask;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class AdminDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function data(User $administrator): array
    {
        $sellers = $this->partnerSellerQuery()
            ->whereNotNull('email_verified_at')
            ->withCount('products')
            ->withCount('walkInOrders')
            ->withCount([
                'walkInOrders as delivered_orders_count' => fn ($query) => $query->where('status', 'delivered'),
            ])
            ->withSum([
                'walkInOrders as delivered_sales' => fn ($query) => $query->where('status', 'delivered'),
            ], 'total')
            ->get();

        $sellerPerformance = $sellers
            ->sortByDesc(fn (User $seller) => [(float) $seller->delivered_sales, $seller->walk_in_orders_count])
            ->values();
        $sellerIds = $sellers->pluck('id');
        $leadingSeller = $sellerPerformance->first(fn (User $seller) => (float) $seller->delivered_sales > 0);

        return [
            'summary' => [
                'totalSales' => (float) WalkInOrder::query()
                    ->whereIn('user_id', $sellerIds)
                    ->where('status', 'delivered')
                    ->sum('total'),
                'activeSellers' => $sellers->count(),
                'totalOrders' => WalkInOrder::query()->whereIn('user_id', $sellerIds)->count(),
                'completedOrders' => WalkInOrder::query()
                    ->whereIn('user_id', $sellerIds)
                    ->where('status', 'delivered')
                    ->count(),
                'leadingBarangay' => $leadingSeller ? [
                    'name' => $this->barangayName($leadingSeller),
                    'sales' => (float) $leadingSeller->delivered_sales,
                ] : null,
            ],
            'barangays' => $sellerPerformance->map(fn (User $seller) => [
                'id' => $seller->id,
                'name' => $this->barangayName($seller),
                'sellerName' => $seller->name,
                'avatarUrl' => $this->sellerAvatarUrl($seller),
                'sales' => (float) ($seller->delivered_sales ?? 0),
                'orders' => $seller->walk_in_orders_count,
                'completedOrders' => $seller->delivered_orders_count,
                'products' => $seller->products_count,
            ])->all(),
            'monthlySales' => $this->monthlySales($sellers),
            'todo' => $this->adminTasks($administrator),
            'attention' => [
                'recentSellers' => $sellers->filter(fn (User $seller) => $seller->created_at->greaterThanOrEqualTo(now()->subDays(7)))->count(),
                'pendingOrders' => WalkInOrder::query()
                    ->whereIn('user_id', $sellerIds)
                    ->whereIn('status', ['pending', 'reservation'])
                    ->count(),
                'lowStockProducts' => Product::query()
                    ->whereIn('user_id', $sellerIds)
                    ->whereColumn('stock', '<=', 'threshold')
                    ->count(),
            ],
            'recentActivity' => $this->recentActivity($sellerIds),
        ];
    }

    /** @return array{months: array<int, array{key: string, label: string}>, series: array<int, array{name: string, sales: array<int, float>}>} */
    private function monthlySales(Collection $sellers): array
    {
        $months = collect(range(11, 0))->map(function (int $monthsAgo): array {
            $month = now()->startOfMonth()->subMonths($monthsAgo);

            return ['key' => $month->format('Y-m'), 'label' => $month->format('M')];
        });
        $orders = WalkInOrder::query()
            ->whereIn('user_id', $sellers->pluck('id'))
            ->where('status', 'delivered')
            ->where('created_at', '>=', now()->startOfMonth()->subMonths(11))
            ->get(['user_id', 'total', 'created_at']);

        $series = $sellers->groupBy(fn (User $seller) => $this->barangayName($seller))
            ->map(function (Collection $barangaySellers, string $name) use ($months, $orders): array {
                $sellerIds = $barangaySellers->pluck('id');
                $barangayOrders = $orders->whereIn('user_id', $sellerIds);

                return [
                    'name' => $name,
                    'sales' => $months->map(fn (array $month) => (float) $barangayOrders
                        ->filter(fn (WalkInOrder $order) => $order->created_at->format('Y-m') === $month['key'])
                        ->sum('total'))->all(),
                ];
            })->values()->all();

        return ['months' => $months->all(), 'series' => $series];
    }

    /** @return array<int, array<string, bool|int|string|null>> */
    private function adminTasks(User $administrator): array
    {
        return AdminTask::query()
            ->where('user_id', $administrator->id)
            ->orderBy('completed')
            ->orderBy('due_date')
            ->latest('id')
            ->get()
            ->map(fn (AdminTask $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'dueDate' => $task->due_date?->toDateString(),
                'completed' => $task->completed,
            ])->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function recentActivity(Collection $sellerIds): array
    {
        $orders = WalkInOrder::query()
            ->whereIn('user_id', $sellerIds)
            ->with(['seller:id,name', 'product:id,name,category,photo_path'])
            ->latest()
            ->limit(6)
            ->get()
            ->map(function (WalkInOrder $order) {
                $product = $order->product;
                if (! $product && $order->product_name) {
                    $product = Product::where('name', $order->product_name)->first(['id', 'name', 'category', 'photo_path']);
                }

                $photoUrl = $product?->photo_path
                    ? '/marketplace/products/'.$product->id.'/photo?v='.$product->photoVersion()
                    : null;

                return [
                    'id' => 'order-'.$order->id,
                    'type' => 'order',
                    'title' => $order->product_name.' order',
                    'detail' => ($order->seller?->name ?? 'Unknown seller').' · '.$this->statusLabel($order->status),
                    'occurredAt' => $order->created_at->toIso8601String(),
                    'image' => $photoUrl,
                    'status' => $order->status,
                    'category' => $product?->category,
                    'productName' => $order->product_name,
                ];
            });

        $products = Product::query()
            ->whereIn('user_id', $sellerIds)
            ->with('seller:id,name')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (Product $product) => [
                'id' => 'product-'.$product->id,
                'type' => 'product',
                'title' => $product->name.' listed',
                'detail' => ($product->seller?->name ?? 'Unknown seller').' · '.$product->stock.' in stock',
                'occurredAt' => $product->created_at->toIso8601String(),
                'image' => $product->photo_path ? '/marketplace/products/'.$product->id.'/photo?v='.$product->photoVersion() : null,
                'category' => $product->category,
                'productName' => $product->name,
            ]);

        $sellerActivity = User::query()
            ->whereIn('id', $sellerIds)
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (User $seller) => [
                'id' => 'seller-'.$seller->id,
                'type' => 'seller',
                'title' => $seller->name.' joined',
                'detail' => 'Verified seller account',
                'occurredAt' => $seller->created_at->toIso8601String(),
                'image' => $this->sellerAvatarUrl($seller),
            ]);

        return Collection::make([...$orders, ...$products, ...$sellerActivity])
            ->sortByDesc('occurredAt')
            ->take(6)
            ->values()
            ->all();
    }

    private function partnerSellerQuery(): Builder
    {
        return User::query()
            ->where('role', UserRole::Seller->value)
            ->where('account_status', AccountStatus::Active->value)
            ->whereNotNull('barangay');
    }

    private function barangayName(User $seller): string
    {
        return $seller->barangay ?? 'Unassigned';
    }

    private function sellerAvatarUrl(User $seller): ?string
    {
        if (! $seller->avatar_url) {
            return null;
        }

        return str_starts_with($seller->avatar_url, '/seller/profile/photo?image=')
            ? '/marketplace/sellers/'.$seller->id.'/photo'
            : $seller->avatar_url;
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'out_for_delivery' => 'Out for delivery',
            'delivered' => 'Delivered',
            'cancelled' => 'Cancelled',
            'preparing' => 'Preparing',
            'reservation' => 'Reservation',
            default => 'Pending',
        };
    }
}
