<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table("product_reviews", function (Blueprint $table) {
            $table->string("attachment_path")->nullable();
        });

        Schema::create("review_reactions", function (Blueprint $table) {
            $table->id();
            $table->foreignId("product_review_id")->constrained()->cascadeOnDelete();
            $table->foreignId("user_id")->constrained()->cascadeOnDelete();
            $table->enum("type", ["like", "dislike"]);
            $table->timestamps();

            $table->unique(["product_review_id", "user_id"]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("review_reactions");
        Schema::table("product_reviews", function (Blueprint $table) {
            $table->dropColumn("attachment_path");
        });
    }
};

