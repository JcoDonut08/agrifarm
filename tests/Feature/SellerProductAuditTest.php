<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Services\AuditLogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SellerProductAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('local');
    }

    private function payload(array $overrides = []): array
    {
        return [...['name' => 'Audit Pechay', 'category' => 'Vegetables', 'description' => 'Fresh harvest', 'price' => '25.00', 'unit' => 'bunch', 'stock' => 10, 'threshold' => 2], ...$overrides];
    }

    private function product(User $seller): Product
    {
        $product = new Product($this->payload(['photo_path' => 'products/example.png']));
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }

    public function test_creation_and_edit_are_recorded_with_the_actual_seller_and_visible_to_admin(): void
    {
        $seller = User::factory()->seller()->create(['name' => 'Rosario Farm', 'barangay' => 'Rosario']);
        $admin = User::factory()->cenroAdmin()->create();
        $this->actingAs($seller)->post('/seller/products', $this->payload(['photo' => UploadedFile::fake()->image('pechay.png')]))->assertSessionHasNoErrors();
        $product = Product::query()->sole();
        $this->assertDatabaseHas('audit_logs', ['admin_id' => null, 'actor_id' => $seller->id, 'actor_name' => $seller->name, 'seller_id' => $seller->id, 'action_type' => 'product_create', 'details' => 'Product #'.$product->id.': Audit Pechay']);
        $this->patch('/seller/products/'.$product->id, $this->payload(['price' => '30.00', 'stock' => 12, 'original_stock' => 10]))->assertSessionHasNoErrors();
        $this->assertDatabaseHas('audit_logs', ['action_type' => 'product_update', 'details' => 'Product #'.$product->id.': Audit Pechay. Changed: price, available stock.']);
        $this->actingAs($admin)->get('/admin/dashboard?section=audit-logs')->assertInertia(fn (Assert $page) => $page
            ->has('auditLogs', 2)
            ->where('auditLogs.0.action', 'Updated product')
            ->where('auditLogs.0.actorName', $seller->name)
            ->where('auditLogs.0.actorRole', 'seller')
            ->where('auditLogs.0.adminName', null)
            ->where('auditLogs.0.seller.name', $seller->name)
            ->where('auditLogs.1.action', 'Created product'));
    }

    public function test_invalid_unauthorized_noop_and_conflicting_edits_do_not_create_audit_entries(): void
    {
        $seller = User::factory()->seller()->create();
        $other = User::factory()->seller()->create();
        $product = $this->product($seller);
        $this->actingAs($seller)->post('/seller/products', $this->payload(['price' => -1]))->assertSessionHasErrors();
        $this->actingAs($other)->patch('/seller/products/'.$product->id, $this->payload(['price' => 30]))->assertNotFound();
        $this->actingAs(User::factory()->create())->post('/seller/products', $this->payload())->assertForbidden();
        $this->actingAs($seller)->patch('/seller/products/'.$product->id, $this->payload(['original_stock' => 10]))->assertSessionHasNoErrors();
        $product->update(['stock' => 8]);
        $this->patch('/seller/products/'.$product->id, $this->payload(['stock' => 12, 'original_stock' => 10]))->assertSessionHasErrors('stock');
        $this->assertDatabaseCount('audit_logs', 0);
        $this->assertSame(8, $product->fresh()->stock);
    }

    public function test_successful_single_and_bulk_deletion_preserve_product_names_in_history(): void
    {
        $seller = User::factory()->seller()->create();
        $products = [$this->product($seller), $this->product($seller), $this->product($seller)];
        $this->actingAs($seller)->delete('/seller/products/'.$products[0]->id)->assertSessionHasNoErrors();
        $this->delete('/seller/products', ['product_ids' => [$products[1]->id, $products[2]->id]])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('products', 0);
        $this->assertDatabaseCount('audit_logs', 3);
        foreach ($products as $product) {
            $this->assertDatabaseHas('audit_logs', ['action_type' => 'product_delete', 'actor_id' => $seller->id, 'details' => 'Product #'.$product->id.': '.$product->name]);
        }
    }

    public function test_blocked_bulk_deletion_does_not_log_or_delete_any_selected_product(): void
    {
        $seller = User::factory()->seller()->create();
        $product = $this->product($seller);
        $other = $this->product($seller);
        $order = new WalkInOrder(['product_name' => $product->name, 'unit' => 'bunch', 'quantity' => 1, 'unit_price' => 25, 'total' => 25, 'status' => 'pending']);
        $order->forceFill(['user_id' => $seller->id, 'product_id' => $product->id])->save();
        $this->actingAs($seller)->delete('/seller/products', ['product_ids' => [$product->id, $other->id]])->assertSessionHasErrors('product_ids');
        $this->assertDatabaseCount('products', 2);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_seller_history_survives_account_deletion_with_actor_and_subject_snapshots(): void
    {
        $seller = User::factory()->seller()->create(['name' => 'Original Farm']);
        $seller->forceFill(['avatar_url' => '/seller/profile/photo?image=history.png'])->save();
        $product = $this->product($seller);
        $this->actingAs($seller)->patch('/seller/products/'.$product->id, $this->payload(['price' => 30, 'original_stock' => 10]))->assertSessionHasNoErrors();
        $seller->update(['name' => 'Renamed Farm']);
        $seller->delete();
        $log = app(AuditLogService::class)->logs()[0];
        $this->assertSame('Original Farm', $log['actorName']);
        $this->assertSame('Original Farm', $log['seller']['name']);
        $this->assertSame('seller', $log['actorRole']);
        $this->assertNull($log['seller']['id']);
        $this->assertNull($log['seller']['avatarUrl']);
    }

    public function test_old_admin_entries_continue_to_identify_the_admin_without_actor_columns_populated(): void
    {
        $admin = User::factory()->cenroAdmin()->create();
        $seller = User::factory()->seller()->create();
        $log = AuditLog::record($admin, 'Updated seller details', 'Seller details updated', $seller, 'update');
        $log->update(['actor_id' => null, 'actor_name' => null]);
        $formatted = app(AuditLogService::class)->logs()[0];
        $this->assertSame($admin->name, $formatted['actorName']);
        $this->assertSame('cenro_admin', $formatted['actorRole']);
    }

    public function test_audit_failure_rolls_back_product_creation_and_cleans_up_uploaded_photos(): void
    {
        $seller = User::factory()->seller()->create();
        $this->withoutExceptionHandling();
        AuditLog::creating(fn () => throw new \RuntimeException('Audit unavailable'));
        try {
            $this->actingAs($seller)->post('/seller/products', $this->payload(['photo' => UploadedFile::fake()->image('pechay.png')]));
            $this->fail('The failed audit insert must abort creation.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Audit unavailable', $exception->getMessage());
        } finally {
            AuditLog::flushEventListeners();
        }
        $this->assertDatabaseCount('products', 0);
        $this->assertDatabaseCount('audit_logs', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }
}
