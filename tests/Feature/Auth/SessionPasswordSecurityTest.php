<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\AccountOtp;
use App\Models\User;
use App\Notifications\AccountOtpNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SessionPasswordSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_login_records_a_password_fingerprint_before_the_first_redirect(): void
    {
        $user = User::factory()->create(['password' => 'OriginalPassword123!']);
        $this->post('/login', ['email' => $user->email, 'password' => 'OriginalPassword123!'])
            ->assertRedirect('/')
            ->assertSessionHas('password_hash_web', $this->fingerprint($user));
    }

    #[DataProvider('protectedPages')]
    public function test_sessions_with_an_old_password_cannot_access_protected_pages(UserRole $role, string $path): void
    {
        $user = User::factory()->create(['role' => $role, 'password' => 'OriginalPassword123!']);
        $oldFingerprint = $this->fingerprint($user);
        $user->forceFill(['password' => 'ChangedPassword123!'])->save();

        $this->actingAs($user->fresh())->withSession(['password_hash_web' => $oldFingerprint])
            ->get($path)->assertRedirect('/login');
        $this->assertGuest();
        $this->assertNull(session('password_hash_web'));
    }

    public static function protectedPages(): array
    {
        return [
            'customer' => [UserRole::Customer, '/customer/orders'],
            'seller' => [UserRole::Seller, '/seller/dashboard?section=products'],
            'admin' => [UserRole::CenroAdmin, '/admin/dashboard'],
        ];
    }

    public function test_stale_sessions_cannot_checkout_or_use_the_chatbot_and_public_pages_show_a_guest(): void
    {
        foreach (['checkout', 'chatbot', 'home'] as $target) {
            $user = User::factory()->create(['password' => 'OriginalPassword123!']);
            $oldFingerprint = $this->fingerprint($user);
            $user->forceFill(['password' => 'ChangedPassword123!'])->save();
            $this->actingAs($user->fresh())->withSession(['password_hash_web' => $oldFingerprint]);

            if ($target === 'checkout') {
                $this->post('/checkout', [])->assertRedirect('/login');
                $this->assertDatabaseCount('customer_checkouts', 0);
            } elseif ($target === 'chatbot') {
                $this->getJson('/api/chatbot/latest-order')->assertUnauthorized();
            } else {
                $this->get('/')->assertRedirect('/login');
                $this->get('/')->assertOk();
            }
            $this->assertGuest();
        }
    }

    #[DataProvider('editableRoles')]
    public function test_changing_password_keeps_the_current_session_but_rejects_other_sessions(UserRole $role, string $endpoint): void
    {
        $user = User::factory()->create(['role' => $role, 'password' => 'OriginalPassword123!']);
        $this->post('/login', ['email' => $user->email, 'password' => 'OriginalPassword123!']);
        $oldSession = session()->all();
        $this->put($endpoint, [
            'current_password' => 'OriginalPassword123!', 'password' => 'ChangedPassword123!',
            'password_confirmation' => 'ChangedPassword123!',
        ])->assertSessionHasNoErrors()->assertRedirect();
        $this->assertAuthenticatedAs($user);
        $this->assertTrue(Hash::check('ChangedPassword123!', $user->fresh()->password));
        $this->assertSame($this->fingerprint($user->fresh()), session('password_hash_web'));
        $this->app['auth']->forgetGuards();
        $this->get($role === UserRole::Seller ? '/seller/dashboard?section=products' : '/customer/orders')->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withSession($oldSession)->get('/')->assertRedirect('/login');
        $this->assertGuest();
    }

    public static function editableRoles(): array
    {
        return [
            [UserRole::Customer, '/customer/password'],
            [UserRole::Seller, '/seller/password'],
        ];
    }

    public function test_a_reset_rejects_an_existing_logged_in_session(): void
    {
        $user = User::factory()->create(['password' => 'OriginalPassword123!']);
        $oldSession = [Auth::guard('web')->getName() => $user->id, 'password_hash_web' => $this->fingerprint($user)];
        $this->verifiedReset($user);
        $this->post('/reset-password', ['password' => 'ChangedPassword123!', 'password_confirmation' => 'ChangedPassword123!'])
            ->assertRedirect('/login');
        $this->app['auth']->forgetGuards();
        $this->withSession($oldSession)->get('/customer/orders')->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_a_verified_reset_permission_expires_when_the_password_changes(): void
    {
        $user = User::factory()->create(['password' => 'OriginalPassword123!']);
        $this->verifiedReset($user);
        $user->forceFill(['password' => 'ChangedElsewhere123!'])->save();
        $this->post('/reset-password', ['password' => 'AttemptedOverwrite123!', 'password_confirmation' => 'AttemptedOverwrite123!'])
            ->assertSessionHasErrors('password')->assertSessionMissing('password_reset.verified');
        $this->assertTrue(Hash::check('ChangedElsewhere123!', $user->fresh()->password));
    }

    public function test_reset_rechecks_the_password_after_acquiring_the_user_lock(): void
    {
        $user = User::factory()->create(['password' => 'OriginalPassword123!']);
        $this->verifiedReset($user);
        $changed = false;
        // Simulate a password update between the initial read and locked write.
        User::retrieved(function (User $retrieved) use ($user, &$changed): void {
            if ($changed || $retrieved->id !== $user->id) {
                return;
            }
            $changed = true;
            DB::table('users')->where('id', $user->id)->update(['password' => Hash::make('ChangedElsewhere123!')]);
        });
        $this->post('/reset-password', ['password' => 'AttemptedOverwrite123!', 'password_confirmation' => 'AttemptedOverwrite123!'])
            ->assertSessionHasErrors('password')->assertSessionMissing('password_reset.verified');
        $this->assertTrue(Hash::check('ChangedElsewhere123!', $user->fresh()->password));
    }

    public function test_old_reset_permissions_without_a_password_fingerprint_are_rejected(): void
    {
        $user = User::factory()->create(['password' => 'OriginalPassword123!']);
        $this->withSession(['password_reset.verified' => ['user_id' => $user->id, 'verified_at' => now()->getTimestamp()]])
            ->post('/reset-password', ['password' => 'AttemptedOverwrite123!', 'password_confirmation' => 'AttemptedOverwrite123!'])
            ->assertSessionHasErrors('password');
        $this->assertTrue(Hash::check('OriginalPassword123!', $user->fresh()->password));
    }

    private function verifiedReset(User $user): void
    {
        Notification::fake();
        $this->post('/forgot-password', ['email' => $user->email])->assertRedirect('/forgot-password/otp');
        $code = Notification::sent($user, AccountOtpNotification::class)
            ->first(fn (AccountOtpNotification $notification) => $notification->purpose === AccountOtp::PASSWORD_RESET)->code;
        $this->post('/forgot-password/otp', ['code' => $code])->assertRedirect('/reset-password');
    }

    private function fingerprint(User $user): string
    {
        return Auth::guard('web')->hashPasswordForCookie($user->getAuthPassword());
    }
}
