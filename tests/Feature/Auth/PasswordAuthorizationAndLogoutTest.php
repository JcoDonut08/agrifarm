<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\LoginOtp;
use App\Models\User;
use App\Notifications\LoginOtpNotification;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordAuthorizationAndLogoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_reset_works_for_every_role_and_next_login_still_requires_otp(): void
    {
        foreach ([UserRole::Customer, UserRole::Seller, UserRole::CenroAdmin] as $role) {
            Notification::fake();
            $user = User::factory()->create([
                'email' => 'reset-'.$role->value.'@example.test',
                'role' => $role,
                'password' => 'OldPassword123!',
            ]);
            LoginOtp::query()->create([
                'user_id' => $user->id,
                'code_hash' => Hash::make('123456'),
                'expires_at' => now()->addMinutes(10),
            ]);

            $this->post('/forgot-password', ['email' => $user->email])->assertRedirect();
            $token = '';
            Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
                $token = $notification->token;

                return true;
            });

            $this->post('/reset-password', [
                'token' => $token,
                'email' => $user->email,
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ])->assertRedirect('/login');

            $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));
            $this->assertNotNull($user->loginOtps()->latest('id')->firstOrFail()->consumed_at);

            Notification::fake();
            $this->post('/login', [
                'email' => $user->email,
                'password' => 'NewPassword123!',
            ])->assertRedirect('/login/otp');
            $this->assertGuest();
            Notification::assertSentTo($user, LoginOtpNotification::class);
        }
    }

    public function test_guests_and_wrong_roles_cannot_access_protected_areas(): void
    {
        $this->get('/customer')->assertRedirect('/login');
        $this->get('/seller/dashboard')->assertRedirect('/login');
        $this->get('/admin/dashboard')->assertRedirect('/login');

        $cases = [
            [UserRole::Customer, '/customer', ['/seller/dashboard', '/admin/dashboard']],
            [UserRole::Seller, '/seller/dashboard', ['/customer', '/admin/dashboard']],
            [UserRole::CenroAdmin, '/admin/dashboard', ['/customer', '/seller/dashboard']],
        ];

        foreach ($cases as [$role, $ownPath, $forbiddenPaths]) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->get($ownPath)->assertOk();

            foreach ($forbiddenPaths as $path) {
                $this->get($path)->assertForbidden();
            }

            $this->post('/logout');
        }
    }

    public function test_logout_invalidates_authentication_and_protected_access(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/customer')->assertOk();
        $this->post('/logout')->assertRedirect('/login');
        $this->assertGuest();
        $this->get('/customer')->assertRedirect('/login');
    }
}
