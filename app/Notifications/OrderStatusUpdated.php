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
        return $notifiable->order_update_emails ? ['database', 'mail'] : ['database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $data = $this->toArray($notifiable);
        $cancelled = $this->order->status === 'cancelled';
        [$title, $intro, $statusLabel] = match ($this->order->status) {
            'cancelled' => ['Order item cancelled', 'The seller has cancelled this item in your order.', 'Cancelled'],
            'preparing' => ['Your item is being prepared', 'The seller is preparing this item for your order.', 'Preparing'],
            'out_for_delivery' => ['Your item is out for delivery', 'This item is on its way to you.', 'Out for delivery'],
            'delivered' => ['Your item has been delivered', 'The seller has marked this item as delivered.', 'Delivered'],
            'reservation' => ['Your item is reserved', 'This item has been reserved for your order.', 'Reserved'],
            default => ['Your order has an update', 'Check your orders for the latest status of this item.', ucfirst(str_replace('_', ' ', $this->order->status))],
        };
        $reason = match ($this->order->cancellation_reason) {
            'reserved_elsewhere' => 'The available harvest was reserved for another customer.',
            'out_of_stock' => 'The seller has run out of this product.',
            'harvest_unavailable' => 'The expected harvest is no longer available.',
            'other' => 'Other reason.',
            default => 'The seller did not record a cancellation reason.',
        };
        $reference = $data['reference'] ?: '#WALK-'.str_pad((string) $this->order->id, 5, '0', STR_PAD_LEFT);

        return (new MailMessage)
            ->subject($title.' — '.$reference)
            ->view(['html' => 'mail.order-status', 'text' => 'mail.order-status-text'], [
                'title' => $title,
                'intro' => $intro,
                'recipientName' => $this->order->checkout?->recipient_name ?: ($notifiable->name ?? 'there'),
                'reference' => $reference,
                'productName' => $this->order->product_name,
                'quantity' => $this->order->quantity,
                'unit' => match ($this->order->unit) {
                    'piece', 'pieces' => $this->order->quantity === 1 ? 'piece' : 'pieces',
                    'bunch', 'bunches' => $this->order->quantity === 1 ? 'bunch' : 'bunches',
                    default => $this->order->unit,
                },
                'statusLabel' => $statusLabel,
                'cancelled' => $cancelled,
                'reason' => $reason,
                'note' => $cancelled ? $this->order->cancellation_note : null,
                'ordersUrl' => url('/customer/orders'),
            ]);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $seller = $this->order->seller;
        $avatar = $seller?->avatar_url;
        if ($avatar && str_starts_with($avatar, '/seller/profile/photo?image=')) {
            $avatar = '/marketplace/sellers/'.$seller->id.'/photo?v='.substr(sha1($avatar), 0, 12);
        }

        return [
            'title' => $this->order->status === 'cancelled' ? 'Order cancelled' : 'Order updated',
            'message' => 'Your order for '.$this->order->product_name.' is now '.str_replace('_', ' ', $this->order->status).'.',
            'order_id' => $this->order->id,
            'reference' => $this->order->checkout?->reference_number,
            'product_name' => $this->order->product_name,
            'seller_id' => $seller?->id,
            'seller_name' => $seller?->name,
            'seller_avatar_url' => $avatar,
            'status' => $this->order->status,
            'cancellation_reason' => $this->order->cancellation_reason,
            'cancellation_note' => $this->order->cancellation_note,
            'url' => '/customer/orders',
        ];
    }
}
