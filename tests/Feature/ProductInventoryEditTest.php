<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProductInventoryEditTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('inventorySources')]
    public function test_saving_other_details_preserves_quantities_reserved_after_the_form_was_opened(string $field): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, $field);
        $payload = $this->payload($product);
        $this->placeOrder($product);
        $payload['description'] = 'Updated description';

        $this->actingAs($seller)->patch('/seller/products/'.$product->id, $payload)->assertSessionHasNoErrors();

        $this->assertSame(7, $product->fresh()->{$field});
        $this->assertSame('Updated description', $product->fresh()->description);
        $this->assertDatabaseCount('walk_in_orders', 1);
    }

    #[DataProvider('inventorySources')]
    public function test_an_outdated_manual_inventory_change_is_rejected_without_saving_other_changes(string $field): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, $field);
        $payload = $this->payload($product);
        $payload[$field] = 12;
        $payload['description'] = 'Must not be saved';
        $this->placeOrder($product);

        $this->actingAs($seller)->patch('/seller/products/'.$product->id, $payload)->assertSessionHasErrors($field);

        $this->assertSame(7, $product->fresh()->{$field});
        $this->assertSame('Fresh harvest', $product->fresh()->description);
        // Reviewing the latest quantity allows an intentional correction.
        $payload['original_'.$field] = 7;
        $this->patch('/seller/products/'.$product->id, $payload)->assertSessionHasNoErrors();
        $this->assertSame(12, $product->fresh()->{$field});
    }

    public static function inventorySources(): array
    {
        return ['available stock' => ['stock'], 'expected harvest' => ['expected_yield']];
    }

    #[DataProvider('manualCorrections')]
    public function test_sellers_can_intentionally_set_zero_or_add_inventory(string $field, int $original, int $requested): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, $field);
        $product->update([$field => $original]);
        $payload = $this->payload($product);
        $payload[$field] = $requested;

        $this->actingAs($seller)->patch('/seller/products/'.$product->id, $payload)->assertSessionHasNoErrors();
        $this->assertSame($requested, $product->fresh()->{$field});
    }

    public static function manualCorrections(): array
    {
        return [
            'mark stock unavailable' => ['stock', 10, 0],
            'restock' => ['stock', 0, 6],
            'remove expected harvest' => ['expected_yield', 10, 0],
            'add expected harvest' => ['expected_yield', 0, 6],
        ];
    }

    public function test_inventory_fields_require_the_original_quantities_but_metadata_only_edits_do_not(): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 'stock');
        $payload = $this->payload($product);
        unset($payload['original_stock'], $payload['original_expected_yield']);
        $this->actingAs($seller)->patch('/seller/products/'.$product->id, $payload)->assertSessionHasErrors(['original_stock', 'original_expected_yield']);
        $this->assertSame(10, $product->fresh()->stock);

        unset($payload['stock'], $payload['expected_yield']);
        $payload['description'] = 'Metadata-only update';
        $this->patch('/seller/products/'.$product->id, $payload)->assertSessionHasNoErrors();
        $this->assertSame(10, $product->fresh()->stock);
        $this->assertSame('Metadata-only update', $product->fresh()->description);
    }

    public function test_a_stale_inventory_edit_with_a_new_photo_keeps_the_original_photo_and_cleans_up_the_upload(): void
    {
        Storage::fake('local');
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller, 'stock');
        Storage::disk('local')->put($product->photo_path, 'original photo');
        $payload = $this->payload($product);
        $payload['stock'] = 12;
        $payload['photo'] = extension_loaded('gd')
            ? UploadedFile::fake()->image('replacement.png')
            : UploadedFile::fake()->createWithContent('replacement.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII='));
        $this->placeOrder($product);

        $this->actingAs($seller)->post('/seller/products/'.$product->id, [...$payload, '_method' => 'patch'])->assertSessionHasErrors('stock');
        $this->assertSame('products/original.png', $product->fresh()->photo_path);
        $this->assertSame(['products/original.png'], Storage::disk('local')->allFiles());
    }

    private function placeOrder(Product $product): void
    {
        $this->actingAs(User::factory()->create())->post('/checkout', [
            'checkout_id' => (string) Str::uuid(), 'recipient_name' => 'Test Customer',
            'phone' => '09171234567', 'address' => '123 Example Street, Rosario', 'payment_method' => 'cod',
            'items' => [['product_id' => $product->id, 'quantity' => 3]],
        ])->assertSessionHasNoErrors();
    }

    private function payload(Product $product): array
    {
        return [
            'name' => $product->name, 'category' => 'Vegetables', 'description' => $product->description,
            'price' => '35.50', 'unit' => 'bunch', 'threshold' => 2,
            'stock' => $product->stock, 'expected_yield' => $product->expected_yield,
            'original_stock' => $product->stock, 'original_expected_yield' => $product->expected_yield,
        ];
    }

    private function product(User $seller, string $field): Product
    {
        $product = new Product([
            'name' => 'Garden Pechay', 'category' => 'Vegetables', 'description' => 'Fresh harvest',
            'price' => '35.50', 'unit' => 'bunch', 'stock' => $field === 'stock' ? 10 : 0,
            'expected_yield' => $field === 'expected_yield' ? 10 : 0,
            'threshold' => 2, 'photo_path' => 'products/original.png',
        ]);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }
}
