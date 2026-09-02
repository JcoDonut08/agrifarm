<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\OtpCodeRequest;
use App\Models\PendingRegistration;
use App\Services\Auth\PendingRegistrationService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;

class VerifyEmailController extends Controller
{
    public function __invoke(OtpCodeRequest $request, PendingRegistrationService $pendingRegistrationService): RedirectResponse
    {
        $pending = PendingRegistration::query()->find($request->session()->get('registration.pending_id'));

        if (! $pending) {
            return redirect()->route('register');
        }

        $user = $pendingRegistrationService->verifyAndCreate(
            $pending,
            $request->string('code')->toString(),
            $request,
        );
        event(new Verified($user));

        $request->session()->forget('registration.pending_id');

        return redirect()->route('login')->with('status', 'Your email has been verified and your account was created. Sign in to continue.');
    }
}
