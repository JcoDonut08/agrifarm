<?php

namespace Tests\Feature;

use App\Models\CustomerCheckout;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Notifications\OrderStatusEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Channels\MailChannel;
use Illuminate\Queue\WorkerOptions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class OrderStatusQueueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['mail.default' => 'array']);
    }

    public function test_order_update_and_in_app_notice_finish_before_email_is_sent(): void
    {
        [$seller, $buyer, , $order] = $this->order();
        // Other application queues can remain synchronous, including OTP mail.
        $this->assertSame('sync', config('queue.default'));
        $this->update($seller, $order, 'preparing');

        $this->assertSame('preparing', $order->fresh()->status);
        $this->assertSame('preparing', $buyer->notifications()->sole()->data['status']);
        $this->assertDatabaseCount('jobs', 1);
        $this->assertDatabaseHas('jobs', ['queue' => 'order-emails', 'attempts' => 0]);
        $this->assertCount(0, Mail::getSymfonyTransport()->messages());

        $this->processNextEmail();
        $this->assertDatabaseCount('jobs', 0);
        $this->assertSame(1, $buyer->notifications()->count());
        $email = Mail::getSymfonyTransport()->messages()->sole()->getOriginalMessage();
        $this->assertSame($buyer->email, $email->getTo()[0]->getAddress());
        $this->assertStringContainsString('Your item is being prepared', $email->getSubject());
        $this->assertStringContainsString('Queue Pechay', $email->getHtmlBody());
        $this->assertStringContainsString('AgFrm-QUEUE123456', $email->getTextBody());
    }

    public function test_delayed_emails_keep_the_status_at_the_time_of_each_update(): void
    {
        [$seller, $buyer, , $order] = $this->order();
        $this->update($seller, $order, 'preparing');
        $this->update($seller, $order, 'out_for_delivery');
        $this->assertDatabaseCount('jobs', 2);
        $this->assertSame(2, $buyer->notifications()->count());

        $this->processNextEmail();
        $this->processNextEmail();
        $emails = Mail::getSymfonyTransport()->messages()->values();
        $this->assertStringContainsString('Your item is being prepared', $emails[0]->getOriginalMessage()->getSubject());
        $this->assertStringContainsString('Your item is out for delivery', $emails[1]->getOriginalMessage()->getSubject());
        $this->assertDatabaseCount('jobs', 0);
    }

    public function test_rollback_removes_the_notice_and_does_not_queue_email(): void
    {
        [$seller, $buyer, , $order] = $this->order();
        DB::beginTransaction();
        try {
            $this->update($seller, $order, 'preparing');
            $this->assertSame(1, $buyer->notifications()->count());
            $this->assertDatabaseCount('jobs', 0);
        } finally {
            DB::rollBack();
        }

        $this->assertSame('pending', $order->fresh()->status);
        $this->assertSame(0, $buyer->notifications()->count());
        $this->assertDatabaseCount('jobs', 0);
        $this->assertCount(0, Mail::getSymfonyTransport()->messages());
    }

    public function test_temporary_mail_failure_retries_without_repeating_inventory_or_notices(): void
    {
        [$seller, $buyer, $product, $order] = $this->order();
        $this->update($seller, $order, 'cancelled', [
            'cancellation_reason' => 'other', 'cancellation_note' => 'The harvest was damaged by heavy rain.',
        ]);
        $this->mock(MailChannel::class)->shouldReceive('send')->once()->andThrow(new RuntimeException('Temporary mail outage'));

        try {
            $this->processNextEmail();
            $this->fail('The mail transport should fail on its first attempt.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Temporary mail outage', $exception->getMessage());
        }
        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertSame(5, $product->fresh()->stock);
        $this->assertSame(1, $buyer->notifications()->count());
        $this->assertDatabaseHas('jobs', ['attempts' => 1, 'reserved_at' => null]);
        $this->assertNull(Queue::connection('database')->pop('order-emails'));

        $this->app->forgetInstance(MailChannel::class);
        Notification::getFacadeRoot()->forgetDrivers();
        $this->travel(31)->seconds();
        $this->processNextEmail();
        $email = Mail::getSymfonyTransport()->messages()->sole()->getOriginalMessage();
        $this->assertStringContainsString('The harvest was damaged by heavy rain.', $email->getHtmlBody());
        $this->assertStringContainsString('Order item cancelled', $email->getSubject());
        $this->assertDatabaseCount('jobs', 0);
        $this->assertSame(5, $product->fresh()->stock);
        $this->assertSame(1, $buyer->notifications()->count());
    }

    public function test_exhausted_email_retries_are_recorded_without_undoing_the_order(): void
    {
        [$seller, $buyer, , $order] = $this->order();
        $this->update($seller, $order, 'preparing');
        $this->mock(MailChannel::class)->shouldReceive('send')->times(3)->andThrow(new RuntimeException('Mail service unavailable'));

        // The real Artisan worker registers Laravel's failed-job persistence.
        foreach ([0, 31, 121] as $seconds) {
            $this->travel($seconds)->seconds();
            $this->artisan('queue:work', [
                'connection' => 'database', '--queue' => 'order-emails', '--once' => true,
                '--tries' => 3, '--timeout' => 60,
            ])->assertSuccessful();
        }

        $this->assertDatabaseCount('jobs', 0);
        $this->assertDatabaseCount('failed_jobs', 1);
        $this->assertDatabaseHas('failed_jobs', ['connection' => 'database', 'queue' => 'order-emails']);
        $this->assertSame('preparing', $order->fresh()->status);
        $this->assertSame(1, $buyer->notifications()->count());
    }

    public function test_invalid_or_unauthorized_updates_do_not_create_jobs(): void
    {
        [$seller, $buyer, , $order] = $this->order();
        $this->actingAs(User::factory()->seller()->create())->patch('/seller/orders/'.$order->id.'/status', ['status' => 'preparing'])
            ->assertNotFound();
        $this->actingAs($seller)->patch('/seller/orders/'.$order->id.'/status', ['status' => 'delivered'])
            ->assertSessionHasErrors('status');
        $this->assertDatabaseCount('jobs', 0);
        $this->assertSame(0, $buyer->notifications()->count());
        $this->assertSame('pending', $order->fresh()->status);
    }

    public function test_walk_in_order_without_a_customer_does_not_queue_mail(): void
    {
        [$seller, , , $order] = $this->order();
        $order->forceFill(['customer_checkout_id' => null])->save();
        $this->update($seller, $order, 'preparing');
        $this->assertDatabaseCount('jobs', 0);
        $this->assertDatabaseCount('notifications', 0);
        $this->assertSame('preparing', $order->fresh()->status);
    }

    private function update(User $seller, WalkInOrder $order, string $status, array $fields = []): void
    {
        $this->actingAs($seller)->patch('/seller/orders/'.$order->id.'/status', ['status' => $status, ...$fields])
            ->assertSessionHasNoErrors()->assertRedirect('/seller/dashboard?section=orders');
    }

    private function processNextEmail(): void
    {
        $job = Queue::connection('database')->pop('order-emails');
        $this->assertNotNull($job);
        $this->assertSame(OrderStatusEmail::class, $job->payload()['displayName']);
        $this->app->make('queue.worker')->process('database', $job, new WorkerOptions(maxTries: 3));
    }

    private function order(): array
    {
        $seller = User::factory()->seller()->create();
        $buyer = User::factory()->create();
        $checkout = CustomerCheckout::create([
            'id' => (string) Str::uuid(), 'user_id' => $buyer->id, 'reference_number' => 'AgFrm-QUEUE123456',
            'recipient_name' => 'Test Customer', 'phone' => '09123456789', 'address' => 'Test address',
            'barangay' => 'Rosario', 'goods_total' => 70,
        ]);
        $product = new Product(['name' => 'Queue Pechay', 'category' => 'Vegetables', 'price' => 35,
            'unit' => 'bunch', 'stock' => 3, 'expected_yield' => 0, 'threshold' => 2]);
        $product->forceFill(['user_id' => $seller->id, 'photo_path' => 'products/queue-pechay.png'])->save();
        $order = new WalkInOrder(['product_name' => $product->name, 'unit' => 'bunch', 'quantity' => 2,
            'unit_price' => 35, 'total' => 70, 'status' => 'pending']);
        $order->forceFill(['user_id' => $seller->id, 'product_id' => $product->id,
            'customer_checkout_id' => $checkout->id, 'inventory_source' => 'stock'])->save();

        return [$seller, $buyer, $product, $order];
    }
}
