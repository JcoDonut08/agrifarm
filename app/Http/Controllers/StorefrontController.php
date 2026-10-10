<?php

namespace App\Http\Controllers;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\CustomerCheckout;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class StorefrontController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user) {
            if ($user->role === UserRole::CenroAdmin) {
                return redirect()->route('admin.dashboard');
            }
            if ($user->role === UserRole::Seller) {
                return redirect()->route('seller.dashboard');
            }
        }
        $productModels = Product::query()
            ->with('seller:id,name,email,role,avatar_url,barangay,account_status')
            ->where('status', 'active')
            ->whereHas('seller', fn ($query) => $query->where('role', UserRole::Seller->value)->where('account_status', AccountStatus::Active->value))
            ->latest('id')->get();
        $rankedOrders = WalkInOrder::query()
            ->where('status', 'delivered')
            ->whereIn('product_id', $productModels->pluck('id'))
            ->select('product_id')
            ->selectRaw('COUNT(*) as order_count, SUM(quantity) as units_sold, SUM(total) as revenue')
            ->groupBy('product_id')
            ->orderByDesc('order_count')
            ->orderByDesc('revenue')
            ->orderBy('product_id')
            ->get();
        $topSales = $rankedOrders->take(4);
        $bestSellerIds = $topSales->pluck('product_id');
        $salesByProduct = $rankedOrders->keyBy('product_id');
        $recentCutoff = now()->subDays(7);
        $previousCutoff = now()->subDays(14);
        $recentSales = WalkInOrder::query()
            ->where('status', 'delivered')
            ->whereIn('product_id', $productModels->pluck('id'))
            ->where('delivered_at', '>=', $recentCutoff)
            ->select('product_id')
            ->selectRaw('COUNT(*) as order_count')
            ->groupBy('product_id')
            ->pluck('order_count', 'product_id');
        $previousSales = WalkInOrder::query()
            ->where('status', 'delivered')
            ->whereIn('product_id', $productModels->pluck('id'))
            ->where('delivered_at', '>=', $previousCutoff)
            ->where('delivered_at', '<', $recentCutoff)
            ->select('product_id')
            ->selectRaw('COUNT(*) as order_count')
            ->groupBy('product_id')
            ->pluck('order_count', 'product_id');
        $sellerProducts = $productModels
            ->map(fn (Product $product) => [
                'id' => 'seller-'.$product->id,
                'name' => $product->name,
                'category' => $product->category,
                'description' => $product->description,
                'price' => (float) $product->price,
                'unit' => $product->unit,
                'stock' => $product->stock,
                'expected_yield' => (int) $product->expected_yield,
                'harvest_date' => $product->harvest_date ? $product->harvest_date->toDateString() : null,
                'sellerId' => $product->user_id,
                'sellerName' => $product->seller?->name,
                'sellerAvatarUrl' => $this->sellerAvatarUrl($product->seller),
                'barangay' => $this->sellerBarangay($product->seller),
                'photoUrl' => '/marketplace/products/'.$product->id.'/photo?v='.$product->photoVersion(),
                'thumbnailUrl' => '/marketplace/products/'.$product->id.'/photo?v='.$product->photoVersion().'&size=card',
                'listedAt' => $product->created_at->toDateString(),
                'salesRankScore' => (int) ($salesByProduct->get($product->id)?->order_count ?? 0),
                'isBestSeller' => $bestSellerIds->contains($product->id),
                'isTrending' => (int) ($recentSales[$product->id] ?? 0) >= 2
                    && (int) ($recentSales[$product->id] ?? 0) > (int) ($previousSales[$product->id] ?? 0),
                'isNew' => $product->created_at->greaterThanOrEqualTo($recentCutoff),
                'isSellerProduct' => true,
            ])->all();
        $communityStats = $this->communityStats($sellerProducts);
        $bestBarangay = collect($communityStats)
            ->filter(fn (array $community) => $community['listingCount'] > 0 && $community['deliveredOrderCount'] > 0)
            ->sort(fn (array $a, array $b) => $b['deliveredRevenue'] <=> $a['deliveredRevenue']
                ?: $b['deliveredOrderCount'] <=> $a['deliveredOrderCount']
                ?: strcmp($a['name'], $b['name']))
            ->first();
        $bestSellingProducts = $topSales->map(fn (WalkInOrder $sales) => [
            'id' => 'seller-'.$sales->product_id,
            'orderCount' => (int) $sales->order_count,
        ])->all();
        $productsById = collect($sellerProducts)->keyBy('id');
        $bestBarangaySale = $bestBarangay ? $rankedOrders
            ->first(fn (WalkInOrder $sales) => $productsById->get('seller-'.$sales->product_id)['barangay'] === $bestBarangay['name']) : null;
        $bestBarangayListing = $bestBarangay ? collect($sellerProducts)
            ->firstWhere('barangay', $bestBarangay['name']) : null;
        $keys = [...config('marketplace.preview_product_keys'), ...array_column($sellerProducts, 'id')];
        $reviewStats = ProductReview::query()
            ->whereIn('product_key', $keys)
            ->select('product_key')
            ->selectRaw('COUNT(*) as review_count, ROUND(AVG(rating), 1) as average_rating')
            ->groupBy('product_key')
            ->get()
            ->mapWithKeys(fn (ProductReview $row) => [
                $row->product_key => [
                    'count' => (int) $row->review_count,
                    'average' => (float) $row->average_rating,
                ],
            ])->all();

        $props = [
            'sellerProducts' => $sellerProducts,
            'reviewStats' => $reviewStats,
            'communityStats' => array_values($communityStats),
            'bestBarangay' => $bestBarangay,
            'bestSellingProducts' => $bestSellingProducts,
            'bestBarangayProduct' => $bestBarangaySale || $bestBarangayListing ? [
                'id' => $bestBarangaySale ? 'seller-'.$bestBarangaySale->product_id : $bestBarangayListing['id'],
                'orderCount' => (int) ($bestBarangaySale?->order_count ?? 0),
            ] : null,
        ];
        if ($request->query('page') === 'marketplace' && $productModels->isNotEmpty()) {
            $props['marketplaceResults'] = $this->marketplaceResults($request, collect($sellerProducts)->keyBy('id'));
        }
        if ($request->query('page') === 'seller') {
            $sellerId = filter_var($request->query('seller'), FILTER_VALIDATE_INT);
            $seller = $sellerId ? User::query()->where('role', UserRole::Seller->value)->where('account_status', AccountStatus::Active->value)->find($sellerId) : null;
            if ($seller) {
                $sellerListings = collect($sellerProducts)->where('sellerId', $seller->id)->values()->all();
                $props['sellerProfile'] = [
                    'id' => $seller->id,
                    'name' => $seller->name,
                    'barangay' => $this->sellerBarangay($seller),
                    'avatarUrl' => $this->sellerAvatarUrl($seller),
                    'listingCount' => count($sellerListings),
                    'products' => $sellerListings,
                ];
            }
        }
        if (in_array($request->query('page'), ['checkout', 'order-success'], true) && is_string($request->query('order'))) {
            $checkout = CustomerCheckout::query()->with('items:id,customer_checkout_id,product_id,product_name,unit,quantity,unit_price,total,status')
                ->where('user_id', $request->user()?->id)->find($request->query('order'));
            if ($checkout) {
                $props['checkoutOrder'] = [
                    'id' => $checkout->id,
                    'reference' => $checkout->reference_number,
                    'placedAt' => $checkout->created_at->toIso8601String(),
                    'recipientName' => $checkout->recipient_name,
                    'contactEmail' => $checkout->contact_email,
                    'phone' => $checkout->phone,
                    'address' => $checkout->address,
                    'notes' => $checkout->notes,
                    'goodsTotal' => (float) $checkout->goods_total,
                    'items' => $checkout->items->map(fn (WalkInOrder $item) => [
                        'name' => $item->product_name, 'unit' => $item->unit,
                        'quantity' => $item->quantity, 'price' => (float) $item->unit_price,
                        'status' => $item->status,
                        'photoUrl' => $item->product_id ? '/marketplace/products/'.$item->product_id.'/photo' : null,
                    ])->all(),
                ];
            }
        }
        $productKey = $request->query('product');

        if ($request->query('page') === 'product' && is_string($productKey) && in_array($productKey, $keys, true)) {
            $props['reviewFeed'] = $this->reviewFeed($request, $productKey, $reviewStats[$productKey] ?? ['count' => 0, 'average' => null]);
        }

        if ($user) {
            if ($request->query('page') === 'notifications') {
                $user->unreadNotifications->markAsRead();
            }
            $notifications = $user->notifications()->latest()->limit(50)->get();
            // Resolve older notifications in one batch, using only this customer's orders.
            $notificationOrders = $request->query('page') === 'notifications'
                ? WalkInOrder::query()
                    ->whereIn('id', $notifications->pluck('data.order_id')->filter(fn ($id) => is_numeric($id)))
                    ->whereHas('checkout', fn ($checkout) => $checkout->where('user_id', $user->id))
                    ->with('seller:id,name,avatar_url')->get()->keyBy('id')
                : collect();
            $props['notifications'] = $notifications->map(function ($notification) use ($notificationOrders) {
                $data = $notification->data;
                $seller = $notificationOrders->get($data['order_id'] ?? null)?->seller;
                if ($seller) {
                    $data['seller_id'] = $seller->id;
                    $data['seller_name'] = $seller->name;
                    $data['seller_avatar_url'] = $this->sellerAvatarUrl($seller);
                    if ($data['seller_avatar_url'] && str_starts_with($data['seller_avatar_url'], '/marketplace/sellers/')) {
                        $data['seller_avatar_url'] .= '?v='.substr(sha1($seller->avatar_url), 0, 12);
                    }
                }

                return [
                    'id' => $notification->id,
                    'data' => $data,
                    'created_at' => $notification->created_at->toIso8601String(),
                    'read_at' => $notification->read_at ? $notification->read_at->toIso8601String() : null,
                ];
            });
        }

        return Inertia::render('Welcome', $props);
    }

    private function marketplaceResults(Request $request, Collection $productsById): array
    {
        $value = fn (string $key) => is_string($request->query($key)) ? trim($request->query($key)) : '';
        $search = mb_substr($value('q'), 0, 120);
        $category = in_array($value('category'), ['Vegetables', 'Fruits', 'Herbs', 'Beans'], true) ? $value('category') : '';
        $barangay = in_array($value('barangay'), array_keys(config('marketplace.barangay_seller_names')), true) ? $value('barangay') : '';
        $price = in_array($value('price'), ['under50', '50to70', 'over70'], true) ? $value('price') : '';
        $sort = in_array($value('sort'), ['best-selling', 'latest', 'rating', 'name'], true) ? $value('sort') : 'recommended';

        $query = Product::query()
            ->select('products.id')
            ->where('products.status', 'active')
            ->whereHas('seller', fn ($seller) => $seller->where('role', UserRole::Seller->value)->where('account_status', AccountStatus::Active->value));

        if ($search !== '') {
            $matchingIds = Product::search($search)->keys()->all();
            $sellerNameOperator = config('database.default') === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($matches) use ($matchingIds, $search, $sellerNameOperator) {
                $matches->whereIn('products.id', $matchingIds)
                    ->orWhereHas('seller', fn ($seller) => $seller->where('name', $sellerNameOperator, '%'.$search.'%'));
                foreach (array_keys(config('marketplace.barangay_seller_names')) as $name) {
                    if (stripos($name, $search) !== false) {
                        $matches->orWhereHas('seller', fn ($seller) => $this->whereSellerInBarangay($seller, $name));
                    }
                }
            });
        }
        if ($category) {
            $query->where('products.category', $category);
        }
        if ($barangay) {
            $query->whereHas('seller', fn ($seller) => $this->whereSellerInBarangay($seller, $barangay));
        }
        if ($price === 'under50') {
            $query->where('products.price', '<', 50);
        } elseif ($price === '50to70') {
            $query->whereBetween('products.price', [50, 70]);
        } elseif ($price === 'over70') {
            $query->where('products.price', '>', 70);
        }

        if ($sort === 'best-selling') {
            $query->withCount(['walkInOrders as delivered_orders_count' => fn ($orders) => $orders->where('status', 'delivered')])
                ->orderByDesc('delivered_orders_count')->orderByDesc('products.id');
        } elseif ($sort === 'rating') {
            $query->withAvg('reviews as review_average', 'rating')->withCount('reviews')
                ->orderByDesc('review_average')->orderByDesc('reviews_count')->orderByDesc('products.id');
        } elseif ($sort === 'name') {
            $query->orderBy('products.name')->orderByDesc('products.id');
        } elseif ($sort === 'latest') {
            $query->orderByDesc('products.created_at')->orderByDesc('products.id');
        } else {
            $query->orderByDesc('products.id');
        }

        $page = $query->paginate(12, ['products.id'], 'market_page')->withQueryString();

        return [
            'products' => $page->getCollection()->map(fn (Product $product) => $productsById->get('seller-'.$product->id))->filter()->values()->all(),
            'currentPage' => $page->currentPage(),
            'lastPage' => $page->lastPage(),
            'total' => $page->total(),
            'filters' => compact('search', 'category', 'barangay', 'price', 'sort'),
        ];
    }

    private function whereSellerInBarangay($query, string $barangay): void
    {
        $query->where(function ($seller) use ($barangay) {
            $seller->where('barangay', $barangay)
                ->orWhereIn('email', config('marketplace.barangay_seller_emails')[$barangay] ?? [])
                ->orWhereIn('name', config('marketplace.barangay_seller_names')[$barangay] ?? []);
        });
    }

    private function sellerBarangay(?User $seller): ?string
    {
        if (! $seller) {
            return null;
        }

        if ($seller->barangay) {
            return $seller->barangay;
        }

        foreach (config('marketplace.barangay_seller_emails') as $barangay => $emails) {
            foreach ($emails as $email) {
                if (strcasecmp($seller->email, $email) === 0) {
                    return $barangay;
                }
            }
        }

        foreach (config('marketplace.barangay_seller_names') as $barangay => $names) {
            foreach ($names as $name) {
                if (strcasecmp(trim($seller->name), $name) === 0) {
                    return $barangay;
                }
            }
        }

        return null;
    }

    private function sellerAvatarUrl(?User $seller): ?string
    {
        if (! $seller?->avatar_url) {
            return null;
        }

        return str_starts_with($seller->avatar_url, '/seller/profile/photo?image=')
            ? '/marketplace/sellers/'.$seller->id.'/photo'
            : $seller->avatar_url;
    }

    private function communityStats(array $sellerProducts): array
    {
        $communities = collect(array_keys(config('marketplace.barangay_seller_names')))
            ->mapWithKeys(fn (string $name) => [$name => [
                'name' => $name,
                'listingCount' => 0,
                'deliveredOrderCount' => 0,
                'deliveredRevenue' => 0.0,
            ]])->all();

        foreach ($sellerProducts as $product) {
            if ($product['barangay']) {
                $communities[$product['barangay']]['listingCount']++;
            }
        }

        $sellerSales = WalkInOrder::query()
            ->where('status', 'delivered')
            ->select('user_id')
            ->selectRaw('COUNT(*) as order_count, SUM(total) as revenue')
            ->groupBy('user_id')
            ->with('seller:id,name,email,role,barangay,account_status')
            ->get();

        foreach ($sellerSales as $sales) {
            if ($sales->seller?->role !== UserRole::Seller) {
                continue;
            }
            $barangay = $this->sellerBarangay($sales->seller);
            if ($barangay) {
                $communities[$barangay]['deliveredOrderCount'] += (int) $sales->order_count;
                $communities[$barangay]['deliveredRevenue'] += (float) $sales->revenue;
            }
        }

        return $communities;
    }

    private function reviewFeed(Request $request, string $productKey, array $stats): array
    {
        $rating = $request->query('review_rating');
        $filter = is_string($rating) && in_array($rating, ['1', '2', '3', '4', '5'], true) ? (int) $rating : null;

        $counts = ProductReview::query()
            ->where('product_key', $productKey)
            ->select('rating')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

        $reviews = ProductReview::query()
            ->where('product_key', $productKey)
            ->when($filter, fn ($query) => $query->where('rating', $filter))
            ->with('user:id,name,avatar_url')
            ->withCount([
                'reactions as likes_count' => fn ($q) => $q->where('type', 'like'),
                'reactions as dislikes_count' => fn ($q) => $q->where('type', 'dislike'),
            ])
            ->with(['reactions' => fn ($q) => $q->where('user_id', $request->user()?->id ?: -1)])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(5, ['*'], 'review_page');

        $viewerId = $request->user()?->id;

        return [
            'summary' => $stats,
            'counts' => collect(range(1, 5))->mapWithKeys(fn (int $star) => [$star => (int) ($counts[$star] ?? 0)])->all(),
            'filter' => $filter,
            'reviews' => $reviews->getCollection()->map(fn (ProductReview $review) => [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'anonymous' => $review->anonymous,
                'displayName' => $review->anonymous ? 'Anonymous customer' : $review->user?->name,
                'avatar' => $review->anonymous ? null : $review->user?->avatar_url,
                'createdAt' => $review->created_at->toIso8601String(),
                'attachment' => $review->attachment_path ? asset('storage/'.$review->attachment_path) : null,
                'likes' => $review->likes_count ?? 0,
                'dislikes' => $review->dislikes_count ?? 0,
                'myReaction' => $review->reactions->first()?->type,
                'isMine' => $review->user_id === $viewerId,
            ])->all(),
            'currentPage' => $reviews->currentPage(),
            'lastPage' => $reviews->lastPage(),
            'total' => $reviews->total(),
            'status' => $request->session()->get('review_status'),
        ];
    }
}
