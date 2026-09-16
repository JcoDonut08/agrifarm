<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Scout\Searchable;

class Product extends Model
{
    use Searchable;

    protected $fillable = ['name', 'category', 'description', 'price', 'unit', 'stock', 'threshold', 'photo_path'];

    protected $hidden = ['photo_path'];

    protected $appends = ['photo_url'];

    protected function casts(): array
    {
        return ['price' => 'decimal:2', 'stock' => 'integer', 'threshold' => 'integer'];
    }

    public function getPhotoUrlAttribute(): string
    {
        return '/seller/products/'.$this->id.'/photo?v='.$this->photoVersion();
    }

    public function photoVersion(): string
    {
        return substr(sha1($this->photo_path), 0, 12);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function walkInOrders(): HasMany
    {
        return $this->hasMany(WalkInOrder::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class);
    }

    public function toSearchableArray(): array
    {
        return [
            'name' => $this->name,
            'category' => $this->category,
            'description' => $this->description,
        ];
    }
}
