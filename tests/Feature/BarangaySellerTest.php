<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\BarangaySellerSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BarangaySellerTest extends TestCase
{
    use RefreshDatabase;

    public function test_partner_accounts_can_access_the_seller_page_and_are_preserved_on_reseed(): void
    {
        $this->withoutVite();
        $this->seed(BarangaySellerSeeder::class);
        $this->assertDatabaseCount('users', 3);

        foreach (['brgyrosario@gmail.com', 'brgymaybunga@gmail.com', 'brgystothomas@gmail.com'] as $email) {
            $user = User::where('email', $email)->firstOrFail();
            $this->assertSame(UserRole::Seller, $user->role);
            $this->assertTrue(Hash::check('AgriFarm123!', $user->password));
            $this->actingAs($user)->get('/seller/dashboard')->assertOk()
                ->assertInertia(fn (Assert $page) => $page->component('Seller/Dashboard')->where('auth.user.email', $email));
        }

        $user->update(['password' => 'Changed-password-123!']);
        $this->seed(BarangaySellerSeeder::class);
        $this->assertDatabaseCount('users', 3);
        $this->assertTrue(Hash::check('Changed-password-123!', $user->fresh()->password));
    }

    public function test_customers_cannot_access_seller_workspace(): void
    {
        $user = User::factory()->create(['role' => UserRole::Customer]);
        $this->actingAs($user)->get('/seller/dashboard')->assertForbidden();
    }
}
