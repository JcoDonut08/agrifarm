<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SellerEmailChangeNotification extends Notification
{
    public function __construct(public readonly string $url) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)->subject('Confirm your AgriFarm email address')
            ->line('Confirm this email address for your barangay seller account. Sign in with your existing email if prompted.')
            ->action('Confirm email address', $this->url)
            ->line('This link expires in 30 minutes. If you did not request this change, ignore this email.');
    }
}
