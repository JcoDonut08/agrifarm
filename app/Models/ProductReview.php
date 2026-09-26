<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductReview extends Model
{
    protected $fillable = ["product_key", "product_id", "user_id", "rating", "comment", "anonymous", "attachment_path"];

    protected function casts(): array
    {
        return ["rating" => "integer", "anonymous" => "boolean"];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(ReviewReaction::class);
    }
}

