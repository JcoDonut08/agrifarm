<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'username' => trim((string) $request->input('username')),
            'mobile_number' => trim((string) $request->input('mobile_number')),
            'delivery_address' => trim((string) $request->input('delivery_address')),
        ]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'username' => ['nullable', 'alpha_dash:ascii', 'min:3', 'max:40', Rule::unique('users')->ignore($request->user()->id)],
            'mobile_number' => ['nullable', 'regex:/^\+?[0-9][0-9\s-]{8,22}$/'],
            'delivery_address' => ['nullable', 'string', 'min:10', 'max:500'],
        ]);
        foreach (['username', 'mobile_number', 'delivery_address'] as $field) {
            $data[$field] = $data[$field] ?: null;
        }
        $request->user()->forceFill($data)->save();

        return back()->with('status', 'Profile saved.');
    }

    public function password(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::min(8)->letters()->numbers(), 'confirmed', 'different:current_password'],
        ]);
        $request->user()->forceFill(['password' => $data['password'], 'remember_token' => Str::random(60)])->save();
        $request->session()->regenerate();

        return back()->with('status', 'Password updated.');
    }

    public function photo(Request $request): RedirectResponse
    {
        $request->validate(['photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=6000,max_height=6000']]);
        $user = $request->user();
        $path = $request->file('photo')->store('customer-avatars/'.$user->id, 'local');
        abort_unless($path, 500, 'The photo could not be saved.');
        $previous = $user->avatar_url;
        $user->forceFill(['avatar_url' => '/customer/profile/photo?image='.basename($path)])->save();
        $this->deleteStoredPhoto($user->id, $previous);

        return back()->with('status', 'Profile photo updated.');
    }

    public function showPhoto(Request $request)
    {
        $image = (string) $request->query('image');
        abort_unless(preg_match('/^[a-zA-Z0-9]+\.(jpg|jpeg|png|webp)$/', $image)
            && $request->user()->avatar_url === '/customer/profile/photo?image='.$image, 404);
        $path = 'customer-avatars/'.$request->user()->id.'/'.$image;
        abort_unless(Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), ['Cache-Control' => 'private, max-age=3600', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function removePhoto(Request $request): RedirectResponse
    {
        $user = $request->user();
        $previous = $user->avatar_url;
        $user->forceFill(['avatar_url' => null])->save();
        $this->deleteStoredPhoto($user->id, $previous);

        return back()->with('status', 'Profile photo removed.');
    }

    private function deleteStoredPhoto(int $userId, ?string $url): void
    {
        if (preg_match('~^/customer/profile/photo\?image=([a-zA-Z0-9]+\.(?:jpg|jpeg|png|webp))$~', $url ?? '', $matches)) {
            Storage::disk('local')->delete('customer-avatars/'.$userId.'/'.$matches[1]);
        }
    }
}
