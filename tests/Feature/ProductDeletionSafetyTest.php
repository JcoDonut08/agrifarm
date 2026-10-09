<?php

namespace Tests\Feature;

use App\Models\HarvestRecord;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Services\ProductPhotoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProductDeletionSafetyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('local');
    }

    #[DataProvider('activeDeletionCases')]
    public function test_unfinished_orders_block_deletion_and_preserve_all_selected_products(string $status, bool $bulk): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, $status === 'reservation');
        $freeProduct = $this->product($seller);
        $this->actingAs($seller)->post('/seller/orders/walk-in', ['product_id' => $product->id, 'quantity' => 3])
            ->assertSessionHasNoErrors();
        $order = WalkInOrder::query()->sole();
        $order->update(['status' => $status]);
        $harvest = new HarvestRecord(['product_id' => $product->id, 'product_name' => $product->name,
            'quantity' => 10, 'unit' => 'kg', 'harvest_date' => now()->toDateString()]);
        $harvest->user_id = $seller->id;
        $harvest->save();
        $product->refresh();
        $originalStock = $product->stock;
        $originalYield = $product->expected_yield;

        $this->deleteProducts($product, $freeProduct, $bulk)->assertSessionHasErrors($bulk ? 'product_ids' : 'product');

        foreach ([$product, $freeProduct] as $selected) {
            $this->assertDatabaseHas('products', ['id' => $selected->id]);
            Storage::disk('local')->assertExists($selected->photo_path);
            Storage::disk('local')->assertExists(app(ProductPhotoService::class)->thumbnailPath($selected->photo_path));
        }
        $this->assertSame($product->id, $order->fresh()->product_id);
        $this->assertSame($status, $order->fresh()->status);
        $this->assertSame($product->id, $harvest->fresh()->product_id);
        $this->assertSame($originalStock, $product->fresh()->stock);
        $this->assertSame($originalYield, $product->fresh()->expected_yield);

        // The preserved link still permits reservation restoration, and deletion
        // becomes available once the last active order reaches a terminal state.
        if ($status === 'out_for_delivery') {
            $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'delivered'])->assertSessionHasNoErrors();
        } else {
            $this->patch('/seller/orders/'.$order->id.'/status', ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock'])
                ->assertSessionHasNoErrors();
            $this->assertSame($status === 'reservation' ? 0 : 10, $product->fresh()->stock);
            $this->assertSame($status === 'reservation' ? 10 : 0, $product->fresh()->expected_yield);
        }
        $this->deleteProducts($product, $freeProduct, $bulk)->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
        $this->assertNull($order->fresh()->product_id);
        $this->assertNull($harvest->fresh()->product_id);
        $this->assertSame($product->name, $order->fresh()->product_name);
        $this->assertSame('10.000', $harvest->fresh()->quantity);
        Storage::disk('local')->assertMissing($product->photo_path);
        Storage::disk('local')->assertMissing(app(ProductPhotoService::class)->thumbnailPath($product->photo_path));
        if ($bulk) {
            $this->assertDatabaseMissing('products', ['id' => $freeProduct->id]);
            Storage::disk('local')->assertMissing($freeProduct->photo_path);
        }
    }

    public static function activeDeletionCases(): array
    {
        $cases = [];
        foreach (['pending', 'reservation', 'preparing', 'out_for_delivery'] as $status) {
            foreach ([false, true] as $bulk) {
                $cases[$status.($bulk ? ' bulk' : ' single')] = [$status, $bulk];
            }
        }

        return $cases;
    }

    public function test_zero_stock_without_orders_can_still_be_deleted_and_unrelated_orders_do_not_block_it(): void
    {
        $seller = User::factory()->seller()->create();
        $zeroStock = $this->product($seller);
        $zeroStock->update(['stock' => 0]);
        $activeProduct = $this->product($seller);
        $this->actingAs($seller)->post('/seller/orders/walk-in', ['product_id' => $activeProduct->id, 'quantity' => 3]);

        $this->delete('/seller/products/'.$zeroStock->id)->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('products', ['id' => $zeroStock->id]);
        $this->assertSame($activeProduct->id, WalkInOrder::query()->sole()->product_id);
        $this->assertSame(7, $activeProduct->fresh()->stock);
    }

    public function test_a_closed_order_does_not_allow_deletion_if_another_order_is_still_active(): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller);
        $this->actingAs($seller);
        $this->post('/seller/orders/walk-in', ['product_id' => $product->id, 'quantity' => 2]);
        $this->post('/seller/orders/walk-in', ['product_id' => $product->id, 'quantity' => 2]);
        $orders = WalkInOrder::orderBy('id')->get();
        $this->patch('/seller/orders/'.$orders[0]->id.'/status', ['status' => 'cancelled', 'cancellation_reason' => 'out_of_stock']);

        $this->delete('/seller/products/'.$product->id)->assertSessionHasErrors('product');
        $this->assertSame($product->id, $orders[0]->fresh()->product_id);
        $this->assertSame($product->id, $orders[1]->fresh()->product_id);
        $this->assertSame(8, $product->fresh()->stock);
    }

    private function deleteProducts(Product $product, Product $freeProduct, bool $bulk): TestResponse
    {
        return $bulk
            ? $this->delete('/seller/products', ['product_ids' => [$freeProduct->id, $product->id]])
            : $this->delete('/seller/products/'.$product->id);
    }

    private function product(User $seller, bool $preorder = false): Product
    {
        $path = 'products/'.$seller->id.'/'.Str::uuid().'.webp';
        Storage::disk('local')->put($path, 'original photo');
        Storage::disk('local')->put(app(ProductPhotoService::class)->thumbnailPath($path), 'thumbnail');
        $product = new Product(['name' => 'Deletion Test Pechay', 'category' => 'Vegetables',
            'price' => '35.50', 'unit' => 'kg', 'stock' => $preorder ? 0 : 10,
            'expected_yield' => $preorder ? 10 : 0, 'threshold' => 2, 'photo_path' => $path]);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }
}
