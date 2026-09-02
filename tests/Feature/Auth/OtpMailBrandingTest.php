<?php

namespace Tests\Feature\Auth;

use App\Models\AccountOtp;
use App\Models\User;
use App\Notifications\AccountOtpNotification;
use Tests\TestCase;

class OtpMailBrandingTest extends TestCase
{
    public function test_registration_otp_uses_agrifarm_account_verification_branding(): void
    {
        $user = User::factory()->make(['name' => 'Maria Customer']);
        $notification = new AccountOtpNotification('123456', 10, AccountOtp::EMAIL_VERIFICATION);
        $message = $notification->toMail($user);
        $html = (string) $message->render();

        $this->assertSame('deferred', $notification->connection);
        $this->assertSame('Welcome to AgriFarm — verify your account', $message->subject);
        $this->assertStringContainsString('Verify your AgriFarm account', $html);
        $this->assertStringContainsString('Account verification code', $html);
        $this->assertStringContainsString('local agricultural e-commerce marketplace', $html);
        $this->assertStringNotContainsString('Loveby', $html);
    }

    public function test_password_reset_message_has_agrifarm_account_recovery_branding(): void
    {
        $user = User::factory()->make(['name' => 'Maria Customer']);
        $resetNotification = new AccountOtpNotification('654321', 10, AccountOtp::PASSWORD_RESET);
        $reset = $resetNotification->toMail($user);

        $this->assertSame('deferred', $resetNotification->connection);
        $this->assertSame('Your AgriFarm password reset code', $reset->subject);
        $this->assertStringContainsString('Reset your AgriFarm password', (string) $reset->render());
    }
}
