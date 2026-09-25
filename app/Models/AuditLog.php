<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'admin_id',
        'seller_id',
        'seller_name',
        'seller_barangay',
        'seller_avatar_url',
        'action',
        'action_type',
        'details',
    ];

    /** @return BelongsTo<User, $this> */
    public function administrator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /** @return BelongsTo<User, $this> */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public static function record(
        User $admin,
        string $action,
        string $details,
        ?User $seller = null,
        string $actionType = 'general',
        ?string $sellerName = null,
        ?string $sellerBarangay = null,
        ?string $sellerAvatarUrl = null,
    ): self {
        return self::create([
            'admin_id' => $admin->id,
            'seller_id' => $seller?->id,
            'seller_name' => $sellerName ?? $seller?->name ?? 'Unknown Seller',
            'seller_barangay' => $sellerBarangay ?? $seller?->barangay,
            'seller_avatar_url' => $sellerAvatarUrl ?? $seller?->avatar_url,
            'action' => $action,
            'action_type' => $actionType,
            'details' => $details,
        ]);
    }
}
