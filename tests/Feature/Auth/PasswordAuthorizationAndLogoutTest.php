<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\AccountOtp;
use App\Models\LoginOtp;
use App\Models\User;
use App\Notifications\AccountOtpNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordAuthorizationAndLogoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_reset_works_for_every_role_and_next_login_uses_the_new_password(): void
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

            $this->post('/forgot-password', ['email' => $user->email])
                ->assertRedirect('/forgot-password/otp')
                ->assertSessionHas('password_reset.pending.user_id', $user->id);
            $code = '';
            Notification::assertSentTo($user, AccountOtpNotification::class, function (AccountOtpNotification $notification) use (&$code): bool {
                if ($notification->purpose !== AccountOtp::PASSWORD_RESET) {
                    return false;
                }

                $code = $notification->code;

                return true;
            });

            $this->post('/forgot-password/otp', ['code' => $code])
                ->assertRedirect('/reset-password')
                ->assertSessionHas('password_reset.verified.user_id', $user->id);

            $this->post('/reset-password', [
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ])->assertRedirect('/login');

            $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));
            $this->assertNotNull($user->loginOtps()->latest('id')->firstOrFail()->consumed_at);

            $this->post('/login', [
                'email' => $user->email,
                'password' => 'NewPassword123!',
            ])->assertRedirect(match ($role) {
                UserRole::Customer => '/customer',
                UserRole::Seller => '/seller/dashboard',
                UserRole::CenroAdmin => '/admin/dashboard',
            });
            $this->assertAuthenticatedAs($user);
            $this->post('/logout');
        }
    }

    public function test_password_cannot_be_changed_without_verifying_the_email_code(): void
    {
        $user = User::factory()->create(['password' => 'OldPassword123!']);

        $this->get('/reset-password')->assertRedirect('/forgot-password');
        $this->post('/reset-password', [
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertSessionHasErrors('password');

        $this->assertTrue(Hash::check('OldPassword123!', $user->fresh()->password));
    }

    public function test_incorrect_password_reset_code_does_not_unlock_password_change(): void
    {
        Notification::fake();
        $user = User::factory()->create(['password' => 'OldPassword123!']);

        $this->post('/forgot-password', ['email' => $user->email])
            ->assertRedirect('/forgot-password/otp');

        $code = '';
        Notification::assertSentTo($user, AccountOtpNotification::class, function (AccountOtpNotification $notification) use (&$code): bool {
            $code = $notification->code;

            return $notification->purpose === AccountOtp::PASSWORD_RESET;
        });
        $wrongCode = $code === '000000' ? '111111' : '000000';

        $this->post('/forgot-password/otp', ['code' => $wrongCode])
            ->assertSessionHasErrors('code')
            ->assertSessionMissing('password_reset.verified');

        $this->post('/reset-password', [
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertSessionHasErrors('password');

        $this->assertTrue(Hash::check('OldPassword123!', $user->fresh()->password));
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
