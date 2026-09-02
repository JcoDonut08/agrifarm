<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\LoginOtpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LoginOtpResendController extends Controller
{
    public function __invoke(Request $request, LoginOtpService $loginOtpService): RedirectResponse
    {
        $loginOtpService->resend($request);

        return back()->with('status', 'A new login code was sent. The previous code is no longer valid.');
    }
}
