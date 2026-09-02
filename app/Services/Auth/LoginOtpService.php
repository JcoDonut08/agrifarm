<?php

namespace App\Services\Auth;

use App\Models\LoginOtp;
use App\Models\User;
use App\Notifications\LoginOtpNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class LoginOtpService
{
    private const PENDING_SESSION_KEY = 'auth.pending';

    private const PENDING_SESSION_LIFETIME_MINUTES = 30;

    public function begin(User $user, bool $remember, Request $request): void
    {
        $request->session()->regenerate();
        $request->session()->put(self::PENDING_SESSION_KEY, [
            'user_id' => $user->getKey(),
            'remember' => $remember,
            'started_at' => now()->getTimestamp(),
        ]);

        $this->issue($user);
    }

    public function pendingUser(Request $request): ?User
    {
        $pending = $request->session()->get(self::PENDING_SESSION_KEY);

        if (! is_array($pending) || ! isset($pending['user_id'], $pending['started_at'])) {
            return null;
        }

        if ((int) $pending['started_at'] < now()->subMinutes(self::PENDING_SESSION_LIFETIME_MINUTES)->getTimestamp()) {
            $request->session()->forget(self::PENDING_SESSION_KEY);

            return null;
        }

        return User::query()->find($pending['user_id']);
    }

    public function resend(Request $request): void
    {
        $user = $this->requirePendingUser($request);
        $latest = $user->loginOtps()->latest('id')->first();
        $cooldown = (int) config('auth.login_otp.resend_cooldown_seconds');

        if ($latest?->created_at?->isAfter(now()->subSeconds($cooldown))) {
            $seconds = max(1, (int) ceil($latest->created_at->addSeconds($cooldown)->diffInSeconds(now())));

            throw ValidationException::withMessages([
                'code' => "Please wait {$seconds} seconds before requesting another code.",
            ]);
        }

        $key = $this->resendRateLimitKey($user, $request);
        $maxAttempts = (int) config('auth.login_otp.resend_max_per_hour');

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($key);

            throw ValidationException::withMessages([
                'code' => "Too many code requests. Try again in {$seconds} seconds.",
            ]);
        }

        RateLimiter::hit($key, 3600);
        $this->issue($user);
    }

    public function verify(Request $request, string $code): User
    {
        $user = $this->requirePendingUser($request);
        $maxAttempts = (int) config('auth.login_otp.max_attempts');

        $result = DB::transaction(function () use ($user, $code, $maxAttempts): string {
            $otp = LoginOtp::query()
                ->where('user_id', $user->getKey())
                ->whereNull('consumed_at')
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $otp) {
                return 'missing';
            }

            if ($otp->expires_at->isPast()) {
                $otp->update(['consumed_at' => now()]);

                return 'expired';
            }

            if ($otp->attempts >= $maxAttempts) {
                $otp->update(['consumed_at' => now()]);

                return 'locked';
            }

            if (! Hash::check($code, $otp->code_hash)) {
                $attempts = $otp->attempts + 1;
                $otp->update([
                    'attempts' => $attempts,
                    'consumed_at' => $attempts >= $maxAttempts ? now() : null,
                ]);

                return $attempts >= $maxAttempts ? 'locked' : 'invalid';
            }

            $otp->update(['consumed_at' => now()]);

            return 'valid';
        }, 3);

        if ($result !== 'valid') {
            if (in_array($result, ['locked', 'missing'], true)) {
                $request->session()->forget(self::PENDING_SESSION_KEY);
            }

            $message = match ($result) {
                'expired' => 'This login code has expired. Request a new code to continue.',
                'locked' => 'Too many incorrect attempts. Sign in again to request a new code.',
                'missing' => 'This login code is no longer active. Sign in again to continue.',
                default => 'The login code is incorrect.',
            };

            throw ValidationException::withMessages(['code' => $message]);
        }

        $pending = $request->session()->pull(self::PENDING_SESSION_KEY, []);
        Auth::login($user, (bool) ($pending['remember'] ?? false));
        $request->session()->regenerate();
        RateLimiter::clear($this->resendRateLimitKey($user, $request));

        return $user;
    }

    public function maskedPendingEmail(Request $request): ?string
    {
        $email = $this->pendingUser($request)?->email;

        if (! $email || ! str_contains($email, '@')) {
            return null;
        }

        [$local, $domain] = explode('@', $email, 2);
        $visible = mb_substr($local, 0, min(2, mb_strlen($local)));

        return $visible.str_repeat('•', max(3, mb_strlen($local) - mb_strlen($visible))).'@'.$domain;
    }

    private function issue(User $user): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresMinutes = (int) config('auth.login_otp.expires_minutes');

        DB::transaction(function () use ($user, $code, $expiresMinutes): void {
            User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();

            LoginOtp::query()
                ->where('user_id', $user->getKey())
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now()]);

            LoginOtp::query()->create([
                'user_id' => $user->getKey(),
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes($expiresMinutes),
                'attempts' => 0,
            ]);
        }, 3);

        $user->notify(new LoginOtpNotification($code, $expiresMinutes));
    }

    private function requirePendingUser(Request $request): User
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            throw ValidationException::withMessages([
                'code' => 'Your pending sign-in has expired. Enter your email and password again.',
            ]);
        }

        return $user;
    }

    private function resendRateLimitKey(User $user, Request $request): string
    {
        return 'login-otp-resend:'.$user->getKey().'|'.$request->ip();
    }
}
