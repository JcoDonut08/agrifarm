<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderStatusEmail extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 60;

    public function __construct(public MailMessage $message)
    {
        // Snapshot the message rather than reloading an order's later status.
        $this->message = clone $message;
        // Keep these emails asynchronous even when other queues use "sync".
        $this->onConnection('database')->onQueue('order-emails')->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return $this->message;
    }

    public function backoff(): array
    {
        return [30, 120];
    }
}
