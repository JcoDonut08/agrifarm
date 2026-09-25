<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_upload_photo_up_to_10mb(): void
    {
        Storage::fake('local');
        $admin = User::factory()->create(['role' => UserRole::CenroAdmin]);

        // Upload valid photo within 10MB limit (e.g. 9.5MB / 9728KB)
        $file = UploadedFile::fake()->createWithContent(
            'cenro_badge.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=')
        )->size(9728);

        $response = $this->actingAs($admin)
            ->post('/admin/profile/photo', ['photo' => $file]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $admin->refresh();
        $this->assertNotNull($admin->avatar_url);
        $this->assertStringStartsWith('/admin/profile/photo?image=', $admin->avatar_url);

        // Can view the uploaded photo
        $this->actingAs($admin)
            ->get($admin->avatar_url)
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
    }

    public function test_admin_photo_upload_rejects_files_greater_than_10mb(): void
    {
        Storage::fake('local');
        $admin = User::factory()->create(['role' => UserRole::CenroAdmin]);

        // 10241 KB is > 10MB (10240 KB limit)
        $tooLargeFile = UploadedFile::fake()->createWithContent(
            'heavy_photo.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=')
        )->size(10241);

        $response = $this->actingAs($admin)
            ->post('/admin/profile/photo', ['photo' => $tooLargeFile]);

        $response->assertSessionHasErrors('photo');
        $this->assertNull($admin->fresh()->avatar_url);
    }

    public function test_admin_photo_upload_rejects_invalid_file_types(): void
    {
        Storage::fake('local');
        $admin = User::factory()->create(['role' => UserRole::CenroAdmin]);

        $badFile = UploadedFile::fake()->create('document.pdf', 500, 'application/pdf');

        $response = $this->actingAs($admin)
            ->post('/admin/profile/photo', ['photo' => $badFile]);

        $response->assertSessionHasErrors('photo');
        $this->assertNull($admin->fresh()->avatar_url);
    }

    public function test_admin_can_remove_photo(): void
    {
        Storage::fake('local');
        $admin = User::factory()->create(['role' => UserRole::CenroAdmin]);

        $file = UploadedFile::fake()->createWithContent(
            'photo.jpg',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=')
        );

        $this->actingAs($admin)->post('/admin/profile/photo', ['photo' => $file]);
        $url = $admin->fresh()->avatar_url;
        $this->assertNotNull($url);

        $deleteResponse = $this->actingAs($admin)->delete('/admin/profile/photo');
        $deleteResponse->assertSessionHasNoErrors();

        $admin->refresh();
        $this->assertNull($admin->avatar_url);

        // Viewing the old photo URL now returns 404
        $this->actingAs($admin)->get($url)->assertNotFound();
    }

    public function test_non_admin_cannot_upload_admin_photo(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $seller = User::factory()->create(['role' => UserRole::Seller]);

        $file = UploadedFile::fake()->create('avatar.png', 100);

        $this->actingAs($customer)
            ->post('/admin/profile/photo', ['photo' => $file])
            ->assertForbidden();

        $this->actingAs($seller)
            ->post('/admin/profile/photo', ['photo' => $file])
            ->assertForbidden();
    }
}
