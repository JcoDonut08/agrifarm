<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Auth\RoleRedirector;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    public function __invoke(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::query()->findOrFail($id);

        abort_unless(hash_equals($hash, sha1($user->getEmailForVerification())), 403);

        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        $request->session()->forget('verification.user_id');

        if ($request->user()?->is($user)) {
            return redirect()->to(RoleRedirector::path($user))->with('status', 'Your email has been verified.');
        }

        return redirect()->route('login')->with('status', 'Your email has been verified. Sign in to continue.');
    }
}
