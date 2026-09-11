<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use App\Notifications\SellerEmailChangeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SellerProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_photo_upload_display_removal_and_validation_are_scoped_to_the_seller(): void
    {
        Storage::fake('local');
        $seller = User::factory()->create(['role' => UserRole::Seller]);
        $this->actingAs($seller)->post('/seller/profile/photo', ['photo' => UploadedFile::fake()->create('bad.txt', 1, 'text/plain')])->assertSessionHasErrors('photo');
        $this->post('/seller/profile/photo', ['photo' => UploadedFile::fake()->createWithContent('photo.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII='))->size(2049)])->assertSessionHasErrors('photo');
        $this->post('/seller/profile/photo', ['photo' => UploadedFile::fake()->createWithContent('photo.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII='))])->assertSessionHasNoErrors();
        $url = $seller->fresh()->avatar_url;
        $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/png');
        $other = User::factory()->create(['role' => UserRole::Seller]);
        $this->actingAs($other)->get($url)->assertNotFound();
        $this->actingAs($seller)->delete('/seller/profile/photo')->assertSessionHasNoErrors();
        $this->assertNull($seller->fresh()->avatar_url);
        $this->get($url)->assertNotFound();
        $this->actingAs(User::factory()->create(['role' => UserRole::Customer]))->post('/seller/profile/photo')->assertForbidden();
    }

    public function test_profile_changes_are_scoped_to_authenticated_seller(): void
    {
        $seller = User::factory()->create(['role' => UserRole::Seller]);
        $other = User::factory()->create(['role' => UserRole::Seller]);
        $this->actingAs($seller)->patch('/seller/profile', ['name' => 'Updated Barangay', 'email' => $seller->email, 'id' => $other->id, 'role' => 'cenro_admin'])->assertSessionHasNoErrors();
        $this->assertSame('Updated Barangay', $seller->fresh()->name);
        $this->assertSame(UserRole::Seller, $seller->fresh()->role);
        $this->assertSame($other->name, $other->fresh()->name);
        $this->actingAs(User::factory()->create(['role' => UserRole::Customer]))->patch('/seller/profile')->assertForbidden();
        $this->put('/seller/password')->assertForbidden();
    }

    public function test_email_change_requires_password_and_confirmation_and_rejects_tampering(): void
    {
        Notification::fake();
        $seller = User::factory()->create(['role' => UserRole::Seller, 'password' => 'Original123!']);
        $original = $seller->email;
        $data = ['name' => $seller->name, 'email' => 'new@example.test'];
        $this->actingAs($seller)->patch('/seller/profile', $data)->assertSessionHasErrors('profile_password');
        $this->patch('/seller/profile', [...$data, 'profile_password' => 'Original123!'])->assertSessionHasNoErrors();
        $this->assertSame($original, $seller->fresh()->email);
        $url = null;
        Notification::assertSentOnDemand(SellerEmailChangeNotification::class, function ($notification, $channels, $notifiable) use (&$url) {
            $url = $notification->url;

            return $notifiable->routes['mail'] === 'new@example.test';
        });
        $this->get($url.'&email=tampered@example.test')->assertForbidden();
        $this->get($url)->assertRedirect('/seller/dashboard?section=profile');
        $this->assertSame('new@example.test', $seller->fresh()->email);
        $this->assertTrue($seller->fresh()->hasVerifiedEmail());
        $this->get($url)->assertForbidden();
    }

    public function test_password_validation_and_hashed_update(): void
    {
        $seller = User::factory()->create(['role' => UserRole::Seller, 'password' => 'Original123!']);
        $this->actingAs($seller)->put('/seller/password', ['current_password' => 'incorrect', 'password' => 'Changed123!', 'password_confirmation' => 'Changed123!'])->assertSessionHasErrors('current_password');
        $this->put('/seller/password', ['current_password' => 'Original123!', 'password' => 'Changed123!', 'password_confirmation' => 'mismatch'])->assertSessionHasErrors('password');
        $this->put('/seller/password', ['current_password' => 'Original123!', 'password' => 'Changed123!', 'password_confirmation' => 'Changed123!'])->assertSessionHasNoErrors();
        $this->assertTrue(Hash::check('Changed123!', $seller->fresh()->password));
        $this->assertFalse(Hash::check('Original123!', $seller->fresh()->password));
    }
}
