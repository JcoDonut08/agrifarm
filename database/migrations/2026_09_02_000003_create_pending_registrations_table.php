<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pending_registrations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->timestampTz('terms_accepted_at');
            $table->timestampTz('privacy_accepted_at');
            $table->string('code_hash')->nullable();
            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('code_sent_at')->nullable();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestampsTz();

            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_registrations');
    }
};
