<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\PendingRegistration;
use App\Support\Auth\RoleRedirector;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationPromptController extends Controller
{
    public function __invoke(Request $request): Response|RedirectResponse
    {
        if ($request->user()) {
            return redirect()->to(RoleRedirector::path($request->user()));
        }

        $pending = PendingRegistration::query()->find($request->session()->get('registration.pending_id'));

        if (! $pending) {
            return redirect()->route('register');
        }

        return Inertia::render('Auth/VerifyEmail', [
            'email' => $this->maskEmail($pending->email),
            'authenticated' => false,
            'expiresMinutes' => (int) config('auth.account_otp.expires_minutes'),
            'resendCooldownSeconds' => (int) config('auth.account_otp.resend_cooldown_seconds'),
        ]);
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);
        $visible = mb_substr($local, 0, min(2, mb_strlen($local)));

        return $visible.str_repeat('•', max(3, mb_strlen($local) - mb_strlen($visible))).'@'.$domain;
    }
}
