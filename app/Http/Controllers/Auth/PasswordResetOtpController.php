<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\OtpCodeRequest;
use App\Services\Auth\PasswordResetOtpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetOtpController extends Controller
{
    public function show(Request $request, PasswordResetOtpService $service): Response|RedirectResponse
    {
        $email = $service->pendingMaskedEmail($request);

        if (! $email) {
            return redirect()->route('password.request')->withErrors([
                'email' => 'Your password reset request has expired. Enter your email again.',
            ]);
        }

        return Inertia::render('Auth/PasswordResetOtp', [
            'email' => $email,
            'expiresMinutes' => (int) config('auth.account_otp.expires_minutes'),
            'resendCooldownSeconds' => (int) config('auth.account_otp.resend_cooldown_seconds'),
        ]);
    }

    public function store(OtpCodeRequest $request, PasswordResetOtpService $service): RedirectResponse
    {
        $service->verify($request, $request->string('code')->toString());

        return redirect()->route('password.reset');
    }
}
