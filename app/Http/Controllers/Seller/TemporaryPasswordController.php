<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class TemporaryPasswordController extends Controller
{
    public function create(): Response|RedirectResponse
    {
        if (! request()->user()->password_must_be_changed) {
            return redirect()->route('seller.dashboard');
        }

        return Inertia::render('Seller/TemporaryPassword');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'temporary_password' => ['required', 'current_password'],
            'password' => ['required', Password::min(8)->letters()->numbers(), 'confirmed', 'different:temporary_password'],
        ]);

        $request->user()->forceFill([
            'password' => Hash::make($data['password']),
            'password_must_be_changed' => false,
            'remember_token' => Str::random(60),
        ])->save();
        $request->session()->regenerate();

        return redirect()->route('seller.dashboard')->with('status', 'Password updated. Your seller account is ready.');
    }
}
