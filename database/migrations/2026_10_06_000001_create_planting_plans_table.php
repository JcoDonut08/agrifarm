<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planting_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('crop', 100);
            $table->date('planting_month');
            $table->date('harvest_month');
            $table->unsignedSmallInteger('days_to_harvest');
            $table->timestamps();
            $table->unique(['user_id', 'crop', 'planting_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planting_plans');
    }
};
