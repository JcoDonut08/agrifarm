<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 40)->nullable()->unique();
            $table->string('mobile_number', 24)->nullable();
            $table->string('delivery_address', 500)->nullable();
            $table->string('delivery_barangay', 100)->nullable();
        });

        Schema::table('customer_checkouts', function (Blueprint $table) {
            $table->string('contact_email')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('customer_checkouts', fn (Blueprint $table) => $table->dropColumn('contact_email'));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['username', 'mobile_number', 'delivery_address', 'delivery_barangay']));
    }
};
