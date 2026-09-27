<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use App\Services\WeatherService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class AdminAuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_cenro_dashboard_shows_only_real_audit_log_records(): void
    {
        $this->withoutVite();
        $weather = Mockery::mock(WeatherService::class);
        $weather->shouldReceive('current')->twice()->andReturn(null);
        $this->app->instance(WeatherService::class, $weather);

        $admin = User::factory()->cenroAdmin()->create();
        $seller = User::factory()->seller()->create(['name' => 'Rosario Urban Farm', 'barangay' => 'Rosario']);

        $this->actingAs($admin)->get('/admin/dashboard')->assertInertia(fn (Assert $page) => $page
            ->has('auditLogs', 0));

        AuditLog::record(
            admin: $admin,
            action: 'Suspended account',
            details: 'Reason: repeated inaccurate stock updates',
            seller: $seller,
            actionType: 'suspend',
        );

        $this->actingAs($admin)->get('/admin/dashboard')->assertInertia(fn (Assert $page) => $page
            ->has('auditLogs', 1)
            ->where('auditLogs.0.action', 'Suspended account')
            ->where('auditLogs.0.seller.name', 'Rosario Urban Farm'));
    }

    public function test_creating_a_seller_records_an_audit_entry(): void
    {
        $admin = User::factory()->cenroAdmin()->create();

        $this->actingAs($admin)->post('/admin/sellers', [
            'name' => 'Manggahan Urban Farm',
            'email' => 'manggahan@example.test',
            'barangay' => 'Rosario',
            'temporary_password' => 'Starter123',
            'temporary_password_confirmation' => 'Starter123',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('audit_logs', [
            'admin_id' => $admin->id,
            'action' => 'Created seller account',
            'action_type' => 'create',
            'seller_name' => 'Manggahan Urban Farm',
            'details' => 'Assigned to Rosario',
        ]);
    }

    public function test_updating_a_seller_records_changed_details(): void
    {
        $admin = User::factory()->cenroAdmin()->create();
        $seller = User::factory()->seller()->create(['barangay' => 'Rosario']);

        $this->actingAs($admin)->patch('/admin/sellers/'.$seller->id, [
            'name' => $seller->name,
            'email' => $seller->email,
            'barangay' => 'Maybunga',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('audit_logs', [
            'seller_id' => $seller->id,
            'action' => 'Updated seller details',
            'action_type' => 'update',
        ]);
    }

    public function test_suspension_and_reinstatement_record_real_audit_events(): void
    {
        $admin = User::factory()->cenroAdmin()->create();
        $seller = User::factory()->seller()->create(['barangay' => 'Sto. Tomas']);

        $this->actingAs($admin)->post('/admin/sellers/'.$seller->id.'/suspend', [
            'reason' => 'Repeated inaccurate stock updates.',
        ])->assertSessionHasNoErrors();
        $this->actingAs($admin)->post('/admin/sellers/'.$seller->id.'/reinstate')->assertSessionHasNoErrors();

        $this->assertDatabaseHas('audit_logs', ['seller_id' => $seller->id, 'action_type' => 'suspend']);
        $this->assertDatabaseHas('audit_logs', ['seller_id' => $seller->id, 'action_type' => 'status_change']);
        $this->assertDatabaseHas('audit_logs', ['seller_id' => $seller->id, 'action_type' => 'reinstate']);
    }
}
