<?php

namespace App\Services;

use App\Models\CustomerCheckout;

class AdminOrderService
{
    public function data(): array
    {
        $checkouts = CustomerCheckout::with(['items.seller', 'items.product', 'customer:id,name,email'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($checkout) {
                // Determine overall status based on items
                $items = $checkout->items;
                $totalItems = $items->count();

                if ($totalItems === 0) {
                    $overallStatus = 'empty';
                } else {
                    $statuses = $items->pluck('status');
                    $deliveredCount = $statuses->filter(fn ($s) => $s === 'delivered')->count();
                    $cancelledCount = $statuses->filter(fn ($s) => $s === 'cancelled')->count();
                    $pendingCount = $statuses->filter(fn ($s) => $s === 'pending')->count();

                    if ($deliveredCount === $totalItems) {
                        $overallStatus = 'delivered';
                    } elseif ($cancelledCount === $totalItems) {
                        $overallStatus = 'cancelled';
                    } elseif ($deliveredCount + $cancelledCount === $totalItems) {
                        $overallStatus = 'completed';
                    } elseif ($pendingCount > 0) {
                        $overallStatus = 'pending';
                    } else {
                        $overallStatus = 'processing';
                    }
                }

                $sellerBarangays = $items->pluck('seller.barangay')->filter()->unique();
                if ($sellerBarangays->count() === 1) {
                    $displayBarangay = $sellerBarangays->first();
                } elseif ($sellerBarangays->count() > 1) {
                    $displayBarangay = 'Multiple';
                } else {
                    $displayBarangay = $checkout->barangay;
                }
                $displayBarangay = $displayBarangay ? ucwords(strtolower($displayBarangay)) : null;

                return [
                    'id' => $checkout->reference_number ?? strtoupper(substr($checkout->id, 0, 8)), // Prefer reference number
                    'customer_name' => $checkout->recipient_name,
                    'customer_email' => $checkout->customer->email ?? $checkout->contact_email ?? $checkout->phone,
                    'customer_phone' => $checkout->phone,
                    'barangay' => $displayBarangay,
                    'address' => $checkout->address,
                    'payment_method' => strtoupper($checkout->payment_method) === 'GCASH' ? 'GCash' : strtoupper($checkout->payment_method),
                    'reference_number' => $checkout->reference_number,
                    'notes' => $checkout->notes,
                    'total_amount' => $checkout->goods_total,
                    'created_at' => $checkout->created_at->format('M j, Y'),
                    'status' => $overallStatus,
                    'items' => $items->map(function ($item) {
                        return [

                            'id' => $item->id,
                            'product_name' => $item->product_name,
                            'photo_url' => $item->product ? '/marketplace/products/'.$item->product->id.'/photo?v='.$item->product->photoVersion() : null,

                            'quantity' => $item->quantity,
                            'unit' => $item->unit,
                            'price' => $item->unit_price,
                            'total' => $item->total,
                            'status' => $item->status,
                            'seller_name' => $item->seller->name ?? 'Unknown Seller',
                        ];
                    }),
                ];
            });

        return [
            'orders' => $checkouts,
        ];
    }
}
