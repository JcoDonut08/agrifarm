<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProfilePhotoLimitTest extends TestCase
{
    use RefreshDatabase;

    public static function roles(): array
    {
        return ['customer' => ['customer'], 'seller' => ['seller']];
    }

    #[DataProvider('roles')]
    public function test_profile_photos_allow_five_and_ten_mb_and_preserve_the_existing_photo_when_oversized(string $role): void
    {
        Storage::fake('local');
        $user = $role === 'seller' ? User::factory()->seller()->create() : User::factory()->create();
        $this->actingAs($user);
        foreach ([5120, 10240] as $size) {
            $photo = UploadedFile::fake()->image('portrait.png')->size($size);
            $previous = $user->fresh()->avatar_url;
            $this->post('/'.$role.'/profile/photo', ['photo' => $photo])->assertSessionHasNoErrors()->assertRedirect();
            $url = $user->fresh()->avatar_url;
            $this->assertNotSame($previous, $url);
            $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/png');
            $this->assertCount(1, Storage::disk('local')->allFiles());
        }

        $before = $user->fresh()->avatar_url;
        $this->post('/'.$role.'/profile/photo', ['photo' => UploadedFile::fake()->image('too-large.png')->size(10241)])
            ->assertSessionHasErrors('photo');
        $this->assertSame($before, $user->fresh()->avatar_url);
        $this->get($before)->assertOk();
        $this->assertCount(1, Storage::disk('local')->allFiles());
    }
}
