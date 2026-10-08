<?php

namespace Tests\Feature;

use App\Models\AdminTask;
use App\Models\Product;
use App\Models\User;
use App\Models\WalkInOrder;
use App\Services\WeatherService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_cenro_dashboard_summarizes_live_marketplace_data(): void
    {
        $this->withoutVite();
        $weather = Mockery::mock(WeatherService::class);
        $weather->shouldReceive('current')->once()->andReturn(null);
        $this->app->instance(WeatherService::class, $weather);

        $admin = User::factory()->cenroAdmin()->create();
        $rosario = User::factory()->seller()->create(['name' => 'Barangay Rosario', 'barangay' => 'Rosario', 'avatar_url' => 'https://example.test/rosario.png']);
        $maybunga = User::factory()->seller()->create(['name' => 'Barangay Maybunga', 'barangay' => 'Maybunga']);
        User::factory()->seller()->create(['name' => 'Generic development seller']);
        $task = new AdminTask(['title' => 'Review seller records', 'due_date' => now()->addDay()->toDateString()]);
        $task->user_id = $admin->id;
        $task->save();
        $rosarioProduct = $this->product($rosario, 'Pechay', 1, 3);
        $maybungaProduct = $this->product($maybunga, 'Tomato', 0, 2);

        $this->order($rosario, $rosarioProduct, '250.00', 'delivered', now()->subMonth());
        $this->order($rosario, $rosarioProduct, '100.00', 'pending', now());
        $this->order($maybunga, $maybungaProduct, '125.00', 'delivered', now());
        $this->order($maybunga, $maybungaProduct, '80.00', 'preparing', now());

        $this->actingAs($admin)->get('/admin/dashboard')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Dashboard')
                ->where('dashboard.summary.totalSales', 375)
                ->where('dashboard.summary.activeSellers', 2)
                ->where('dashboard.summary.totalOrders', 4)
                ->where('dashboard.summary.completedOrders', 2)
                ->where('dashboard.summary.leadingBarangay.name', 'Rosario')
                ->where('dashboard.summary.leadingBarangay.sales', 250)
                ->has('dashboard.barangays', 2)
                ->where('dashboard.barangays.0.name', 'Rosario')
                ->where('dashboard.barangays.0.avatarUrl', 'https://example.test/rosario.png')
                ->where('dashboard.barangays.0.orders', 2)
                ->where('dashboard.barangays.0.completedOrders', 1)
                ->where('dashboard.barangays.0.products', 1)
                ->has('dashboard.monthlySales.months', 12)
                ->has('dashboard.monthlySales.series', 2)
                ->where('dashboard.monthlySales.series.0.name', 'Rosario')
                ->where('dashboard.monthlySales.series.0.sales.10', 250)
                ->where('dashboard.monthlySales.series.1.name', 'Maybunga')
                ->where('dashboard.monthlySales.series.1.sales.11', 125)
                ->has('dashboard.todo', 1)
                ->where('dashboard.todo.0.title', 'Review seller records')
                ->where('dashboard.todo.0.completed', false)
                ->where('dashboard.attention.recentSellers', 2)
                ->where('dashboard.attention.pendingOrders', 1)
                ->where('dashboard.attention.lowStockProducts', 2)
                ->has('dashboard.recentActivity', 6));
    }

    public function test_cenro_dashboard_returns_empty_collections_without_marketplace_activity(): void
    {
        $this->withoutVite();
        $weather = Mockery::mock(WeatherService::class);
        $weather->shouldReceive('current')->once()->andReturn(null);
        $this->app->instance(WeatherService::class, $weather);
        $admin = User::factory()->cenroAdmin()->create();

        $this->actingAs($admin)->get('/admin/dashboard')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('dashboard.summary.totalSales', 0)
                ->where('dashboard.summary.activeSellers', 0)
                ->where('dashboard.summary.totalOrders', 0)
                ->where('dashboard.summary.leadingBarangay', null)
                ->has('dashboard.barangays', 0)
                ->has('dashboard.monthlySales.months', 12)
                ->has('dashboard.monthlySales.series', 0)
                ->has('dashboard.todo', 0)
                ->where('dashboard.attention.recentSellers', 0)
                ->where('dashboard.attention.pendingOrders', 0)
                ->where('dashboard.attention.lowStockProducts', 0)
                ->has('dashboard.recentActivity', 0));
    }

    public function test_monthly_sales_includes_the_whole_twelve_month_window_and_only_delivered_orders(): void
    {
        $this->travelTo(now()->startOfMonth()->addDays(6));
        $this->withoutVite();
        $weather = Mockery::mock(WeatherService::class);
        $weather->shouldReceive('current')->once()->andReturn(null);
        $this->app->instance(WeatherService::class, $weather);
        $admin = User::factory()->cenroAdmin()->create();
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);
        $product = $this->product($seller, 'Pechay', 12, 3);

        $this->order($seller, $product, '100.00', 'delivered', now()->startOfMonth()->subMonths(11));
        $this->order($seller, $product, '200.00', 'delivered', now()->subMonths(8));
        $this->order($seller, $product, '25.00', 'delivered', now());
        $this->order($seller, $product, '999.00', 'delivered', now()->startOfMonth()->subMonths(11)->subSecond());
        $this->order($seller, $product, '888.00', 'pending', now()->subMonths(8));

        $this->actingAs($admin)->get('/admin/dashboard')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('dashboard.monthlySales.months', 12)
                ->where('dashboard.monthlySales.months.0.key', now()->subMonths(11)->format('Y-m'))
                ->where('dashboard.monthlySales.months.11.key', now()->format('Y-m'))
                ->has('dashboard.monthlySales.series', 1)
                ->where('dashboard.monthlySales.series.0.sales', [100, 0, 0, 200, 0, 0, 0, 0, 0, 0, 0, 25]));
    }

    public function test_cenro_administrator_can_create_complete_reopen_and_delete_personal_tasks(): void
    {
        $admin = User::factory()->cenroAdmin()->create();
        $otherAdmin = User::factory()->cenroAdmin()->create();

        $this->actingAs($admin)->post('/admin/tasks', [
            'title' => 'Prepare monthly barangay report',
            'due_date' => now()->addWeek()->toDateString(),
        ])->assertSessionHasNoErrors()->assertRedirect(route('admin.dashboard'));

        $task = AdminTask::query()->sole();
        $this->assertSame($admin->id, $task->user_id);
        $this->assertFalse($task->completed);

        $this->patch('/admin/tasks/'.$task->id, ['completed' => true])
            ->assertSessionHasNoErrors();
        $this->assertTrue($task->fresh()->completed);

        $this->actingAs($otherAdmin)->patch('/admin/tasks/'.$task->id, ['completed' => false])
            ->assertNotFound();
        $this->delete('/admin/tasks/'.$task->id)->assertNotFound();

        $this->actingAs($admin)->patch('/admin/tasks/'.$task->id, ['completed' => false])
            ->assertSessionHasNoErrors();
        $this->assertFalse($task->fresh()->completed);
        $this->delete('/admin/tasks/'.$task->id)->assertSessionHasNoErrors();
        $this->assertDatabaseCount('admin_tasks', 0);
    }

    public function test_non_admin_accounts_cannot_manage_admin_tasks(): void
    {
        $seller = User::factory()->seller()->create();

        $this->actingAs($seller)->post('/admin/tasks', ['title' => 'Not allowed'])->assertForbidden();
        $this->assertDatabaseCount('admin_tasks', 0);
    }

    private function product(User $seller, string $name, int $stock, int $threshold): Product
    {
        $product = new Product([
            'name' => $name,
            'category' => 'Vegetables',
            'description' => 'Fresh harvest',
            'price' => '25.00',
            'unit' => 'bundle',
            'stock' => $stock,
            'threshold' => $threshold,
            'photo_path' => 'products/test.png',
        ]);
        $product->user_id = $seller->id;
        $product->save();

        return $product;
    }

    private function order(User $seller, Product $product, string $total, string $status, mixed $createdAt): WalkInOrder
    {
        $order = new WalkInOrder([
            'customer_name' => 'Test Customer',
            'product_name' => $product->name,
            'unit' => $product->unit,
            'quantity' => 1,
            'unit_price' => $total,
            'total' => $total,
            'status' => $status,
        ]);
        $order->user_id = $seller->id;
        $order->product_id = $product->id;
        $order->created_at = $createdAt;
        $order->updated_at = $createdAt;
        $order->save();

        return $order;
    }
}
