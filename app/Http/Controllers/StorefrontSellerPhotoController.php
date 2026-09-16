<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StorefrontSellerPhotoController extends Controller
{
    public function __invoke(User $user): BinaryFileResponse
    {
        abort_unless($user->role === UserRole::Seller, 404);
        abort_unless(preg_match('~^/seller/profile/photo\?image=([a-zA-Z0-9]+\.(?:jpg|jpeg|png|webp))$~', $user->avatar_url ?? '', $matches), 404);
        $path = 'seller-avatars/'.$user->id.'/'.$matches[1];
        abort_unless(Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), [
            'Cache-Control' => 'public, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
