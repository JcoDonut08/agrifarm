<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('walk_in_orders', function (Blueprint $table) {
            // Existing delivered orders have no verified delivery timestamp.
            $table->timestamp('delivered_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('walk_in_orders', function (Blueprint $table) {
            $table->dropIndex(['delivered_at']);
            $table->dropColumn('delivered_at');
        });
    }
};
