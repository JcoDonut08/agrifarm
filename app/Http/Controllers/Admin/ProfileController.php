<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function photo(Request $request): RedirectResponse
    {
        $request->validate([
            'photo' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:10240',
                'dimensions:max_width=6000,max_height=6000',
            ],
        ]);

        $user = $request->user();
        $path = $request->file('photo')->store('admin-avatars/'.$user->id, 'local');
        abort_unless($path, 500, 'The photo could not be saved. Please try again.');

        $oldPhoto = $user->avatar_url;
        $user->forceFill(['avatar_url' => '/admin/profile/photo?image='.basename($path)])->save();
        $this->deleteStoredPhoto($user->id, $oldPhoto);

        return back()->with('status', 'Profile photo updated successfully.');
    }

    public function showPhoto(Request $request)
    {
        $image = (string) $request->query('image');
        abort_unless(
            preg_match('/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/', $image)
            && $request->user()->avatar_url === '/admin/profile/photo?image='.$image,
            404
        );

        $path = 'admin-avatars/'.$request->user()->id.'/'.$image;
        abort_unless(Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), [
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function removePhoto(Request $request): RedirectResponse
    {
        $oldPhoto = $request->user()->avatar_url;
        $request->user()->forceFill(['avatar_url' => null])->save();
        $this->deleteStoredPhoto($request->user()->id, $oldPhoto);

        return back()->with('status', 'Profile photo removed.');
    }

    private function deleteStoredPhoto(int $userId, ?string $url): void
    {
        if (preg_match('~^/admin/profile/photo\?image=([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp))$~', $url ?? '', $matches)) {
            Storage::disk('local')->delete('admin-avatars/'.$userId.'/'.$matches[1]);
        }
    }
}
