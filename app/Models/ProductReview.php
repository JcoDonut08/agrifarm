<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductReview extends Model
{
    protected $fillable = ['product_key', 'product_id', 'user_id', 'rating', 'comment', 'anonymous'];

    protected function casts(): array
    {
        return ['rating' => 'integer', 'anonymous' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
