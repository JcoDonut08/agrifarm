<?php

namespace App\Notifications;

use App\Models\WalkInOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderStatusUpdated extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public WalkInOrder $order) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $data = $this->toArray($notifiable);
        $mail = (new MailMessage)->subject($data['title'])->line($data['message']);
        if ($this->order->status === 'cancelled') {
            $mail->line('Reason: '.(WalkInOrder::CANCELLATION_REASONS[$this->order->cancellation_reason] ?? 'No reason recorded.'));
            if ($this->order->cancellation_note) {
                $mail->line($this->order->cancellation_note);
            }
        }

        return $mail->action('View your orders', url('/customer/orders'));
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->order->status === 'cancelled' ? 'Order cancelled' : 'Order updated',
            'message' => 'Your order for '.$this->order->product_name.' is now '.str_replace('_', ' ', $this->order->status).'.',
            'order_id' => $this->order->id,
            'reference' => $this->order->checkout?->reference_number,
            'product_name' => $this->order->product_name,
            'status' => $this->order->status,
            'cancellation_reason' => $this->order->cancellation_reason,
            'cancellation_note' => $this->order->cancellation_note,
            'url' => '/customer/orders',
        ];
    }
}
