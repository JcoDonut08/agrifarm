<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProductStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_status_migration_upgrades_legacy_products_without_changing_inventory(): void
    {
        $product = $this->product(User::factory()->seller()->create());
        $this->removeStatusColumn();

        $migration = require database_path('migrations/2026_10_07_000000_ensure_product_status_column.php');
        $migration->up();

        $this->assertDatabaseHas('products', ['id' => $product->id, 'status' => 'active', 'stock' => 12]);
        // Raw inserts also receive the database default, independently of Eloquent.
        $row = (array) DB::table('products')->find($product->id);
        unset($row['id'], $row['status']);
        $id = DB::table('products')->insertGetId($row);
        $this->assertDatabaseHas('products', ['id' => $id, 'status' => 'active']);
    }

    public function test_status_migration_preserves_existing_moderation_and_backfills_only_missing_statuses(): void
    {
        $active = $this->product(User::factory()->seller()->create());
        $hidden = $this->product(User::factory()->seller()->create());
        $this->removeStatusColumn();
        Schema::table('products', function (Blueprint $table) {
            $table->string('status', 20)->nullable();
        });
        DB::table('products')->where('id', $hidden->id)->update(['status' => 'delisted']);

        $migration = require database_path('migrations/2026_10_07_000000_ensure_product_status_column.php');
        $migration->up();
        $migration->up();
        $migration->down();

        $this->assertDatabaseHas('products', ['id' => $active->id, 'status' => 'active', 'stock' => 12]);
        $this->assertDatabaseHas('products', ['id' => $hidden->id, 'status' => 'delisted', 'stock' => 12]);
        $newProduct = $this->product($active->seller);
        $this->assertSame('active', $newProduct->fresh()->status);
    }

    public function test_admin_can_hide_and_restore_products_but_seller_edits_cannot_restore_them(): void
    {
        $this->withoutVite();
        $admin = User::factory()->cenroAdmin()->create();
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $customer = User::factory()->create();
        $product = $this->product($seller);
        $this->assertSame('active', $product->fresh()->status);
        $this->actingAs($customer)->get('/?page=marketplace')->assertInertia(fn (Assert $page) => $page->has('marketplaceResults.products', 1));

        $this->actingAs($seller)->post(route('admin.products.delist', $product))->assertForbidden();
        $this->actingAs($admin)->post(route('admin.products.delist', $product))->assertRedirect();
        $this->assertSame('delisted', $product->fresh()->status);
        $this->actingAs($customer)->get('/?page=marketplace')->assertInertia(fn (Assert $page) => $page->has('sellerProducts', 0));

        $this->actingAs($seller)->patch('/seller/products/'.$product->id, [
            'name' => 'Updated Pechay',
            'category' => 'Vegetables',
            'description' => 'Fresh harvest',
            'price' => '35.50',
            'unit' => 'kg',
            'stock' => 12,
            'original_stock' => 12,
            'threshold' => 2,
            'status' => 'active',
        ])->assertSessionHasNoErrors();
        $this->assertSame('delisted', $product->fresh()->status);
        $this->actingAs($seller)->post(route('admin.products.relist', $product))->assertForbidden();
        $this->actingAs($admin)->post(route('admin.products.relist', $product))->assertRedirect();
        $this->actingAs($customer)->get('/?page=marketplace')->assertInertia(fn (Assert $page) => $page
            ->has('marketplaceResults.products', 1)
            ->where('marketplaceResults.products.0.name', 'Updated Pechay'));
    }

    private function removeStatusColumn(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn('status');
        });
    }

    private function product(User $seller): Product
    {
        $product = new Product([
            'name' => 'Fresh Pechay',
            'category' => 'Vegetables',
            'description' => 'Fresh harvest',
            'price' => '35.50',
            'unit' => 'kg',
            'stock' => 12,
            'threshold' => 2,
            'photo_path' => 'products/test.png',
        ]);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }
}
