<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('products', 'status')) {
            Schema::table('products', function (Blueprint $table) {
                $table->string('status', 20)->default('active')->index();
            });
        }

        DB::table('products')->whereNull('status')->update(['status' => 'active']);
    }

    public function down(): void
    {
        // Keep moderation data: this column may already exist before this migration.
    }
};
