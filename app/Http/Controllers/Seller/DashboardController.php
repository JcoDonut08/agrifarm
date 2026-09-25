<?php

namespace App\Http\Controllers\Seller;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Services\WeatherService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, WeatherService $weatherService): Response
    {
        $products = Product::where('user_id', $request->user()->id)->latest('id')->get();
        $rating = ProductReview::query()
            ->whereIn('product_id', $products->pluck('id'))
            ->selectRaw('COUNT(*) as review_count, AVG(rating) as average_rating')
            ->first();

        $customers = User::where('role', UserRole::Customer)->select('id', 'name', 'username', 'avatar_url')->get();
        $customerByName = $customers->keyBy(fn ($u) => strtolower(trim((string) $u->name)));
        $customerByUsername = $customers->filter(fn ($u) => ! empty($u->username))->keyBy(fn ($u) => strtolower(trim((string) $u->username)));

        $orders = WalkInOrder::with([
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

        return Inertia::render('Seller/Dashboard', [
            'products' => $products,
            'orders' => $orders,
            'reviewSummary' => [
                'count' => (int) ($rating?->review_count ?? 0),
                'average' => $rating?->average_rating !== null ? round((float) $rating->average_rating, 1) : null,
            ],
            'weather' => $weatherService->current(),
        ]);
    }
}
