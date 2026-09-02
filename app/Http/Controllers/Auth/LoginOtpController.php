<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginOtpRequest;
use App\Services\Auth\LoginOtpService;
use App\Support\Auth\RoleRedirector;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LoginOtpController extends Controller
{
    public function show(Request $request, LoginOtpService $loginOtpService): Response|RedirectResponse
    {
        $email = $loginOtpService->maskedPendingEmail($request);

        if (! $email) {
            return redirect()->route('login')->withErrors([
                'email' => 'Your pending sign-in has expired. Enter your credentials again.',
            ]);
        }

        return Inertia::render('Auth/OtpChallenge', [
            'email' => $email,
            'expiresMinutes' => (int) config('auth.login_otp.expires_minutes'),
            'resendCooldownSeconds' => (int) config('auth.login_otp.resend_cooldown_seconds'),
        ]);
    }

    public function store(
        LoginOtpRequest $request,
        LoginOtpService $loginOtpService,
    ): RedirectResponse {
        $user = $loginOtpService->verify($request, $request->string('code')->toString());

        return redirect()->to(RoleRedirector::path($user));
    }
}
