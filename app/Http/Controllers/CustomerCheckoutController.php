<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CustomerCheckout;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CustomerCheckoutController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'checkout_id' => ['required', 'uuid'],
            'recipient_name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['required', 'regex:/^\+?[0-9][0-9\s-]{8,22}$/'],
            'address' => ['required', 'string', 'min:10', 'max:500'],
            'barangay' => ['required', 'string', 'min:2', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
            'payment_method' => ['required', Rule::in(['cod'])],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
        ]);

        // Repeated submissions from the same customer return the original checkout.
        $existing = CustomerCheckout::whereKey($data['checkout_id'])->first();
        if ($existing) {
            abort_unless($existing->user_id === $request->user()->id, 404);

            return redirect('/?page=checkout&order='.$existing->id);
        }

        DB::transaction(function () use ($data, $request): void {
            User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $previousCheckout = CustomerCheckout::whereKey($data['checkout_id'])->first();
            if ($previousCheckout) {
                abort_unless($previousCheckout->user_id === $request->user()->id, 404);

                return;
            }
            $quantities = collect($data['items'])->keyBy('product_id');
            $products = Product::query()->with('seller')->whereKey($quantities->keys()->all())
                ->orderBy('id')->lockForUpdate()->get();
            if ($products->count() !== $quantities->count()) {
                throw ValidationException::withMessages(['items' => 'A product is no longer available. Review your cart.']);
            }

            $goodsTotal = 0;
            foreach ($products as $product) {
                $quantity = $quantities->get($product->id)['quantity'];
                if ($product->seller?->role !== UserRole::Seller || $product->stock < $quantity) {
                    throw ValidationException::withMessages(['items' => "{$product->name} is no longer available in that quantity. Review your cart."]);
                }
                $goodsTotal += (int) round((float) $product->price * 100) * $quantity;
            }

            $checkout = CustomerCheckout::create([
                'id' => $data['checkout_id'], 'user_id' => $request->user()->id,
                'recipient_name' => $data['recipient_name'], 'phone' => $data['phone'],
                'address' => $data['address'], 'barangay' => $data['barangay'],
                'notes' => $data['notes'] ?? null, 'payment_method' => 'cod',
                'goods_total' => number_format($goodsTotal / 100, 2, '.', ''),
            ]);

            foreach ($products as $product) {
                $quantity = $quantities->get($product->id)['quantity'];
                $order = new WalkInOrder([
                    'customer_name' => $checkout->recipient_name,
                    'product_name' => $product->name,
                    'unit' => $product->unit,
                    'quantity' => $quantity,
                    'unit_price' => $product->price,
                    'total' => number_format((int) round((float) $product->price * 100) * $quantity / 100, 2, '.', ''),
                    'status' => 'pending',
                ]);
                $order->user_id = $product->user_id;
                $order->product_id = $product->id;
                $order->customer_checkout_id = $checkout->id;
                $order->save();
                $product->decrement('stock', $quantity);
            }
        });

        return redirect('/?page=checkout&order='.$data['checkout_id']);
    }
}
