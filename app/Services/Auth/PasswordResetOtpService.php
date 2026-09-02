<?php

namespace App\Services\Auth;

use App\Models\AccountOtp;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetOtpService
{
    private const PENDING_SESSION_KEY = 'password_reset.pending';

    private const VERIFIED_SESSION_KEY = 'password_reset.verified';

    private const SESSION_LIFETIME_MINUTES = 15;

    public function __construct(private readonly AccountOtpService $accountOtpService) {}

    public function begin(string $email, Request $request): void
    {
        $user = User::query()->where('email', $email)->first();
        $request->session()->regenerate();
        $request->session()->forget(self::VERIFIED_SESSION_KEY);
        $request->session()->put(self::PENDING_SESSION_KEY, [
            'email' => $email,
            'user_id' => $user?->getKey(),
            'started_at' => now()->getTimestamp(),
        ]);

        $key = $this->startRateLimitKey($email, $request);
        $maxAttempts = (int) config('auth.account_otp.resend_max_per_hour');

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($key);

            throw ValidationException::withMessages([
                'email' => "Too many code requests. Try again in {$seconds} seconds.",
            ]);
        }

        RateLimiter::hit($key, 3600);

        if ($user) {
            $this->accountOtpService->issue($user, AccountOtp::PASSWORD_RESET);
        }
    }

    public function resend(Request $request): void
    {
        $pending = $this->requirePending($request);
        $user = isset($pending['user_id']) ? User::query()->find($pending['user_id']) : null;

        if ($user) {
            $this->accountOtpService->resend($user, AccountOtp::PASSWORD_RESET, $request);

            return;
        }

        $key = $this->startRateLimitKey((string) $pending['email'], $request);
        RateLimiter::hit($key, 3600);
    }

    public function verify(Request $request, string $code): void
    {
        $pending = $this->requirePending($request);
        $user = isset($pending['user_id']) ? User::query()->find($pending['user_id']) : null;

        if (! $user) {
            throw ValidationException::withMessages([
                'code' => 'The verification code is incorrect.',
            ]);
        }

        $this->accountOtpService->verify($user, AccountOtp::PASSWORD_RESET, $code, $request);
        $request->session()->forget(self::PENDING_SESSION_KEY);
        $request->session()->put(self::VERIFIED_SESSION_KEY, [
            'user_id' => $user->getKey(),
            'verified_at' => now()->getTimestamp(),
        ]);
    }

    public function pendingMaskedEmail(Request $request): ?string
    {
        $pending = $this->pending($request);

        return $pending ? $this->maskEmail((string) $pending['email']) : null;
    }

    public function verifiedMaskedEmail(Request $request): ?string
    {
        $user = $this->verifiedUser($request);

        return $user ? $this->maskEmail($user->email) : null;
    }

    public function resetPassword(Request $request, string $password): User
    {
        $user = $this->verifiedUser($request);

        if (! $user) {
            throw ValidationException::withMessages([
                'password' => 'Your verified password reset session has expired. Request a new code.',
            ]);
        }

        DB::transaction(function () use ($user, $password): void {
            $lockedUser = User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            $lockedUser->forceFill([
                'password' => Hash::make($password),
                'remember_token' => Str::random(60),
            ])->save();

            $lockedUser->loginOtps()->whereNull('consumed_at')->update(['consumed_at' => now()]);
            $lockedUser->accountOtps()->whereNull('consumed_at')->update(['consumed_at' => now()]);
        }, 3);

        $request->session()->forget(self::VERIFIED_SESSION_KEY);
        $request->session()->regenerateToken();
        event(new PasswordReset($user));

        return $user;
    }

    private function pending(Request $request): ?array
    {
        $pending = $request->session()->get(self::PENDING_SESSION_KEY);

        if (! is_array($pending) || ! isset($pending['email'], $pending['started_at'])) {
            return null;
        }

        if ((int) $pending['started_at'] < now()->subMinutes(self::SESSION_LIFETIME_MINUTES)->getTimestamp()) {
            $request->session()->forget(self::PENDING_SESSION_KEY);

            return null;
        }

        return $pending;
    }

    private function requirePending(Request $request): array
    {
        $pending = $this->pending($request);

        if (! $pending) {
            throw ValidationException::withMessages([
                'code' => 'Your password reset request has expired. Enter your email again.',
            ]);
        }

        return $pending;
    }

    private function verifiedUser(Request $request): ?User
    {
        $verified = $request->session()->get(self::VERIFIED_SESSION_KEY);

        if (! is_array($verified) || ! isset($verified['user_id'], $verified['verified_at'])) {
            return null;
        }

        if ((int) $verified['verified_at'] < now()->subMinutes(self::SESSION_LIFETIME_MINUTES)->getTimestamp()) {
            $request->session()->forget(self::VERIFIED_SESSION_KEY);

            return null;
        }

        return User::query()->find($verified['user_id']);
    }

    private function maskEmail(string $email): string
    {
        if (! str_contains($email, '@')) {
            return $email;
        }

        [$local, $domain] = explode('@', $email, 2);
        $visible = mb_substr($local, 0, min(2, mb_strlen($local)));

        return $visible.str_repeat('•', max(3, mb_strlen($local) - mb_strlen($visible))).'@'.$domain;
    }

    private function startRateLimitKey(string $email, Request $request): string
    {
        return 'password-reset-start:'.sha1(mb_strtolower($email)).'|'.$request->ip();
    }
}
