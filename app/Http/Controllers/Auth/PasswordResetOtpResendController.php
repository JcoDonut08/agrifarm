<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\PasswordResetOtpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PasswordResetOtpResendController extends Controller
{
    public function __invoke(Request $request, PasswordResetOtpService $service): RedirectResponse
    {
        $service->resend($request);

        return back()->with('status', 'If an AgriFarm account matches that email, a new code has been sent.');
    }
}
