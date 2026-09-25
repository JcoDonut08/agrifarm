<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 120);
            $table->date('due_date')->nullable();
            $table->boolean('completed')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'completed', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_tasks');
    }
};
