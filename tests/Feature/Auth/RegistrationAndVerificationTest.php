<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RegistrationAndVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_creates_only_an_unverified_customer_and_records_legal_acceptance(): void
    {
        Notification::fake();

        $response = $this->post('/register', [
            'name' => 'Maria Customer',
            'email' => 'MARIA@EXAMPLE.TEST',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
            'terms' => true,
            'privacy' => true,
        ]);

        $response->assertRedirect('/email/verify');
        $this->assertGuest();

        $user = User::query()->sole();
        $this->assertSame('maria@example.test', $user->email);
        $this->assertSame(UserRole::Customer, $user->role);
        $this->assertNull($user->email_verified_at);
        $this->assertNotNull($user->terms_accepted_at);
        $this->assertNotNull($user->privacy_accepted_at);
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_registration_rejects_role_manipulation(): void
    {
        $this->post('/register', [
            'name' => 'Role Attacker',
            'email' => 'attacker@example.test',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
            'terms' => true,
            'privacy' => true,
            'role' => UserRole::CenroAdmin->value,
        ])->assertSessionHasErrors('role');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_requires_terms_and_privacy_acceptance(): void
    {
        $this->post('/register', [
            'name' => 'No Consent',
            'email' => 'no-consent@example.test',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
        ])->assertSessionHasErrors(['terms', 'privacy']);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_customer_can_view_resend_and_complete_email_verification(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();

        $this->withSession(['verification.user_id' => $user->id])
            ->get('/email/verify')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/VerifyEmail')
                ->where('email', $user->email)
                ->where('authenticated', false));

        $this->withSession(['verification.user_id' => $user->id])
            ->post('/email/verification-notification')
            ->assertRedirect();
        Notification::assertSentTo($user, VerifyEmail::class);

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(30), [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);

        $this->get($url)->assertRedirect('/login');
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_public_legal_pages_are_available(): void
    {
        $this->get('/terms')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Legal/Terms'));
        $this->get('/privacy')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Legal/Privacy'));
    }
}
