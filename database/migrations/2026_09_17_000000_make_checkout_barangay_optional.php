<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_checkouts', fn (Blueprint $table) => $table->string('barangay', 100)->nullable()->change());
    }

    public function down(): void
    {
        DB::table('customer_checkouts')->whereNull('barangay')->update(['barangay' => '']);
        Schema::table('customer_checkouts', fn (Blueprint $table) => $table->string('barangay', 100)->nullable(false)->change());
    }
};
