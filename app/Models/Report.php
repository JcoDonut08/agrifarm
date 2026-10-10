<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'reporter_name',
        'seller_name',
        'product_name',
        'barangay',
        'type',
        'description',
        'attachment_path',
        'status',
        'remarks',
        'resolution',
    ];
}
