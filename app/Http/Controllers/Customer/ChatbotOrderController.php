<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerCheckout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatbotOrderController extends Controller
{
    public function latest(Request $request): JsonResponse
    {
        $orders = CustomerCheckout::query()
            ->where('user_id', $request->user()->id);
        $activeCheckouts = (clone $orders)->with('items')
            ->whereHas('items', fn ($query) => $query->whereNotIn('status', ['delivered', 'cancelled']))
            ->orderByDesc('created_at')->orderByDesc('id')->get();

        if ($activeCheckouts->isEmpty()) {
            $latest = $orders->with('items')->orderByDesc('created_at')->orderByDesc('id')->first();

            return response()->json($this->checkoutStatus($latest));
        }

        $summary = $activeCheckouts->flatMap(fn ($checkout) => $checkout->items)
            ->filter(fn ($item) => ! in_array($item->status, ['delivered', 'cancelled'], true))
            ->map(fn ($item) => $item->quantity.'x '.$item->product_name.' ('.ucfirst($item->status).')')
            ->implode("\n- ");

        return response()->json([
            'reference' => 'multiple_active',
            'status' => 'active_multiple',
            'summary' => $summary,
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        $data = $request->validate(['reference' => ['required', 'string', 'max:64']]);
        $checkout = CustomerCheckout::query()->with('items')
            ->where('user_id', $request->user()->id)
            ->where('reference_number', $data['reference'])
            ->first();

        // Another customer's reference is indistinguishable from an unknown one.
        return response()->json($this->checkoutStatus($checkout));
    }

    private function checkoutStatus(?CustomerCheckout $checkout): array
    {
        if ($checkout === null || $checkout->items->isEmpty()) {
            return ['status' => 'not_found'];
        }

        $statuses = $checkout->items->pluck('status')->unique();
        $status = $statuses->count() === 1 ? $statuses->first()
            : ($statuses->contains('pending') || $statuses->contains('preparing') ? 'processing' : 'mixed');

        return [
            'reference' => $checkout->reference_number,
            'status' => $status,
            'summary' => $checkout->items
                ->map(fn ($item) => $item->quantity.'x '.$item->product_name.' ('.ucfirst($item->status).')')
                ->implode(', '),
        ];
    }
}
