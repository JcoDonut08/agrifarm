<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Services\Auth\PasswordResetOtpService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    public function store(ForgotPasswordRequest $request, PasswordResetOtpService $service): RedirectResponse
    {
        $service->begin($request->string('email')->toString(), $request);

        return redirect()->route('password.otp')->with(
            'status',
            'If an AgriFarm account matches that email, a six-digit code has been sent.',
        );
    }
}
