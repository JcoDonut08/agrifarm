<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;

class AdminSellerService
{
    /** @return array<int, array<string, mixed>> */
    public function sellers(): array
    {
        return User::query()
            ->where('role', UserRole::Seller->value)
            ->with(['accountStatusHistory.administrator:id,name'])
            ->withCount('products')
            ->latest('id')
            ->get()
            ->map(fn (User $seller) => $this->seller($seller))
            ->all();
    }

    /** @return array<int, string> */
    public function barangays(): array
    {
        return array_keys(config('marketplace.barangay_seller_names'));
    }

    /** @return array<string, mixed> */
    public function seller(User $seller): array
    {
        return [
            'id' => $seller->id,
            'name' => $seller->name,
            'email' => $seller->email,
            'barangay' => $seller->barangay,
            'status' => $seller->account_status->value,
            'photoUrl' => $seller->avatar_url ? route('admin.sellers.photo', $seller) : null,
            'productCount' => $seller->products_count ?? $seller->products()->count(),
            'requiresPasswordChange' => $seller->password_must_be_changed,
            'createdAt' => $seller->created_at->toIso8601String(),
            'history' => $seller->relationLoaded('accountStatusHistory')
                ? $seller->accountStatusHistory->map(fn ($entry) => [
                    'id' => $entry->id,
                    'action' => $entry->action,
                    'reason' => $entry->reason,
                    'adminName' => $entry->administrator?->name ?? 'CENRO administrator',
                    'createdAt' => $entry->created_at->toIso8601String(),
                ])->values()->all()
                : [],
        ];
    }
}
