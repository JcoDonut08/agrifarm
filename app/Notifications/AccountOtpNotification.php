<?php

namespace App\Notifications;

use App\Models\AccountOtp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountOtpNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $code,
        public readonly int $expiresMinutes,
        public readonly string $purpose,
    ) {
        $this->onConnection('deferred');
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        if ($this->purpose === AccountOtp::PASSWORD_RESET) {
            return (new MailMessage)
                ->subject('Your AgriFarm password reset code')
                ->view(['html' => 'mail.auth-otp', 'text' => 'mail.auth-otp-text'], [
                    'preheader' => 'Use this one-time code to continue your AgriFarm password reset.',
                    'eyebrow' => 'Account recovery',
                    'title' => 'Reset your AgriFarm password',
                    'recipientName' => $notifiable->name,
                    'intro' => 'We received a request to create a new password for your AgriFarm marketplace account.',
                    'codeLabel' => 'Password reset code',
                    'code' => $this->code,
                    'expiresMinutes' => $this->expiresMinutes,
                    'securityNote' => 'If you did not request this change, you can safely ignore this email. Your current password will remain active.',
                ]);
        }

        return (new MailMessage)
            ->subject('Welcome to AgriFarm — verify your account')
            ->view(['html' => 'mail.auth-otp', 'text' => 'mail.auth-otp-text'], [
                'preheader' => 'Verify your new AgriFarm customer account with this one-time code.',
                'eyebrow' => 'Welcome to the marketplace',
                'title' => 'Verify your AgriFarm account',
                'recipientName' => $notifiable->name,
                'intro' => 'Thanks for joining AgriFarm. Verify your email to start shopping for fresh produce from local growers.',
                'codeLabel' => 'Account verification code',
                'code' => $this->code,
                'expiresMinutes' => $this->expiresMinutes,
                'securityNote' => 'If you did not create an AgriFarm account, you can safely ignore this email.',
            ]);
    }
}
