<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerCheckout;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $checkouts = CustomerCheckout::query()
            ->with(['items.seller:id,name', 'items.product:id,photo_path'])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($checkout) {
                return [
                    'id' => $checkout->id,
                    'reference' => $checkout->reference_number,
                    'date' => $checkout->created_at->format('M d, Y'),
                    'total' => (float) $checkout->goods_total,
                    'payment_method' => $checkout->payment_method === 'cod' ? 'Cash on Delivery' : 'GCash',
                    'items' => $checkout->items->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'name' => $item->product_name,
                            'unit' => $item->unit,
                            'quantity' => $item->quantity,
                            'price' => (float) $item->unit_price,
                            'total' => (float) $item->total,
                            'status' => strtolower($item->status),
                            'cancellation_reason' => $item->cancellation_reason,
                            'cancellation_note' => $item->cancellation_note,
                            'seller_name' => $item->seller?->name ?? 'Unknown Seller',
                            'photoUrl' => $item->product_id ? '/marketplace/products/'.$item->product_id.'/photo' : null,
                        ];
                    }),
                ];
            });

        return Inertia::render('Customer/Orders', [
            'checkouts' => $checkouts,
        ]);
    }
}
