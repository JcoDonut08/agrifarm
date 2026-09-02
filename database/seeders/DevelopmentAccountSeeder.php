<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevelopmentAccountSeeder extends Seeder
{
    private const PASSWORD = 'AgriFarm123!';

    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        $this->createAccount('AgriFarm Customer', 'customer@agrifarm.test', UserRole::Customer, true);
        $this->createAccount('AgriFarm Urban Farmer', 'seller@agrifarm.test', UserRole::Seller);
        $this->createAccount('Pasig CENRO Administrator', 'admin@agrifarm.test', UserRole::CenroAdmin);
    }

    private function createAccount(string $name, string $email, UserRole $role, bool $acceptedLegalTerms = false): void
    {
        $user = User::query()->firstOrNew(['email' => $email]);

        $user->forceFill([
            'name' => $name,
            'role' => $role,
            'password' => Hash::make(self::PASSWORD),
            'email_verified_at' => now(),
            'terms_accepted_at' => $acceptedLegalTerms ? now() : null,
            'privacy_accepted_at' => $acceptedLegalTerms ? now() : null,
        ])->save();
    }
}
