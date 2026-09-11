<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = ['name', 'category', 'description', 'price', 'unit', 'stock', 'threshold', 'photo_path'];

    protected $hidden = ['photo_path'];

    protected $appends = ['photo_url'];

    protected function casts(): array
    {
        return ['price' => 'decimal:2', 'stock' => 'integer', 'threshold' => 'integer'];
    }

    public function getPhotoUrlAttribute(): string
    {
        return '/seller/products/'.$this->id.'/photo';
    }
}
