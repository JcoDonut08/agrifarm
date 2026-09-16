<?php

namespace Tests\Feature;

use App\Models\CustomerCheckout;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CustomerCheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function payload(Product $product): array
    {
        return [
            'checkout_id' => (string) Str::uuid(),
            'recipient_name' => 'Customer Rosario',
            'contact_email' => 'delivery@example.com',
            'phone' => '09171234567',
            'address' => '123 Example Street, near the barangay hall',
            'payment_method' => 'cod',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ];
    }

    public function test_customer_places_cod_order_with_locked_stock_and_owned_confirmation(): void
    {
        $seller = User::factory()->seller()->create();
        $buyer = User::factory()->create();
        $product = $this->product($seller, 3, '48.50');
        $payload = $this->payload($product);

        $this->actingAs($buyer)->post('/checkout', $payload)->assertRedirect('/?page=order-success&order='.$payload['checkout_id']);
        $this->assertDatabaseHas('customer_checkouts', ['id' => $payload['checkout_id'], 'user_id' => $buyer->id, 'contact_email' => 'delivery@example.com', 'barangay' => null, 'payment_method' => 'cod', 'goods_total' => '97.00']);
        $this->assertDatabaseHas('walk_in_orders', ['customer_checkout_id' => $payload['checkout_id'], 'product_id' => $product->id, 'user_id' => $seller->id, 'quantity' => 2, 'status' => 'pending']);
        $this->assertSame(1, $product->fresh()->stock);

        $reference = CustomerCheckout::first()->reference_number;
        $this->assertMatchesRegularExpression('/^AgFrm-[A-Z][0-9][A-Z0-9]{10}$/', $reference);
        $this->get('/?page=order-success&order='.$payload['checkout_id'])->assertInertia(fn (Assert $page) => $page
            ->where('checkoutOrder.recipientName', 'Customer Rosario')
            ->where('checkoutOrder.reference', $reference)
            ->where('checkoutOrder.items.0.quantity', 2)
            ->where('checkoutOrder.items.0.photoUrl', '/marketplace/products/'.$product->id.'/photo')
            ->etc());
        $this->post('/checkout', $payload)->assertRedirect('/?page=order-success&order='.$payload['checkout_id']);
        $this->assertSame(1, $product->fresh()->stock);
        $this->assertSame(1, CustomerCheckout::count());
        $this->assertSame(1, WalkInOrder::count());

        $this->actingAs($seller)->get('/seller/dashboard?section=orders')->assertInertia(fn (Assert $page) => $page
            ->where('orders.0.checkout.reference_number', CustomerCheckout::first()->reference_number)
            ->etc());

        $other = User::factory()->create();
        $this->actingAs($other)->get('/?page=order-success&order='.$payload['checkout_id'])->assertInertia(fn (Assert $page) => $page->missing('checkoutOrder')->etc());
        $this->post('/checkout', $payload)->assertNotFound();
    }

    public function test_each_checkout_gets_a_unique_readable_reference(): void
    {
        $seller = User::factory()->seller()->create();
        $buyer = User::factory()->create();
        $product = $this->product($seller, 5);

        $this->actingAs($buyer)->post('/checkout', $this->payload($product))->assertRedirect();
        $this->post('/checkout', $this->payload($product))->assertRedirect();

        $references = CustomerCheckout::pluck('reference_number');
        $this->assertCount(2, $references);
        $this->assertCount(2, $references->unique());
        $this->assertTrue($references->every(fn ($reference) => (bool) preg_match('/^AgFrm-[A-Z][0-9][A-Z0-9]{10}$/', $reference)));
    }

    public function test_checkout_rejects_non_customer_unavailable_stock_and_online_payment(): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 1);
        $payload = $this->payload($product);
        $this->post('/checkout', $payload)->assertRedirect('/login');
        $this->actingAs($seller)->post('/checkout', $payload)->assertForbidden();
        $this->actingAs(User::factory()->create())->post('/checkout', $payload)->assertSessionHasErrors('items');
        $this->post('/checkout', array_replace($payload, ['payment_method' => 'card']))->assertSessionHasErrors('payment_method');
        $this->post('/checkout', array_replace($payload, ['payment_method' => 'gcash']))->assertSessionHasErrors('payment_method');
        $this->post('/checkout', array_replace($payload, ['payment_method' => 'maya']))->assertSessionHasErrors('payment_method');
        $this->assertSame(1, $product->fresh()->stock);
        $this->assertSame(0, CustomerCheckout::count());
    }

    public function test_checkout_rejects_products_without_a_real_seller_and_duplicate_lines(): void
    {
        $buyer = User::factory()->create();
        $product = $this->product($buyer, 3);
        $payload = $this->payload($product);
        $this->actingAs($buyer)->post('/checkout', $payload)->assertSessionHasErrors('items');
        $payload['items'][] = $payload['items'][0];
        $this->post('/checkout', $payload)->assertSessionHasErrors('items.0.product_id');
        $this->assertSame(0, CustomerCheckout::count());
    }

    private function product(User $owner, int $stock, string $price = '48.50'): Product
    {
        $product = new Product([
            'name' => 'Garden Pechay', 'category' => 'Vegetables', 'description' => 'Fresh produce',
            'price' => $price, 'unit' => 'bunch', 'stock' => $stock, 'threshold' => 1,
            'photo_path' => 'test/pechay.png',
        ]);
        $product->user_id = $owner->id;
        $product->save();

        return $product;
    }
}
