<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlantingPlan extends Model
{
    protected $fillable = ['crop', 'planting_month', 'harvest_month', 'days_to_harvest'];

    protected function casts(): array
    {
        return [
            'planting_month' => 'immutable_date',
            'harvest_month' => 'immutable_date',
            'days_to_harvest' => 'integer',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
