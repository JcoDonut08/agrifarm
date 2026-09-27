<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('seller_name');
            $table->string('seller_barangay')->nullable();
            $table->string('seller_avatar_url')->nullable();
            $table->string('action');
            $table->string('action_type', 30)->default('general');
            $table->text('details')->nullable();
            $table->timestampsTz();

            $table->index('created_at');
            $table->index(['seller_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
