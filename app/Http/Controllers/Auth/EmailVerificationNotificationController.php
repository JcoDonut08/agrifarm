<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Auth\RoleRedirector;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationNotificationController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $user = $request->user() ?? User::query()->find($request->session()->get('verification.user_id'));

        if (! $user) {
            return redirect()->route('register');
        }

        if ($user->hasVerifiedEmail()) {
            return $request->user()
                ? redirect()->to(RoleRedirector::path($user))
                : redirect()->route('login');
        }

        $user->sendEmailVerificationNotification();

        return back()->with('status', 'A new verification link was sent to your email.');
    }
}
