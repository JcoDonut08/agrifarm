<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function store(RegisterRequest $request): RedirectResponse
    {
        $user = DB::transaction(function () use ($request): User {
            $user = new User([
                'name' => $request->string('name')->toString(),
                'email' => $request->string('email')->toString(),
                'password' => $request->string('password')->toString(),
                'terms_accepted_at' => now(),
                'privacy_accepted_at' => now(),
            ]);

            $user->forceFill(['role' => UserRole::Customer])->save();

            return $user;
        });

        event(new Registered($user));

        $request->session()->put('verification.user_id', $user->getKey());

        return redirect()->route('verification.notice')->with(
            'status',
            'Account created. Check your email for the verification link before entering the customer area.',
        );
    }
}
