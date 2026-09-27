<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table("reports", function (Blueprint $table) {
            $table->dropForeign(["reporter_id"]);
            $table->dropColumn("reporter_id");
            $table->string("reporter_name")->nullable()->after("id");
        });
    }

    public function down(): void
    {
        Schema::table("reports", function (Blueprint $table) {
            $table->dropColumn("reporter_name");
            $table->foreignId("reporter_id")->constrained("users")->cascadeOnDelete();
        });
    }
};

