<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\PendingRegistration;
use App\Services\Auth\PendingRegistrationService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function store(RegisterRequest $request, PendingRegistrationService $pendingRegistrationService): RedirectResponse
    {
        $pending = PendingRegistration::query()->updateOrCreate(
            ['email' => $request->string('email')->toString()],
            [
                'name' => $request->string('name')->toString(),
                'password' => $request->string('password')->toString(),
                'terms_accepted_at' => now(),
                'privacy_accepted_at' => now(),
            ],
        );

        $request->session()->put('registration.pending_id', $pending->getKey());
        $pendingRegistrationService->issue($pending);

        return redirect()->route('verification.notice')->with(
            'status',
            'We sent a six-digit verification code to your email. Your account will be created after verification.',
        );
    }
}
