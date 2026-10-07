<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ForecastRun extends Model
{
    protected $fillable = ['result', 'source_filename'];

    protected function casts(): array
    {
        return ['result' => 'array'];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
