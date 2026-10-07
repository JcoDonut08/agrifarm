<?php

namespace App\Http\Controllers\Seller;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\HarvestRecord;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Services\ForecastRecommendationService;
use App\Services\WeatherService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, WeatherService $weatherService): Response
    {
        $partialData = array_filter(explode(',', (string) $request->header('X-Inertia-Partial-Data')));
        $isPartialDashboardRequest = $request->header('X-Inertia-Partial-Component') === 'Seller/Dashboard';
        $shouldLoad = static fn (string $property): bool => ! $isPartialDashboardRequest || in_array($property, $partialData, true);
        $needsProducts = $shouldLoad('products') || $shouldLoad('reviewSummary') || $shouldLoad('orders');
        $products = $needsProducts
            ? Product::where('user_id', $request->user()->id)->latest('id')->get()
            : collect();
        $harvestRecords = $shouldLoad('harvestRecords')
            ? HarvestRecord::where('user_id', $request->user()->id)->latest('harvest_date')->latest('id')->get()
            : collect();
        $rating = $shouldLoad('reviewSummary')
            ? ProductReview::query()->whereIn('product_id', $products->pluck('id'))->selectRaw('COUNT(*) as review_count, AVG(rating) as average_rating')->first()
            : null;
        $orders = $shouldLoad('orders') ? $this->ordersFor($request) : collect();
        $forecastRun = $shouldLoad('forecastData') || $shouldLoad('forecastRun')
            ? $request->user()->forecastRuns()->latest('id')->first()
            : null;

        return Inertia::render('Seller/Dashboard', [
            'products' => $products,
            'harvestRecords' => $harvestRecords,
            'orders' => $orders,
            'reviewSummary' => [
                'count' => (int) ($rating?->review_count ?? 0),
                'average' => $rating?->average_rating !== null ? round((float) $rating->average_rating, 1) : null,
            ],
            'weather' => $shouldLoad('weather') ? $weatherService->current() : null,
            'forecastData' => $forecastRun ? app(ForecastRecommendationService::class)->recommend($forecastRun->result, seller: $request->user()) : null,
            'forecastRun' => $forecastRun ? [
                'source_filename' => $forecastRun->source_filename,
                'created_at' => $forecastRun->created_at->toIso8601String(),
            ] : null,
            'plantingPlans' => $shouldLoad('plantingPlans')
                ? $request->user()->plantingPlans()->orderByDesc('planting_month')->latest('id')->get()
                    ->map(fn ($plan) => [
                        'id' => $plan->id,
                        'crop' => $plan->crop,
                        'planting_month' => $plan->planting_month->format('Y-m'),
                        'harvest_month' => $plan->harvest_month->format('Y-m'),
                        'days_to_harvest' => $plan->days_to_harvest,
                    ])
                : [],
        ]);
    }

    private function ordersFor(Request $request): mixed
    {
        $customers = User::where('role', UserRole::Customer)->select('id', 'name', 'username', 'avatar_url')->get();
        $customerByName = $customers->keyBy(fn ($user) => strtolower(trim((string) $user->name)));
        $customerByUsername = $customers->filter(fn ($user) => ! empty($user->username))->keyBy(fn ($user) => strtolower(trim((string) $user->username)));

        return WalkInOrder::with([
            'checkout:id,user_id,recipient_name,phone,address,notes,payment_method,reference_number',
            'checkout.customer:id,name,username,avatar_url',
        ])
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->get()
            ->map(function (WalkInOrder $order) use ($customerByName, $customerByUsername) {
                $customer = $order->checkout?->customer;
                if (! $customer) {
                    $lookup = strtolower(trim((string) $order->customer_name));
                    $customer = $customerByName->get($lookup) ?? $customerByUsername->get($lookup);
                }

                $avatarUrl = $customer?->avatar_url;
                if ($avatarUrl && str_starts_with($avatarUrl, '/customer/profile/photo?image=')) {
                    $avatarUrl = '/marketplace/customers/'.$customer->id.'/photo';
                }

                $order->customer_id = $customer?->id;
                $order->customer_avatar_url = $avatarUrl;

                return $order;
            });
    }
}
