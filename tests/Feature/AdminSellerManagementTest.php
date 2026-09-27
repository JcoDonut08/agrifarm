<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\DevelopmentAccountSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSellerManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_a_verified_farmer_seller_with_a_barangay_and_temporary_password(): void
    {
        $admin = User::factory()->cenroAdmin()->create();

        $this->actingAs($admin)->post('/admin/sellers', [
            'name' => 'Manggahan Urban Farm',
            'email' => 'manggahan@example.test',
            'barangay' => 'Rosario',
            'temporary_password' => 'Starter123',
            'temporary_password_confirmation' => 'Starter123',
        ])->assertSessionHasNoErrors()->assertRedirect(route('admin.dashboard', ['section' => 'farmers-sellers']));

        $seller = User::query()->where('email', 'manggahan@example.test')->sole();
        $this->assertSame('seller', $seller->role->value);
        $this->assertSame('Rosario', $seller->barangay);
        $this->assertSame(AccountStatus::Active, $seller->account_status);
        $this->assertTrue($seller->password_must_be_changed);
        $this->assertNotNull($seller->email_verified_at);
    }

    public function test_seeded_cenro_administrator_can_sign_in(): void
    {
        $this->seed(DevelopmentAccountSeeder::class);

        $this->post('/login', ['email' => 'pasigcenro@gmail.com', 'password' => 'AgriFarm123!'])
            ->assertRedirect('/admin/dashboard');
    }

    public function test_admin_creation_validates_seller_details_and_admin_permissions(): void
    {
        $admin = User::factory()->cenroAdmin()->create();
        $seller = User::factory()->seller()->create();

        $this->actingAs($admin)->post('/admin/sellers', [
            'name' => '', 'email' => $seller->email, 'barangay' => 'Unknown', 'temporary_password' => 'short', 'temporary_password_confirmation' => 'different',
        ])->assertSessionHasErrors(['name', 'email', 'barangay', 'temporary_password']);

        $this->actingAs($seller)->post('/admin/sellers', [])->assertForbidden();
    }

    public function test_new_seller_must_replace_the_temporary_password_before_seller_access(): void
    {
        $seller = User::factory()->seller()->create(['password' => 'Starter123', 'password_must_be_changed' => true]);

        $this->actingAs($seller)->get('/seller/dashboard')->assertRedirect(route('seller.temporary-password.create'));
        $this->put('/seller/temporary-password', [
            'temporary_password' => 'Starter123',
            'password' => 'Personal123',
            'password_confirmation' => 'Personal123',
        ])->assertRedirect(route('seller.dashboard'));
        $this->assertFalse($seller->fresh()->password_must_be_changed);
    }

    public function test_suspension_hides_the_seller_and_preserves_a_reason_history_after_reinstatement(): void
    {
        $admin = User::factory()->cenroAdmin()->create();
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario', 'password' => 'Seller123']);
        $product = new Product(['name' => 'Fresh Pechay', 'category' => 'Vegetables', 'price' => 30, 'unit' => 'bunch', 'stock' => 5, 'threshold' => 1, 'photo_path' => 'products/missing.png']);
        $product->user_id = $seller->id;
        $product->save();

        $this->actingAs($admin)->post('/admin/sellers/'.$seller->id.'/suspend', ['reason' => 'Repeated inaccurate stock updates.'])
            ->assertSessionHasNoErrors();
        $this->assertSame(AccountStatus::Suspended, $seller->fresh()->account_status);
        $this->assertDatabaseHas('account_status_histories', ['user_id' => $seller->id, 'admin_id' => $admin->id, 'action' => 'suspended', 'reason' => 'Repeated inaccurate stock updates.']);

        $this->post('/logout');
        $this->post('/login', ['email' => $seller->email, 'password' => 'Seller123'])->assertSessionHasErrors('email');
        $this->get('/?page=seller&seller='.$seller->id)->assertInertia(fn ($page) => $page->missing('sellerProfile'));
        $this->get('/')->assertInertia(fn ($page) => $page->has('sellerProducts', 0));

        $this->actingAs($admin)->post('/admin/sellers/'.$seller->id.'/reinstate')->assertSessionHasNoErrors();
        $this->assertSame(AccountStatus::Active, $seller->fresh()->account_status);
        $this->assertDatabaseHas('account_status_histories', ['user_id' => $seller->id, 'admin_id' => $admin->id, 'action' => 'reinstated']);
        $this->post('/logout');
        $this->get('/')->assertInertia(fn ($page) => $page->has('sellerProducts', 1));
    }
}
