<?php

namespace Tests\Feature;

use App\Models\CustomerCheckout;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ChatbotOrderTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('endpoints')]
    public function test_guests_cannot_look_up_orders(string $endpoint): void
    {
        $this->checkout(User::factory()->create());
        $this->getJson($endpoint)->assertUnauthorized();
    }

    public static function endpoints(): array
    {
        return [['/api/chatbot/latest-order'], ['/api/chatbot/order-status?reference=AgFrm-A1ABCDEFGHIJ']];
    }

    #[DataProvider('nonCustomerEndpoints')]
    public function test_seller_and_admin_accounts_cannot_use_customer_order_lookup(string $role, string $endpoint): void
    {
        $user = User::factory()->create(['role' => $role]);
        $this->checkout($user);
        $this->actingAs($user)->getJson($endpoint)->assertForbidden();
    }

    public static function nonCustomerEndpoints(): array
    {
        $cases = [];
        foreach (['seller', 'cenro_admin'] as $role) {
            foreach (self::endpoints() as [$endpoint]) {
                $cases[] = [$role, $endpoint];
            }
        }

        return $cases;
    }

    public function test_customer_can_read_own_order_without_exposing_checkout_contact_details(): void
    {
        $customer = User::factory()->create();
        $checkout = $this->checkout($customer);
        $this->actingAs($customer)->getJson('/api/chatbot/order-status?reference='.$checkout->reference_number)
            ->assertOk()->assertExactJson([
                'reference' => $checkout->reference_number,
                'status' => 'pending',
                'summary' => '2x Pechay (Pending)',
            ]);
    }

    public function test_other_customers_references_and_unknown_references_have_the_same_response(): void
    {
        $checkout = $this->checkout(User::factory()->create());
        $this->actingAs(User::factory()->create());
        $this->getJson('/api/chatbot/order-status?reference='.$checkout->reference_number)
            ->assertOk()->assertExactJson(['status' => 'not_found']);
        $this->getJson('/api/chatbot/order-status?reference=AgFrm-Z9ZZZZZZZZZZ')
            ->assertOk()->assertExactJson(['status' => 'not_found']);
    }

    #[DataProvider('invalidReferences')]
    public function test_reference_validation_rejects_missing_non_string_and_oversized_values(mixed $reference): void
    {
        $this->actingAs(User::factory()->create())
            ->getJson('/api/chatbot/order-status?'.http_build_query(['reference' => $reference]))
            ->assertUnprocessable()->assertJsonValidationErrors('reference');
    }

    public static function invalidReferences(): array
    {
        return [[null], [''], [['AgFrm-A1ABCDEFGHIJ']], [str_repeat('A', 65)]];
    }

    public function test_order_with_multiple_statuses_includes_every_item(): void
    {
        $customer = User::factory()->create();
        $checkout = $this->checkout($customer, ['delivered', 'preparing']);
        $this->actingAs($customer)->getJson('/api/chatbot/order-status?reference='.$checkout->reference_number)
            ->assertOk()->assertExactJson([
                'reference' => $checkout->reference_number,
                'status' => 'processing',
                'summary' => '2x Pechay (Delivered), 2x Kamatis (Preparing)',
            ]);
    }

    public function test_latest_order_only_summarizes_the_customers_active_items(): void
    {
        $customer = User::factory()->create();
        $older = $this->checkout($customer, ['pending', 'delivered']);
        $older->forceFill(['created_at' => now()->subMinute()])->save();
        $this->checkout($customer, ['preparing'], 'AgFrm-B2ABCDEFGHIJ');
        $this->checkout(User::factory()->create(), ['pending'], 'AgFrm-C3ABCDEFGHIJ', 'Private crop');
        $this->actingAs($customer)->getJson('/api/chatbot/latest-order')
            ->assertOk()->assertExactJson([
                'reference' => 'multiple_active',
                'status' => 'active_multiple',
                'summary' => "2x Pechay (Preparing)\n- 2x Pechay (Pending)",
            ]);
    }

    public function test_latest_order_falls_back_to_the_customers_most_recent_closed_checkout(): void
    {
        $customer = User::factory()->create();
        $older = $this->checkout($customer, ['delivered']);
        $older->forceFill(['created_at' => now()->subDay()])->save();
        $latest = $this->checkout($customer, ['cancelled'], 'AgFrm-B2ABCDEFGHIJ');
        $this->checkout(User::factory()->create(), ['pending'], 'AgFrm-C3ABCDEFGHIJ');
        $this->actingAs($customer)->getJson('/api/chatbot/latest-order')
            ->assertOk()->assertExactJson([
                'reference' => $latest->reference_number,
                'status' => 'cancelled',
                'summary' => '2x Pechay (Cancelled)',
            ]);
    }

    public function test_customers_without_orders_receive_no_other_customers_order_data(): void
    {
        $this->checkout(User::factory()->create());
        $this->actingAs(User::factory()->create())->getJson('/api/chatbot/latest-order')
            ->assertOk()->assertExactJson(['status' => 'not_found']);
    }

    public function test_checkout_without_items_is_not_reported_as_an_order(): void
    {
        $customer = User::factory()->create();
        $checkout = $this->checkout($customer, []);
        $this->actingAs($customer)->getJson('/api/chatbot/order-status?reference='.$checkout->reference_number)
            ->assertOk()->assertExactJson(['status' => 'not_found']);
        $this->getJson('/api/chatbot/latest-order')->assertOk()->assertExactJson(['status' => 'not_found']);
    }

    public function test_order_lookup_is_rate_limited(): void
    {
        $this->actingAs(User::factory()->create());
        for ($attempt = 0; $attempt < 30; $attempt++) {
            $this->getJson('/api/chatbot/order-status?reference=unknown')->assertOk();
        }
        $this->getJson('/api/chatbot/order-status?reference=unknown')->assertTooManyRequests();
    }

    private function checkout(User $customer, array $statuses = ['pending'], string $reference = 'AgFrm-A1ABCDEFGHIJ', string $crop = 'Pechay'): CustomerCheckout
    {
        $checkout = CustomerCheckout::create([
            'id' => (string) Str::uuid(), 'user_id' => $customer->id,
            'reference_number' => $reference, 'recipient_name' => 'Private recipient',
            'phone' => '09171234567', 'address' => 'Private delivery address',
            'contact_email' => 'private@example.com', 'notes' => 'Private delivery notes',
            'payment_method' => 'cod', 'goods_total' => 70,
        ]);
        $seller = User::factory()->seller()->create();
        foreach ($statuses as $index => $status) {
            $item = new WalkInOrder([
                'customer_name' => 'Private recipient',
                'product_name' => $index === 0 ? $crop : 'Kamatis', 'unit' => 'kg',
                'quantity' => 2, 'unit_price' => 35, 'total' => 70, 'status' => $status,
            ]);
            $item->user_id = $seller->id;
            $checkout->items()->save($item);
        }

        return $checkout;
    }
}
