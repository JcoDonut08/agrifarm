<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Remove only the five timestamped placeholder rows that an earlier
     * development seeder inserted. Real audit activity is never removed.
     */
    public function up(): void
    {
        $examples = [
            ['action' => 'Suspended account', 'seller_name' => 'Barangay Sto. Tomas', 'date' => '2026-09-22', 'time' => '06:15:00'],
            ['action' => 'Status changed', 'seller_name' => 'Barangay Sto. Tomas', 'date' => '2026-09-22', 'time' => '06:15:01'],
            ['action' => 'Reinstated account', 'seller_name' => 'Barangay Sto. Tomas', 'date' => '2026-09-24', 'time' => '01:40:00'],
            ['action' => 'Created seller account', 'seller_name' => 'Barangay Rosario', 'date' => '2026-09-25', 'time' => '03:05:00'],
            ['action' => 'Updated seller details', 'seller_name' => 'Barangay Rosario', 'date' => '2026-09-26', 'time' => '07:10:00'],
        ];

        foreach ($examples as $example) {
            DB::table('audit_logs')
                ->where('action', $example['action'])
                ->where('seller_name', $example['seller_name'])
                ->whereDate('created_at', $example['date'])
                ->whereTime('created_at', $example['time'])
                ->delete();
        }
    }

    public function down(): void
    {
        // Placeholder audit records are intentionally not restored.
    }
};
