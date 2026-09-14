<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
}
