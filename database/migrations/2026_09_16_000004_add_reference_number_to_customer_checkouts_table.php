<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_checkouts', function (Blueprint $table) {
            $table->string('reference_number', 32)->nullable()->unique();
        });

        // The first order line has a unique, permanent integer ID for each checkout.
        DB::table('customer_checkouts')->select('id')->orderBy('id')->chunk(100, function ($checkouts): void {
            foreach ($checkouts as $checkout) {
                $firstLineId = DB::table('walk_in_orders')->where('customer_checkout_id', $checkout->id)->min('id');
                if ($firstLineId) {
                    DB::table('customer_checkouts')->where('id', $checkout->id)
                        ->update(['reference_number' => 'AgFrm-'.str_pad((string) $firstLineId, 5, '0', STR_PAD_LEFT)]);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('customer_checkouts', function (Blueprint $table) {
            $table->dropUnique(['reference_number']);
            $table->dropColumn('reference_number');
        });
    }
};
