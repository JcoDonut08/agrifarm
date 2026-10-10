<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Customer/Settings', [
            'orderUpdateEmails' => $request->user()->order_update_emails,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate(['order_update_emails' => ['required', 'boolean']]);
        $request->user()->forceFill($data)->save();

        return back()->with('status', 'Notification preference saved.');
    }
}
