<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\PendingRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.google.client_id' => 'google-client-id',
            'services.google.client_secret' => 'google-client-secret',
            'services.google.redirect' => 'http://localhost/auth/google/callback',
        ]);
    }

    public function test_google_registration_redirect_requires_legal_acceptance(): void
    {
        $this->get('/auth/google/redirect?intent=register')
            ->assertRedirect('/register')
            ->assertSessionHasErrors('legal');
    }

    public function test_google_redirect_uses_state_and_pkce(): void
    {
        $response = $this->get('/auth/google/redirect?intent=register&legal=1');

        $location = (string) $response->headers->get('Location');
        $this->assertStringStartsWith('https://accounts.google.com/o/oauth2/v2/auth?', $location);
        $this->assertStringContainsString('code_challenge_method=S256', $location);
        $response->assertSessionHas('oauth.google.intent', 'register');
        $response->assertSessionHas('oauth.google.state');
        $response->assertSessionHas('oauth.google.verifier');
    }

    public function test_verified_google_profile_can_create_and_authenticate_a_customer(): void
    {
        PendingRegistration::query()->create([
            'name' => 'Pending Google Customer',
            'email' => 'google@example.test',
            'password' => 'StrongPassword123!',
            'terms_accepted_at' => now(),
            'privacy_accepted_at' => now(),
        ]);
        $this->fakeGoogleProfile('google@example.test', 'Google Customer');

        $this->withSession(['oauth.google' => $this->oauthSession('register')])
            ->get('/auth/google/callback?state=valid-state&code=authorization-code')
            ->assertRedirect('/customer');

        $user = User::query()->sole();
        $this->assertAuthenticatedAs($user);
        $this->assertSame('google@example.test', $user->email);
        $this->assertSame('Google Customer', $user->name);
        $this->assertSame(UserRole::Customer, $user->role);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertNotNull($user->terms_accepted_at);
        $this->assertNotNull($user->privacy_accepted_at);
        $this->assertDatabaseCount('pending_registrations', 0);
    }

    public function test_google_login_creates_and_authenticates_a_customer_when_the_email_is_new(): void
    {
        $this->fakeGoogleProfile('new@example.test', 'New Customer');

        $this->withSession(['oauth.google' => $this->oauthSession('login')])
            ->get('/auth/google/callback?state=valid-state&code=authorization-code')
            ->assertRedirect('/customer');

        $user = User::query()->sole();
        $this->assertAuthenticatedAs($user);
        $this->assertSame('new@example.test', $user->email);
        $this->assertSame('New Customer', $user->name);
        $this->assertSame(UserRole::Customer, $user->role);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertNotNull($user->terms_accepted_at);
        $this->assertNotNull($user->privacy_accepted_at);
    }

    public function test_google_login_authenticates_an_existing_account_without_changing_its_password(): void
    {
        $user = User::factory()->create([
            'email' => 'existing@example.test',
            'password' => 'ExistingPassword123!',
        ]);
        $this->fakeGoogleProfile($user->email, 'Different Google Name');

        $this->withSession(['oauth.google' => $this->oauthSession('login')])
            ->get('/auth/google/callback?state=valid-state&code=authorization-code')
            ->assertRedirect('/customer');

        $this->assertAuthenticatedAs($user);
        $this->assertTrue(Hash::check('ExistingPassword123!', $user->fresh()->password));
        $this->assertSame($user->name, $user->fresh()->name);
    }

    public function test_google_callback_rejects_an_invalid_state(): void
    {
        Http::fake();

        $this->withSession(['oauth.google' => $this->oauthSession('login')])
            ->get('/auth/google/callback?state=wrong-state&code=authorization-code')
            ->assertRedirect('/login')
            ->assertSessionHasErrors('google');

        Http::assertNothingSent();
        $this->assertGuest();
    }

    /** @return array<string, int|string> */
    private function oauthSession(string $intent): array
    {
        return [
            'state' => 'valid-state',
            'verifier' => 'valid-code-verifier',
            'intent' => $intent,
            'started_at' => now()->getTimestamp(),
        ];
    }

    private function fakeGoogleProfile(string $email, string $name): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'google-access-token',
                'token_type' => 'Bearer',
            ]),
            'https://openidconnect.googleapis.com/v1/userinfo' => Http::response([
                'sub' => 'google-user-id',
                'email' => $email,
                'email_verified' => true,
                'name' => $name,
            ]),
        ]);
    }
}
