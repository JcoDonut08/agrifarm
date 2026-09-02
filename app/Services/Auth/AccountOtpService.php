<?php

namespace App\Services\Auth;

use App\Models\AccountOtp;
use App\Models\User;
use App\Notifications\AccountOtpNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AccountOtpService
{
    public function issue(User $user, string $purpose): void
    {
        $this->guardPurpose($purpose);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresMinutes = (int) config('auth.account_otp.expires_minutes');

        DB::transaction(function () use ($user, $purpose, $code, $expiresMinutes): void {
            User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();

            AccountOtp::query()
                ->where('user_id', $user->getKey())
                ->where('purpose', $purpose)
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now()]);

            AccountOtp::query()->create([
                'user_id' => $user->getKey(),
                'purpose' => $purpose,
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes($expiresMinutes),
                'attempts' => 0,
            ]);
        }, 3);

        $user->notify(new AccountOtpNotification($code, $expiresMinutes, $purpose));
    }

    public function resend(User $user, string $purpose, Request $request): void
    {
        $this->guardPurpose($purpose);

        $latest = $user->accountOtps()->where('purpose', $purpose)->latest('id')->first();
        $cooldown = (int) config('auth.account_otp.resend_cooldown_seconds');

        if ($latest?->created_at?->isAfter(now()->subSeconds($cooldown))) {
            $seconds = max(1, (int) ceil($latest->created_at->addSeconds($cooldown)->diffInSeconds(now())));

            throw ValidationException::withMessages([
                'code' => "Please wait {$seconds} seconds before requesting another code.",
            ]);
        }

        $key = $this->resendRateLimitKey($user, $purpose, $request);
        $maxAttempts = (int) config('auth.account_otp.resend_max_per_hour');

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($key);

            throw ValidationException::withMessages([
                'code' => "Too many code requests. Try again in {$seconds} seconds.",
            ]);
        }

        RateLimiter::hit($key, 3600);
        $this->issue($user, $purpose);
    }

    public function verify(User $user, string $purpose, string $code, Request $request): void
    {
        $this->guardPurpose($purpose);
        $maxAttempts = (int) config('auth.account_otp.max_attempts');

        $result = DB::transaction(function () use ($user, $purpose, $code, $maxAttempts): string {
            $otp = AccountOtp::query()
                ->where('user_id', $user->getKey())
                ->where('purpose', $purpose)
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
            $message = match ($result) {
                'expired' => 'This verification code has expired. Request a new code to continue.',
                'locked' => 'Too many incorrect attempts. Request a new code to continue.',
                'missing' => 'This verification code is no longer active. Request a new code to continue.',
                default => 'The verification code is incorrect.',
            };

            throw ValidationException::withMessages(['code' => $message]);
        }

        RateLimiter::clear($this->resendRateLimitKey($user, $purpose, $request));
    }

    private function resendRateLimitKey(User $user, string $purpose, Request $request): string
    {
        return "account-otp-resend:{$purpose}:{$user->getKey()}|{$request->ip()}";
    }

    private function guardPurpose(string $purpose): void
    {
        abort_unless(in_array($purpose, [AccountOtp::EMAIL_VERIFICATION, AccountOtp::PASSWORD_RESET], true), 500);
    }
}
