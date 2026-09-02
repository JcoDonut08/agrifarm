<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\LoginOtp;
use App\Models\User;
use App\Notifications\LoginOtpNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class LoginOtpTest extends TestCase
{
    use RefreshDatabase;

    public function test_correct_credentials_do_not_authenticate_before_customer_otp(): void
    {
        $user = User::factory()->create(['password' => 'StrongPassword123!']);
        $code = $this->startLogin($user);

        $this->assertGuest();
        $this->get('/customer')->assertRedirect('/login');
        $this->assertDatabaseHas('login_otps', ['user_id' => $user->id, 'attempts' => 0]);

        $this->post('/login/otp', ['code' => $code])->assertRedirect('/customer');
        $this->assertAuthenticatedAs($user);
    }

    public function test_all_roles_complete_otp_and_receive_their_server_selected_redirect(): void
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
            $code = $this->startLogin($user);

            $this->post('/login/otp', ['code' => $code])->assertRedirect($path);
            $this->assertAuthenticatedAs($user);
            $this->post('/logout')->assertRedirect('/login');
        }
    }

    public function test_incorrect_expired_and_used_codes_cannot_authenticate(): void
    {
        $user = User::factory()->create(['password' => 'StrongPassword123!']);
        $code = $this->startLogin($user);

        $this->post('/login/otp', ['code' => '000000'])->assertSessionHasErrors('code');
        $this->assertGuest();
        $this->assertSame(1, LoginOtp::query()->latest('id')->value('attempts'));

        LoginOtp::query()->latest('id')->firstOrFail()->update(['expires_at' => now()->subSecond()]);
        $this->post('/login/otp', ['code' => $code])->assertSessionHasErrors('code');
        $this->assertGuest();

        $used = LoginOtp::query()->latest('id')->firstOrFail();
        $this->assertNotNull($used->fresh()->consumed_at);
        $this->withSession([
            'auth.pending' => [
                'user_id' => $user->id,
                'remember' => false,
                'started_at' => now()->timestamp,
            ],
        ])->post('/login/otp', ['code' => $code])->assertSessionHasErrors('code');
        $this->assertGuest();
    }

    public function test_failed_attempt_limit_invalidates_code_and_pending_sign_in(): void
    {
        config(['auth.login_otp.max_attempts' => 2]);
        $user = User::factory()->create(['password' => 'StrongPassword123!']);
        $this->startLogin($user);

        $this->post('/login/otp', ['code' => '000000'])->assertSessionHasErrors('code');
        $this->post('/login/otp', ['code' => '111111'])
            ->assertSessionHasErrors('code')
            ->assertSessionMissing('auth.pending');

        $this->assertNotNull(LoginOtp::query()->latest('id')->firstOrFail()->consumed_at);
        $this->assertGuest();
    }

    public function test_resend_invalidates_previous_code_and_accepts_only_the_new_code(): void
    {
        config(['auth.login_otp.resend_cooldown_seconds' => 0]);
        $user = User::factory()->create(['password' => 'StrongPassword123!']);
        $oldCode = $this->startLogin($user);
        $newCode = null;

        $this->post('/login/otp/resend')->assertRedirect();
        Notification::assertSentTo($user, LoginOtpNotification::class, function (LoginOtpNotification $notification) use (&$newCode): bool {
            $newCode = $notification->code;

            return true;
        });

        $this->post('/login/otp', ['code' => $oldCode])->assertSessionHasErrors('code');
        $this->assertGuest();
        $this->post('/login/otp', ['code' => $newCode])->assertRedirect('/customer');
        $this->assertAuthenticatedAs($user);
        $this->assertSame(2, LoginOtp::query()->where('user_id', $user->id)->count());
        $this->assertSame(2, LoginOtp::query()->where('user_id', $user->id)->whereNotNull('consumed_at')->count());
    }

    public function test_resend_is_throttled_by_cooldown(): void
    {
        config(['auth.login_otp.resend_cooldown_seconds' => 60]);
        $user = User::factory()->create(['password' => 'StrongPassword123!']);
        $this->startLogin($user);

        $this->post('/login/otp/resend')->assertSessionHasErrors('code');
        $this->assertSame(1, LoginOtp::query()->where('user_id', $user->id)->count());
    }

    private function startLogin(User $user): string
    {
        Notification::fake();
        $code = '';

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'StrongPassword123!',
            'remember' => true,
        ])->assertRedirect('/login/otp')->assertSessionHas('auth.pending.user_id', $user->id);

        Notification::assertSentTo($user, LoginOtpNotification::class, function (LoginOtpNotification $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        });

        $this->assertNotSame('', $code);

        return $code;
    }
}
