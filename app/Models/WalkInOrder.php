<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalkInOrder extends Model
{
    protected $fillable = ['customer_name', 'product_name', 'unit', 'quantity', 'unit_price', 'total', 'status'];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function checkout(): BelongsTo
    {
        return $this->belongsTo(CustomerCheckout::class, 'customer_checkout_id');
    }
}
