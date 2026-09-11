<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class BarangaySellerSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        foreach ([
            'brgyrosario@gmail.com' => 'Barangay Rosario',
            'brgymaybunga@gmail.com' => 'Barangay Maybunga',
            'brgystothomas@gmail.com' => 'Barangay Sto. Thomas',
        ] as $email => $name) {
            // Preserve existing accounts and passwords when this seeder runs again.
            if (User::query()->where('email', $email)->exists()) {
                continue;
            }

            $user = new User;
            $user->forceFill([
                'name' => $name,
                'email' => $email,
                'role' => UserRole::Seller,
                'password' => Hash::make('AgriFarm123!'),
                'email_verified_at' => now(),
            ])->save();
        }
    }
}
