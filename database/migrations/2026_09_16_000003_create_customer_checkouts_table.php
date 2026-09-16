<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_checkouts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('recipient_name', 120);
            $table->string('phone', 24);
            $table->string('address', 500);
            $table->string('barangay', 100);
            $table->string('notes', 500)->nullable();
            $table->string('payment_method', 24)->default('cod');
            $table->decimal('goods_total', 12, 2);
            $table->timestamps();
        });

        Schema::table('walk_in_orders', function (Blueprint $table) {
            $table->foreignUuid('customer_checkout_id')->nullable()->constrained('customer_checkouts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('walk_in_orders', fn (Blueprint $table) => $table->dropConstrainedForeignId('customer_checkout_id'));
        Schema::dropIfExists('customer_checkouts');
    }
};
