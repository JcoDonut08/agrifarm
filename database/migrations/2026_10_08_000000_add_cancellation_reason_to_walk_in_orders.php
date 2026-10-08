<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('walk_in_orders', function (Blueprint $table) {
            $table->string('cancellation_reason', 40)->nullable();
            $table->text('cancellation_note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('walk_in_orders', function (Blueprint $table) {
            $table->dropColumn(['cancellation_reason', 'cancellation_note']);
        });
    }
};
