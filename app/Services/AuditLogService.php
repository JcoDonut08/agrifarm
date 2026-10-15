<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Carbon;

class AuditLogService
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function logs(): array
    {
        return AuditLog::query()
            ->with(['seller:id,name,barangay,avatar_url', 'administrator:id,name', 'actor:id,name'])
            ->latest('created_at')
            ->latest('id')
            ->get()
            ->map(fn (AuditLog $log) => $this->formatLog($log))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function formatLog(AuditLog $log): array
    {
        $seller = $log->seller;
        $sellerName = $log->seller_name ?: ($seller?->name ?? 'Unknown Seller');
        $barangay = $log->seller_barangay ?: ($seller?->barangay ?? 'N/A');
        $avatarUrl = $this->avatarUrl($seller?->avatar_url ?? $log->seller_avatar_url, $seller?->id ?? $log->seller_id);

        return [
            'id' => $log->id,
            'action' => $log->action,
            'actionType' => $log->action_type,
            'details' => $log->details,
            'occurredAt' => $log->created_at->toIso8601String(),
            'timeFormatted' => Carbon::parse($log->created_at)->setTimezone('Asia/Manila')->format('M j, g:i A'),
            'adminName' => $log->admin_id ? ($log->administrator?->name ?? 'Pasig CENRO Administrator') : null,
            'actorName' => $log->actor_name ?: ($log->actor?->name ?? $log->administrator?->name ?? 'Unknown user'),
            'actorRole' => $log->admin_id ? 'cenro_admin' : 'seller',
            'seller' => [
                'id' => $log->seller_id,
                'name' => $sellerName,
                'barangay' => $barangay,
                'avatarUrl' => $avatarUrl,
            ],
        ];
    }

    private function avatarUrl(?string $avatarUrl, ?int $sellerId): ?string
    {
        if (! $avatarUrl) {
            return null;
        }

        if (str_starts_with($avatarUrl, '/seller/profile/photo?image=')) {
            return $sellerId ? route('admin.sellers.photo', $sellerId) : null;
        }

        return $avatarUrl;
    }
}
