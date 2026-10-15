<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->foreignId('admin_id')->nullable()->change();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_name')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('actor_id');
            $table->dropColumn('actor_name');
        });

        // Retain seller history instead of deleting entries to restore NOT NULL.
        if (! DB::table('audit_logs')->whereNull('admin_id')->exists()) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->foreignId('admin_id')->nullable(false)->change();
            });
        }
    }
};
