<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HarvestRecord extends Model
{
    protected $fillable = [
        'product_id',
        'product_name',
        'quantity',
        'measured_weight_kg',
        'unit',
        'harvest_date',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'measured_weight_kg' => 'decimal:3',
            'harvest_date' => 'date',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
