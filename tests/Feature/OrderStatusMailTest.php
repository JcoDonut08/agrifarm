<?php

namespace Tests\Feature;

use App\Models\CustomerCheckout;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Notifications\OrderStatusUpdated;
use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OrderStatusMailTest extends TestCase
{
    public function test_cancelled_item_email_identifies_the_item_and_escapes_seller_text(): void
    {
        URL::forceRootUrl('https://agrifarm.example');
        URL::forceScheme('https');
        $order = $this->order('cancelled');
        $order->cancellation_reason = 'reserved_elsewhere';
        $order->cancellation_note = '<script>alert("note")</script> We cannot supply this harvest.';
        $mail = (new OrderStatusUpdated($order))->toMail(new User(['name' => 'Customer']));
        $html = (string) $mail->render();

        $this->assertSame('Order item cancelled — AgFrm-TEST123456', $mail->subject);
        $this->assertStringContainsString('Hi Test Customer,', $html);
        $this->assertStringContainsString('AgFrm-TEST123456', $html);
        $this->assertStringContainsString('Cabbage &amp; Pechay', $html);
        $this->assertStringContainsString('2 bunches', $html);
        $this->assertStringContainsString('The available harvest was reserved for another customer.', $html);
        $this->assertStringContainsString('Message from the seller', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('View my orders', $html);
        $this->assertStringContainsString('https://agrifarm.example/customer/orders', $html);
        $this->assertSame(['html' => 'mail.order-status', 'text' => 'mail.order-status-text'], $mail->view);
        $plain = view('mail.order-status-text', $mail->viewData)->render();
        $this->assertStringContainsString('Reason for cancellation:', $plain);
        $this->assertStringContainsString('AgFrm-TEST123456', $plain);
    }

    #[DataProvider('updates')]
    public function test_other_status_updates_use_clear_item_labels_without_cancellation_details(string $status, string $label): void
    {
        $order = $this->order($status);
        $order->cancellation_note = 'Old cancellation note';
        $mail = (new OrderStatusUpdated($order))->toMail(new User(['name' => 'Customer']));
        $html = (string) $mail->render();

        $this->assertSame($label, $mail->viewData['statusLabel']);
        $this->assertStringContainsString($label, $html);
        $this->assertStringNotContainsString('Reason for cancellation', $html);
        $this->assertStringNotContainsString('Old cancellation note', $html);
        $this->assertStringContainsString('View my orders', $html);
    }

    public static function updates(): array
    {
        return [
            ['pending', 'Pending'], ['reservation', 'Reserved'], ['preparing', 'Preparing'],
            ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered'],
        ];
    }

    public function test_older_cancelled_item_without_a_reason_uses_an_honest_fallback(): void
    {
        $order = $this->order('cancelled');
        $order->setRelation('checkout', null);
        $mail = (new OrderStatusUpdated($order))->toMail(new User(['name' => 'Customer']));
        $html = (string) $mail->render();

        $this->assertStringContainsString('#WALK-00042', $html);
        $this->assertStringContainsString('Hi Customer,', $html);
        $this->assertStringContainsString('The seller did not record a cancellation reason.', $html);
        $this->assertStringNotContainsString('Message from the seller', $html);
    }

    private function order(string $status): WalkInOrder
    {
        $order = new WalkInOrder(['product_name' => 'Cabbage & Pechay', 'quantity' => 2, 'unit' => 'bunch', 'status' => $status]);
        $order->id = 42;
        $order->setRelation('checkout', new CustomerCheckout(['reference_number' => 'AgFrm-TEST123456', 'recipient_name' => 'Test Customer']));

        return $order;
    }
}
