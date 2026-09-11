<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\PendingRegistration;
use App\Models\User;
use App\Support\Auth\RoleRedirector;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class GoogleAuthController extends Controller
{
    private const SESSION_KEY = 'oauth.google';

    private const SESSION_LIFETIME_MINUTES = 10;

    public function redirect(Request $request): RedirectResponse
    {
        $intent = $request->string('intent')->toString() === 'register' ? 'register' : 'login';

        if ($intent === 'register' && ! $request->boolean('legal')) {
            return $this->failure($intent, 'Accept the Terms of Use and Privacy Notice before continuing with Google.', 'legal');
        }

        if (! $this->isConfigured()) {
            return $this->failure($intent, 'Google sign-in needs to be configured by the AgriFarm team.');
        }

        $state = Str::random(64);
        $verifier = $this->base64UrlEncode(random_bytes(64));
        $request->session()->put(self::SESSION_KEY, [
            'state' => $state,
            'verifier' => $verifier,
            'intent' => $intent,
            'started_at' => now()->getTimestamp(),
        ]);

        $query = http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => config('services.google.redirect'),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'code_challenge' => $this->base64UrlEncode(hash('sha256', $verifier, true)),
            'code_challenge_method' => 'S256',
            'prompt' => 'select_account',
        ], '', '&', PHP_QUERY_RFC3986);

        return redirect()->away('https://accounts.google.com/o/oauth2/v2/auth?'.$query);
    }

    public function callback(Request $request): RedirectResponse
    {
        $oauth = $request->session()->pull(self::SESSION_KEY);
        $intent = is_array($oauth) && ($oauth['intent'] ?? null) === 'register' ? 'register' : 'login';

        if ($request->filled('error')) {
            return $this->failure($intent, 'Google sign-in was cancelled.');
        }

        if (! $this->validSession($oauth, $request->string('state')->toString()) || ! $request->filled('code')) {
            return $this->failure($intent, 'The Google sign-in request expired. Please try again.');
        }

        if (! $this->isConfigured()) {
            return $this->failure($intent, 'Google sign-in needs to be configured by the AgriFarm team.');
        }

        try {
            $token = Http::asForm()
                ->timeout(15)
                ->post('https://oauth2.googleapis.com/token', [
                    'client_id' => config('services.google.client_id'),
                    'client_secret' => config('services.google.client_secret'),
                    'code' => $request->string('code')->toString(),
                    'code_verifier' => $oauth['verifier'],
                    'grant_type' => 'authorization_code',
                    'redirect_uri' => config('services.google.redirect'),
                ])
                ->throw()
                ->json();

            $profile = Http::withToken((string) ($token['access_token'] ?? ''))
                ->acceptJson()
                ->timeout(15)
                ->get('https://openidconnect.googleapis.com/v1/userinfo')
                ->throw()
                ->json();
        } catch (Throwable $exception) {
            report($exception);

            return $this->failure($intent, 'Google could not complete sign-in. Please try again.');
        }

        $email = mb_strtolower(trim((string) ($profile['email'] ?? '')));
        $emailVerified = filter_var($profile['email_verified'] ?? false, FILTER_VALIDATE_BOOL);

        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || ! $emailVerified) {
            return $this->failure($intent, 'Google did not provide a verified email address.');
        }

        $user = User::query()->where('email', $email)->first();

        $wasVerified = $user?->hasVerifiedEmail() ?? false;

        try {
            $user = DB::transaction(function () use ($user, $email, $profile): User {
                if ($user) {
                    $user->forceFill(['avatar_url' => $this->profilePhotoUrl($profile)])->save();

                    if (! $user->hasVerifiedEmail()) {
                        $user->markEmailAsVerified();
                    }

                    return $user;
                }

                $name = trim((string) ($profile['name'] ?? '')) ?: str($email)->before('@')->toString();
                $user = new User([
                    'name' => Str::limit($name, 255, ''),
                    'email' => $email,
                    'password' => Str::random(64),
                    'terms_accepted_at' => now(),
                    'privacy_accepted_at' => now(),
                ]);
                $user->forceFill([
                    'avatar_url' => $this->profilePhotoUrl($profile),
                    'role' => UserRole::Customer,
                    'email_verified_at' => now(),
                ])->save();

                PendingRegistration::query()->where('email', $email)->delete();

                return $user;
            }, 3);
        } catch (Throwable $exception) {
            report($exception);

            return $this->failure($intent, 'Google sign-in could not create your account. Please try again.');
        }

        if (! $wasVerified) {
            event(new Verified($user));
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        return redirect()->intended(RoleRedirector::path($user));
    }

    /** @param array<string, mixed> $profile */
    private function profilePhotoUrl(array $profile): ?string
    {
        $picture = $profile['picture'] ?? null;

        return is_string($picture)
            && strlen($picture) <= 2048
            && filter_var($picture, FILTER_VALIDATE_URL)
            && parse_url($picture, PHP_URL_SCHEME) === 'https'
                ? $picture
                : null;
    }

    /** @param array<string, mixed>|null $oauth */
    private function validSession(?array $oauth, string $state): bool
    {
        return isset($oauth['state'], $oauth['verifier'], $oauth['started_at'])
            && is_string($oauth['state'])
            && is_string($oauth['verifier'])
            && $state !== ''
            && hash_equals($oauth['state'], $state)
            && (int) $oauth['started_at'] >= now()->subMinutes(self::SESSION_LIFETIME_MINUTES)->getTimestamp();
    }

    private function isConfigured(): bool
    {
        return filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'))
            && filled(config('services.google.redirect'));
    }

    private function failure(string $intent, string $message, string $field = 'google'): RedirectResponse
    {
        return redirect()->route($intent === 'register' ? 'register' : 'login')
            ->withErrors([$field => $message]);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
