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
            'phone' => '09171234567',
            'address' => '123 Example Street, near the barangay hall',
            'barangay' => 'Rosario',
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

        $this->actingAs($buyer)->post('/checkout', $payload)->assertRedirect('/?page=checkout&order='.$payload['checkout_id']);
        $this->assertDatabaseHas('customer_checkouts', ['id' => $payload['checkout_id'], 'user_id' => $buyer->id, 'payment_method' => 'cod', 'goods_total' => '97.00']);
        $this->assertDatabaseHas('walk_in_orders', ['customer_checkout_id' => $payload['checkout_id'], 'product_id' => $product->id, 'user_id' => $seller->id, 'quantity' => 2, 'status' => 'pending']);
        $this->assertSame(1, $product->fresh()->stock);

        $this->get('/?page=checkout&order='.$payload['checkout_id'])->assertInertia(fn (Assert $page) => $page
            ->where('checkoutOrder.recipientName', 'Customer Rosario')
            ->where('checkoutOrder.items.0.quantity', 2)
            ->etc());
        $this->post('/checkout', $payload)->assertRedirect('/?page=checkout&order='.$payload['checkout_id']);
        $this->assertSame(1, $product->fresh()->stock);
        $this->assertSame(1, CustomerCheckout::count());
        $this->assertSame(1, WalkInOrder::count());

        $other = User::factory()->create();
        $this->actingAs($other)->get('/?page=checkout&order='.$payload['checkout_id'])->assertInertia(fn (Assert $page) => $page->missing('checkoutOrder')->etc());
        $this->post('/checkout', $payload)->assertNotFound();
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
