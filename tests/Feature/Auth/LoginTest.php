<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_correct_credentials_authenticate_without_an_otp_challenge(): void
    {
        $user = User::factory()->create([
            'password' => 'StrongPassword123!',
            'remember_token' => null,
        ]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'StrongPassword123!',
            'remember' => true,
        ])->assertRedirect('/customer');

        $this->assertAuthenticatedAs($user);
        $this->assertDatabaseCount('login_otps', 0);
    }

    public function test_remember_me_creates_a_persistent_login_cookie(): void
    {
        $user = User::factory()->create([
            'password' => 'StrongPassword123!',
            'remember_token' => null,
        ]);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'StrongPassword123!',
            'remember' => true,
        ]);

        $response->assertCookie(Auth::guard('web')->getRecallerName());
        $this->assertNotNull($user->fresh()->getRememberToken());
    }

    public function test_login_without_remember_me_does_not_create_a_persistent_login_cookie(): void
    {
        $user = User::factory()->create([
            'password' => 'StrongPassword123!',
            'remember_token' => null,
        ]);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'StrongPassword123!',
            'remember' => false,
        ]);

        $response->assertCookieMissing(Auth::guard('web')->getRecallerName());
        $this->assertSame('', $user->fresh()->getRememberToken());
    }

    public function test_each_role_is_redirected_directly_to_its_workspace(): void
    {
        $cases = [
            [UserRole::Customer, '/customer'],
            [UserRole::Seller, '/seller/dashboard'],
            [UserRole::CenroAdmin, '/admin/dashboard'],
        ];

        foreach ($cases as [$role, $path]) {
            $user = User::factory()->create([
                'email' => $role->value.'@example.test',
                'role' => $role,
                'password' => 'StrongPassword123!',
            ]);

            $this->post('/login', [
                'email' => $user->email,
                'password' => 'StrongPassword123!',
            ])->assertRedirect($path);

            $this->assertAuthenticatedAs($user);
            $this->post('/logout')->assertRedirect('/login');
        }
    }

    public function test_invalid_credentials_do_not_authenticate(): void
    {
        $user = User::factory()->create(['password' => 'StrongPassword123!']);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'WrongPassword123!',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
        $this->assertDatabaseCount('login_otps', 0);
    }

    public function test_legacy_login_otp_endpoints_are_unavailable(): void
    {
        $this->get('/login/otp')->assertNotFound();
        $this->post('/login/otp', ['code' => '123456'])->assertNotFound();
        $this->post('/login/otp/resend')->assertNotFound();
    }
}
