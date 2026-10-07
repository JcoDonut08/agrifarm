<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('harvest_records', function (Blueprint $table) {
            $table->decimal('measured_weight_kg', 12, 3)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('harvest_records', function (Blueprint $table) {
            $table->dropColumn('measured_weight_kg');
        });
    }
};
