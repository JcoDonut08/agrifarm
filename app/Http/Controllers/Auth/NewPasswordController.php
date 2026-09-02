<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Services\Auth\PasswordResetOtpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    public function create(Request $request, PasswordResetOtpService $service): Response|RedirectResponse
    {
        $email = $service->verifiedMaskedEmail($request);

        if (! $email) {
            return redirect()->route('password.request')->withErrors([
                'email' => 'Verify your email with a password reset code before choosing a new password.',
            ]);
        }

        return Inertia::render('Auth/ResetPassword', [
            'email' => $email,
        ]);
    }

    public function store(ResetPasswordRequest $request, PasswordResetOtpService $service): RedirectResponse
    {
        $service->resetPassword($request, $request->string('password')->toString());

        return redirect()->route('login')->with('status', 'Your password has been reset. Sign in with your new password.');
    }
}
