<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SellerGuideTest extends TestCase
{
    use RefreshDatabase;

    public function test_guide_waits_for_temporary_password_change_and_persists_for_the_seller(): void
    {
        $seller = User::factory()->seller()->create(['password' => 'Starter123', 'password_must_be_changed' => true, 'seller_guide_pending' => true]);
        $this->actingAs($seller)->get('/seller/dashboard')->assertRedirect('/seller/temporary-password');
        $this->post('/seller/guide/dismiss')->assertRedirect('/seller/temporary-password');
        $this->assertTrue($seller->fresh()->seller_guide_pending);
        $this->put('/seller/temporary-password', ['temporary_password' => 'Starter123', 'password' => 'Personal123', 'password_confirmation' => 'Personal123'])->assertSessionHasNoErrors();
        $this->get('/seller/dashboard')->assertInertia(fn (Assert $page) => $page->component('Seller/Dashboard')->where('sellerGuidePending', true));
        $other = User::factory()->seller()->create(['seller_guide_pending' => true]);
        $this->post('/seller/guide/dismiss', ['id' => $other->id, 'seller_guide_pending' => true])->assertRedirect('/seller/dashboard');
        $this->assertFalse($seller->fresh()->seller_guide_pending);
        $this->assertNotNull($seller->fresh()->seller_guide_dismissed_at);
        $this->assertNull($other->fresh()->seller_guide_dismissed_at);
        $this->assertTrue($other->fresh()->seller_guide_pending);
        $this->get('/seller/dashboard')->assertInertia(fn (Assert $page) => $page->where('sellerGuidePending', false));
        $this->post('/seller/guide/dismiss')->assertSessionHasNoErrors();
    }

    public function test_existing_sellers_automatically_receive_the_guide_once_and_other_roles_cannot_dismiss_it(): void
    {
        $seller = User::factory()->seller()->create();
        $this->actingAs($seller)->get('/seller/dashboard')->assertInertia(fn (Assert $page) => $page->where('sellerGuidePending', true));
        $this->post('/seller/guide/dismiss')->assertSessionHasNoErrors();
        $dismissedAt = $seller->fresh()->seller_guide_dismissed_at;
        $this->get('/seller/dashboard')->assertInertia(fn (Assert $page) => $page->where('sellerGuidePending', false));
        $this->travel(1)->day();
        $this->post('/seller/guide/dismiss')->assertSessionHasNoErrors();
        $this->assertTrue($dismissedAt->equalTo($seller->fresh()->seller_guide_dismissed_at));
        $this->actingAs(User::factory()->create())->post('/seller/guide/dismiss')->assertForbidden();
        $this->actingAs(User::factory()->cenroAdmin()->create())->post('/seller/guide/dismiss')->assertForbidden();
        $this->post('/logout');
        $this->post('/seller/guide/dismiss')->assertRedirect('/login');
    }
}
