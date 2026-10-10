<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\WalkInOrder;
use App\Notifications\OrderStatusEmail;
use App\Notifications\OrderStatusUpdated;
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
            $isPreorder = $product->stock === 0 && $product->expected_yield > 0;
            $maxAvailable = $isPreorder ? $product->expected_yield : $product->stock;
            if ($maxAvailable < $data['quantity']) {
                throw ValidationException::withMessages(['quantity' => "Only {$maxAvailable} {$product->unit} available."]);
            }

            $order = new WalkInOrder([
                'customer_name' => $data['customer_name'] ?: 'Walk-in customer',
                'product_name' => $product->name,
                'unit' => $product->unit,
                'quantity' => $data['quantity'],
                'unit_price' => $product->price,
                'total' => number_format((float) $product->price * $data['quantity'], 2, '.', ''),
                'status' => $isPreorder ? 'reservation' : 'pending',
            ]);
            $order->user_id = $request->user()->id;
            $order->product_id = $product->id;
            $order->inventory_source = $isPreorder ? 'expected_yield' : 'stock';
            $order->save();
            if ($isPreorder) {
                $product->decrement('expected_yield', $data['quantity']);
            } else {
                $product->decrement('stock', $data['quantity']);
            }
        });

        return redirect('/seller/dashboard?section=orders')->with('status', 'Walk-in order added successfully.');
    }

    public function updateStatus(Request $request, WalkInOrder $walkInOrder): RedirectResponse
    {
        abort_unless($walkInOrder->user_id === $request->user()->id, 404);

        $request->merge(['cancellation_note' => trim((string) $request->input('cancellation_note')) ?: null]);
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(array_keys(self::TRANSITIONS))],
            'cancellation_reason' => ['exclude_unless:status,cancelled', 'required', Rule::in(array_keys(WalkInOrder::CANCELLATION_REASONS))],
            'cancellation_note' => ['exclude_unless:status,cancelled', 'nullable', 'required_if:cancellation_reason,other', 'string', 'min:5', 'max:500'],
            'cancellation_inventory_source' => ['exclude_unless:status,cancelled', 'nullable', Rule::in(['stock', 'expected_yield'])],
        ], [
            'cancellation_reason.required' => 'Choose a reason for cancelling this order.',
            'cancellation_reason.in' => 'Choose a valid cancellation reason.',
            'cancellation_note.required_if' => 'Explain why you are cancelling this order.',
            'cancellation_note.min' => 'Use at least 5 characters for the explanation.',
            'cancellation_note.max' => 'Keep the explanation within 500 characters.',
            'cancellation_inventory_source.in' => 'Choose available stock or future harvest.',
        ]);

        $nextStatus = $data['status'];

        DB::transaction(function () use ($walkInOrder, $nextStatus, $data): void {
            $order = WalkInOrder::whereKey($walkInOrder->id)->lockForUpdate()->firstOrFail();

            if (! in_array($nextStatus, self::TRANSITIONS[$order->status] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => 'That order status change is not allowed.',
                ]);
            }

            $inventorySource = $order->inventory_source ?? match ($order->status) {
                'reservation' => 'expected_yield',
                'pending' => 'stock',
                default => null,
            };

            if ($nextStatus === 'cancelled' && $order->product_id) {
                if (! in_array($inventorySource, ['stock', 'expected_yield'], true)) {
                    // Older accepted orders did not retain their reservation source.
                    // The owner must confirm it; today's stock cannot identify it.
                    $inventorySource = $data['cancellation_inventory_source'] ?? null;
                    if ($inventorySource === null) {
                        throw ValidationException::withMessages([
                            'cancellation_inventory_source' => 'Choose where this order originally reserved its quantity.',
                        ]);
                    }
                }
                Product::where('user_id', $order->user_id)
                    ->whereKey($order->product_id)
                    ->lockForUpdate()
                    ->first()
                    ?->increment($inventorySource, $order->quantity);
            }

            $order->inventory_source = $inventorySource;
            $order->status = $nextStatus;
            if ($nextStatus === 'delivered') {
                $order->delivered_at = now()->utc();
            }
            if ($nextStatus === 'cancelled') {
                $order->cancellation_reason = $data['cancellation_reason'];
                $order->cancellation_note = $data['cancellation_note'] ?? null;
            }
            $order->save();

            if ($order->checkout && $order->checkout->customer) {
                $customer = $order->checkout->customer;
                $notification = new OrderStatusUpdated($order);
                $customer->notifyNow($notification, ['database']);
                if ($customer->order_update_emails) {
                    $customer->notify(new OrderStatusEmail($notification->toMail($customer)));
                }
            }
        });

        $message = match ($nextStatus) {
            'preparing' => 'Order accepted and moved to preparing.',
            'out_for_delivery' => 'Order marked for delivery.',
            'delivered' => 'Delivery confirmed.',
            'cancelled' => 'Order cancelled.',
            default => 'Order status updated.',
        };

        return redirect('/seller/dashboard?section=orders')->with('status', $message);
    }
}
