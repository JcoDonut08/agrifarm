<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Auth\RoleRedirector;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationPromptController extends Controller
{
    public function __invoke(Request $request): Response|RedirectResponse
    {
        $user = $request->user() ?? User::query()->find($request->session()->get('verification.user_id'));

        if (! $user) {
            return redirect()->route('register');
        }

        if ($user->hasVerifiedEmail()) {
            return $request->user()
                ? redirect()->to(RoleRedirector::path($user))
                : redirect()->route('login')->with('status', 'Your email is verified. You can now sign in.');
        }

        return Inertia::render('Auth/VerifyEmail', [
            'email' => $user->email,
            'authenticated' => $request->user() !== null,
        ]);
    }
}
