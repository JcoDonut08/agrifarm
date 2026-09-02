<?php

namespace App\Services\Auth;

use App\Enums\UserRole;
use App\Models\AccountOtp;
use App\Models\PendingRegistration;
use App\Models\User;
use App\Notifications\AccountOtpNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class PendingRegistrationService
{
    public function issue(PendingRegistration $pending): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresMinutes = (int) config('auth.account_otp.expires_minutes');

        DB::transaction(function () use ($pending, $code, $expiresMinutes): void {
            $locked = PendingRegistration::query()
                ->whereKey($pending->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $locked->forceFill([
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes($expiresMinutes),
                'code_sent_at' => now(),
                'attempts' => 0,
            ])->save();
        }, 3);

        $pending->notify(new AccountOtpNotification(
            $code,
            $expiresMinutes,
            AccountOtp::EMAIL_VERIFICATION,
        ));
    }

    public function resend(PendingRegistration $pending, Request $request): void
    {
        $pending->refresh();
        $cooldown = (int) config('auth.account_otp.resend_cooldown_seconds');

        if ($pending->code_sent_at?->isAfter(now()->subSeconds($cooldown))) {
            $seconds = max(1, (int) ceil($pending->code_sent_at->addSeconds($cooldown)->diffInSeconds(now())));

            throw ValidationException::withMessages([
                'code' => "Please wait {$seconds} seconds before requesting another code.",
            ]);
        }

        $key = $this->resendRateLimitKey($pending, $request);
        $maxAttempts = (int) config('auth.account_otp.resend_max_per_hour');

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($key);

            throw ValidationException::withMessages([
                'code' => "Too many code requests. Try again in {$seconds} seconds.",
            ]);
        }

        RateLimiter::hit($key, 3600);
        $this->issue($pending);
    }

    public function verifyAndCreate(PendingRegistration $pending, string $code, Request $request): User
    {
        $maxAttempts = (int) config('auth.account_otp.max_attempts');

        [$result, $user] = DB::transaction(function () use ($pending, $code, $maxAttempts): array {
            $locked = PendingRegistration::query()
                ->whereKey($pending->getKey())
                ->lockForUpdate()
                ->first();

            if (! $locked || ! $locked->code_hash) {
                return ['missing', null];
            }

            if (! $locked->expires_at || $locked->expires_at->isPast()) {
                return ['expired', null];
            }

            if ($locked->attempts >= $maxAttempts) {
                return ['locked', null];
            }

            if (! Hash::check($code, $locked->code_hash)) {
                $attempts = $locked->attempts + 1;
                $locked->forceFill(['attempts' => $attempts])->save();

                return [$attempts >= $maxAttempts ? 'locked' : 'invalid', null];
            }

            if (User::query()->where('email', $locked->email)->exists()) {
                $locked->delete();

                return ['exists', null];
            }

            $user = new User([
                'name' => $locked->name,
                'email' => $locked->email,
                'password' => $locked->password,
                'terms_accepted_at' => $locked->terms_accepted_at,
                'privacy_accepted_at' => $locked->privacy_accepted_at,
            ]);
            $user->forceFill([
                'role' => UserRole::Customer,
                'email_verified_at' => now(),
            ])->save();

            $locked->delete();

            return ['valid', $user];
        }, 3);

        if ($result !== 'valid' || ! $user instanceof User) {
            $message = match ($result) {
                'expired' => 'This verification code has expired. Request a new code to continue.',
                'locked' => 'Too many incorrect attempts. Request a new code to continue.',
                'exists' => 'An account with this email already exists. Sign in instead.',
                'missing' => 'This verification code is no longer active. Start registration again.',
                default => 'The verification code is incorrect.',
            };

            throw ValidationException::withMessages(['code' => $message]);
        }

        RateLimiter::clear($this->resendRateLimitKey($pending, $request));

        return $user;
    }

    private function resendRateLimitKey(PendingRegistration $pending, Request $request): string
    {
        return 'pending-registration-otp-resend:'.$pending->getKey().'|'.$request->ip();
    }
}
