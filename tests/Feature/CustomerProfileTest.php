<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CustomerProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_customer_can_save_details_and_checkout_receives_them(): void
    {
        $customer = User::factory()->create();
        $this->actingAs($customer)->patch('/customer/profile', [
            'name' => 'Maria Santos', 'username' => 'maria_santos',
            'mobile_number' => '09171234567', 'delivery_address' => '123 Example Street near the barangay hall',
        ])->assertRedirect();

        $this->assertDatabaseHas('users', ['id' => $customer->id, 'username' => 'maria_santos', 'mobile_number' => '09171234567']);
        $this->get('/?page=checkout')->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.name', 'Maria Santos')
            ->where('auth.user.email', $customer->email)
            ->where('auth.user.delivery_address', '123 Example Street near the barangay hall')
            ->etc());
    }

    public function test_customer_password_and_photo_are_private(): void
    {
        Storage::fake('local');
        $customer = User::factory()->create(['password' => 'OldPass123']);
        $seller = User::factory()->seller()->create();

        $this->actingAs($seller)->patch('/customer/profile', ['name' => 'Wrong'])->assertForbidden();
        $this->actingAs($customer)->put('/customer/password', [
            'current_password' => 'OldPass123', 'password' => 'NewPass123', 'password_confirmation' => 'NewPass123',
        ])->assertRedirect();
        $this->assertTrue(Hash::check('NewPass123', $customer->fresh()->password));

        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZkAAAAASUVORK5CYII=');
        $this->post('/customer/profile/photo', ['photo' => UploadedFile::fake()->createWithContent('portrait.png', $png)])->assertRedirect();
        $photoUrl = $customer->fresh()->avatar_url;
        $this->assertStringStartsWith('/customer/profile/photo?image=', $photoUrl);
        $this->get($photoUrl)->assertOk();
        $this->actingAs(User::factory()->create())->get($photoUrl)->assertNotFound();
    }
}
