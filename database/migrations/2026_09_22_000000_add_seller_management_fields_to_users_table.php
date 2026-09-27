<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('barangay', 100)->nullable()->index()->after('role');
            $table->string('account_status', 20)->default('active')->index()->after('barangay');
            $table->boolean('password_must_be_changed')->default(false)->after('password');
        });

        foreach (config('marketplace.barangay_seller_emails') as $barangay => $emails) {
            DB::table('users')->whereIn('email', $emails)->update(['barangay' => $barangay]);
        }

        foreach (config('marketplace.barangay_seller_names') as $barangay => $names) {
            DB::table('users')->whereNull('barangay')->whereIn('name', $names)->update(['barangay' => $barangay]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['barangay']);
            $table->dropIndex(['account_status']);
            $table->dropColumn(['barangay', 'account_status', 'password_must_be_changed']);
        });
    }
};
