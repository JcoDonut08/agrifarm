<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\WalkInOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class WalkInOrderController extends Controller
{
    private const TRANSITIONS = [
        'pending' => ['preparing', 'cancelled'],
        'reservation' => ['preparing', 'cancelled'],
        'preparing' => ['out_for_delivery', 'cancelled'],
        'out_for_delivery' => ['delivered'],
        'delivered' => [],
        'cancelled' => [],
    ];

    public function store(Request $request): RedirectResponse
    {
        $request->merge(['customer_name' => trim((string) $request->input('customer_name'))]);
        $data = $request->validate([
            'customer_name' => ['nullable', 'string', 'max:120'],
            'product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('user_id', $request->user()->id)],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
        ]);

        DB::transaction(function () use ($data, $request): void {
            $product = Product::where('user_id', $request->user()->id)->lockForUpdate()->findOrFail($data['product_id']);
            if ($product->stock < $data['quantity']) {
                throw ValidationException::withMessages(['quantity' => "Only {$product->stock} {$product->unit} available."]);
            }

            $order = new WalkInOrder([
                'customer_name' => $data['customer_name'] ?: 'Walk-in customer',
                'product_name' => $product->name,
                'unit' => $product->unit,
                'quantity' => $data['quantity'],
                'unit_price' => $product->price,
                'total' => number_format((float) $product->price * $data['quantity'], 2, '.', ''),
                'status' => 'pending',
            ]);
            $order->user_id = $request->user()->id;
            $order->product_id = $product->id;
            $order->save();
            $product->decrement('stock', $data['quantity']);
        });

        return redirect('/seller/dashboard?section=orders')->with('status', 'Walk-in order added successfully.');
    }

    public function updateStatus(Request $request, WalkInOrder $walkInOrder): RedirectResponse
    {
        abort_unless($walkInOrder->user_id === $request->user()->id, 404);

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(array_keys(self::TRANSITIONS))],
        ]);

        $nextStatus = $data['status'];

        DB::transaction(function () use ($walkInOrder, $nextStatus): void {
            $order = WalkInOrder::whereKey($walkInOrder->id)->lockForUpdate()->firstOrFail();

            if (! in_array($nextStatus, self::TRANSITIONS[$order->status] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => 'That order status change is not allowed.',
                ]);
            }

            if ($nextStatus === 'cancelled' && $order->product_id) {
                Product::where('user_id', $order->user_id)
                    ->whereKey($order->product_id)
                    ->lockForUpdate()
                    ->first()
                    ?->increment('stock', $order->quantity);
            }

            $order->update(['status' => $nextStatus]);
        });

        $message = match ($nextStatus) {
            'preparing' => 'Order accepted and moved to preparing.',
            'out_for_delivery' => 'Order marked for delivery.',
            'delivered' => 'Delivery confirmed.',
            'cancelled' => 'Order cancelled and stock restored.',
            default => 'Order status updated.',
        };

        return redirect('/seller/dashboard?section=orders')->with('status', $message);
    }
}
