<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LoginOtpNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $code,
        public readonly int $expiresMinutes,
    ) {}

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
            ->subject('Your AgriFarm login code')
            ->greeting("Hello {$notifiable->name},")
            ->line('Use this one-time code to finish signing in to AgriFarm:')
            ->line("Login code: {$this->code}")
            ->line("This code expires in {$this->expiresMinutes} minutes and can only be used once.")
            ->line('If you did not try to sign in, you can ignore this message.');
    }
}
