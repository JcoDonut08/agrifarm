<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('barangay')->nullable();
            $table->string('type');
            $table->text('description');
            $table->string('attachment_path')->nullable();
            $table->string('status')->default('pending');
            $table->text('remarks')->nullable();
            $table->text('resolution')->nullable();
            $table->string('seller_name')->nullable();
            $table->string('product_name')->nullable();
            $table->string('reporter_name')->nullable();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};