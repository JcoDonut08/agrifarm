<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Notifications\SellerEmailChangeNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function photo(Request $request): RedirectResponse
    {
        $request->validate(['photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=6000,max_height=6000']]);
        $user = $request->user();
        $path = $request->file('photo')->store('seller-avatars/'.$user->id, 'local');
        abort_unless($path, 500, 'The photo could not be saved. Please try again.');
        $oldPhoto = $user->avatar_url;
        $user->forceFill(['avatar_url' => '/seller/profile/photo?image='.basename($path)])->save();
        $this->deleteStoredPhoto($user->id, $oldPhoto);

        return redirect('/seller/dashboard?section=profile')->with('status', 'Profile photo updated successfully.');
    }

    public function showPhoto(Request $request)
    {
        $image = (string) $request->query('image');
        abort_unless(preg_match('/^[a-zA-Z0-9]+\.(jpg|jpeg|png|webp)$/', $image)
            && $request->user()->avatar_url === '/seller/profile/photo?image='.$image, 404);
        $path = 'seller-avatars/'.$request->user()->id.'/'.$image;
        abort_unless(Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), ['Cache-Control' => 'private, max-age=3600', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function removePhoto(Request $request): RedirectResponse
    {
        $oldPhoto = $request->user()->avatar_url;
        $request->user()->forceFill(['avatar_url' => null])->save();
        $this->deleteStoredPhoto($request->user()->id, $oldPhoto);

        return redirect('/seller/dashboard?section=profile')->with('status', 'Profile photo removed.');
    }

    private function deleteStoredPhoto(int $userId, ?string $url): void
    {
        if (preg_match('~^/seller/profile/photo\?image=([a-zA-Z0-9]+\.(?:jpg|jpeg|png|webp))$~', $url ?? '', $matches)) {
            Storage::disk('local')->delete('seller-avatars/'.$userId.'/'.$matches[1]);
        }
    }

    public function update(Request $request): RedirectResponse
    {
        $request->merge(['name' => trim((string) $request->input('name')), 'email' => mb_strtolower(trim((string) $request->input('email')))]);
        $user = $request->user();
        $changingEmail = $request->input('email') !== $user->email;
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'profile_password' => [Rule::requiredIf($changingEmail), 'nullable', 'current_password'],
        ]);

        if ($changingEmail) {
            $url = URL::temporarySignedRoute('seller.profile.email.verify', now()->addMinutes(30), [
                'user' => $user->id,
                'email' => $data['email'],
                'previous' => hash('sha256', $user->email),
            ]);
            Notification::route('mail', $data['email'])->notify(new SellerEmailChangeNotification($url));
        }

        $user->update(['name' => $data['name']]);

        return redirect('/seller/dashboard?section=profile')->with('status', $changingEmail
            ? 'Profile saved. Check your new email for a confirmation link. Your sign-in email stays the same until you confirm.'
            : 'Profile updated successfully.');
    }

    public function verifyEmail(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless((string) $user->id === $request->query('user') && hash_equals(hash('sha256', $user->email), (string) $request->query('previous')), 403);
        $data = $request->validate(['email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)]]);
        $user->forceFill(['email' => $data['email'], 'email_verified_at' => now()])->save();

        return redirect('/seller/dashboard?section=profile')->with('status', 'Email address updated successfully.');
    }

    public function password(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::min(8)->letters()->numbers(), 'confirmed', 'different:current_password'],
        ]);
        $request->user()->forceFill(['password' => $data['password'], 'remember_token' => Str::random(60)])->save();
        $request->session()->regenerate();

        return redirect('/seller/dashboard?section=profile')->with('status', 'Password updated successfully.');
    }
}
