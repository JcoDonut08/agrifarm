<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('harvest_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name', 120);
            $table->decimal('quantity', 12, 3);
            $table->string('unit', 20);
            $table->date('harvest_date')->index();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'harvest_date']);
            $table->index(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('harvest_records');
    }
};
