<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LoginOtpNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $code,
        public readonly int $expiresMinutes,
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
        return (new MailMessage)
            ->subject('Your AgriFarm sign-in code')
            ->view(['html' => 'mail.auth-otp', 'text' => 'mail.auth-otp-text'], [
                'preheader' => 'Use this one-time code to finish signing in to AgriFarm.',
                'eyebrow' => 'Secure sign in',
                'title' => 'Complete your AgriFarm sign in',
                'recipientName' => $notifiable->name,
                'intro' => 'Enter this code on the AgriFarm sign-in screen to securely access your marketplace account.',
                'codeLabel' => 'Sign-in code',
                'code' => $this->code,
                'expiresMinutes' => $this->expiresMinutes,
                'securityNote' => 'If you did not try to sign in, you can safely ignore this email. Never share this code with anyone.',
            ]);
    }
}
