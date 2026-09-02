<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\AccountOtp;
use App\Models\PendingRegistration;
use App\Models\User;
use App\Notifications\AccountOtpNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RegistrationAndVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_creates_a_verified_customer_only_after_correct_otp(): void
    {
        Notification::fake();

        $response = $this->post('/register', [
            'name' => 'Maria Customer',
            'email' => 'MARIA@EXAMPLE.TEST',
            'password' => 'StrongPassword123!',
            'legal' => true,
        ]);

        $response->assertRedirect('/email/verify');
        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);

        $pending = PendingRegistration::query()->sole();
        $this->assertSame('maria@example.test', $pending->email);
        $this->assertNotNull($pending->terms_accepted_at);
        $this->assertNotNull($pending->privacy_accepted_at);

        $code = '';
        Notification::assertSentTo($pending, AccountOtpNotification::class, function (AccountOtpNotification $notification) use (&$code): bool {
            $code = $notification->code;

            return $notification->purpose === AccountOtp::EMAIL_VERIFICATION;
        });

        $this->post('/email/verify', ['code' => $code])
            ->assertRedirect('/login');

        $user = User::query()->sole();
        $this->assertSame('maria@example.test', $user->email);
        $this->assertSame(UserRole::Customer, $user->role);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertTrue(Hash::check('StrongPassword123!', $user->password));
        $this->assertNotNull($user->terms_accepted_at);
        $this->assertNotNull($user->privacy_accepted_at);
        $this->assertDatabaseCount('pending_registrations', 0);
    }

    public function test_incorrect_otp_keeps_registration_pending_and_does_not_create_user(): void
    {
        Notification::fake();

        $this->post('/register', [
            'name' => 'Pending Customer',
            'email' => 'pending@example.test',
            'password' => 'StrongPassword123!',
            'legal' => true,
        ])->assertRedirect('/email/verify');

        $pending = PendingRegistration::query()->sole();
        $notification = Notification::sent($pending, AccountOtpNotification::class)->sole();
        $wrongCode = $notification->code === '000000' ? '111111' : '000000';

        $this->post('/email/verify', ['code' => $wrongCode])
            ->assertSessionHasErrors('code');

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseHas('pending_registrations', ['email' => 'pending@example.test']);
    }

    public function test_an_incomplete_registration_can_restart_with_the_same_email(): void
    {
        Notification::fake();

        foreach (['First Name', 'Updated Name'] as $name) {
            $this->post('/register', [
                'name' => $name,
                'email' => 'retry@example.test',
                'password' => 'StrongPassword123!',
                'legal' => true,
            ])->assertRedirect('/email/verify');
        }

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('pending_registrations', 1);
        $this->assertDatabaseHas('pending_registrations', [
            'email' => 'retry@example.test',
            'name' => 'Updated Name',
        ]);
    }

    public function test_registration_rejects_role_manipulation(): void
    {
        $this->post('/register', [
            'name' => 'Role Attacker',
            'email' => 'attacker@example.test',
            'password' => 'StrongPassword123!',
            'legal' => true,
            'role' => UserRole::CenroAdmin->value,
        ])->assertSessionHasErrors('role');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_requires_legal_acceptance(): void
    {
        $this->post('/register', [
            'name' => 'No Consent',
            'email' => 'no-consent@example.test',
            'password' => 'StrongPassword123!',
        ])->assertSessionHasErrors('legal');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_pending_customer_can_view_resend_and_complete_email_verification(): void
    {
        Notification::fake();
        config(['auth.account_otp.resend_cooldown_seconds' => 0]);

        $this->post('/register', [
            'name' => 'Resend Customer',
            'email' => 'resend@example.test',
            'password' => 'StrongPassword123!',
            'legal' => true,
        ])->assertRedirect('/email/verify');

        $pending = PendingRegistration::query()->sole();

        $this->get('/email/verify')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/VerifyEmail')
                ->where('email', fn (string $email): bool => str_ends_with($email, '@example.test'))
                ->where('authenticated', false));

        $this->post('/email/verification-notification')
            ->assertRedirect();

        Notification::assertSentToTimes($pending, AccountOtpNotification::class, 2);
        $notification = Notification::sent($pending, AccountOtpNotification::class)->last();
        $this->assertInstanceOf(AccountOtpNotification::class, $notification);

        $this->post('/email/verify', ['code' => $notification->code])
            ->assertRedirect('/login');

        $this->assertTrue(User::query()->sole()->hasVerifiedEmail());
        $this->assertDatabaseCount('pending_registrations', 0);
    }

    public function test_public_legal_pages_are_available(): void
    {
        $this->get('/terms')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Legal/Terms'));
        $this->get('/privacy')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Legal/Privacy'));
    }
}
