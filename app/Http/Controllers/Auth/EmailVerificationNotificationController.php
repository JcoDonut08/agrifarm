<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\PendingRegistration;
use App\Services\Auth\PendingRegistrationService;
use App\Support\Auth\RoleRedirector;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationNotificationController extends Controller
{
    public function __invoke(Request $request, PendingRegistrationService $pendingRegistrationService): RedirectResponse
    {
        if ($request->user()) {
            return redirect()->to(RoleRedirector::path($request->user()));
        }

        $pending = PendingRegistration::query()->find($request->session()->get('registration.pending_id'));

        if (! $pending) {
            return redirect()->route('register');
        }

        $pendingRegistrationService->resend($pending, $request);

        return back()->with('status', 'A new verification code was sent. The previous code is no longer valid.');
    }
}
