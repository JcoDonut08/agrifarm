<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('category');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->string('unit', 20);
            $table->unsignedInteger('stock');
            $table->unsignedInteger('threshold')->default(5);
            $table->string('photo_path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
