<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('walk_in_orders', function (Blueprint $table) {
            $table->string('inventory_source', 20)->nullable();
        });

        DB::table('walk_in_orders')->where('status', 'reservation')->update(['inventory_source' => 'expected_yield']);
        DB::table('walk_in_orders')->where('status', 'pending')->update(['inventory_source' => 'stock']);
        // Accepted legacy orders no longer identify their original inventory source.
    }

    public function down(): void
    {
        Schema::table('walk_in_orders', function (Blueprint $table) {
            $table->dropColumn('inventory_source');
        });
    }
};
