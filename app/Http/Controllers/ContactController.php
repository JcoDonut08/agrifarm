<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactRequest;
use App\Mail\ContactSubmission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ContactController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Contact', [
            'contactEmail' => config('contact.recipient'),
            'contactSuccess' => $request->session()->get('contact_success'),
        ]);
    }

    public function store(ContactRequest $request): RedirectResponse
    {
        $key = 'contact:'.hash('sha256', (string) $request->ip());
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return back()->withErrors(['submission' => 'You have sent several messages. Please try again in a few minutes.']);
        }
        RateLimiter::hit($key, 600);

        $recipient = config('contact.recipient');
        if (! is_string($recipient) || ! filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            return back()->withErrors(['submission' => 'The contact service is unavailable. Please try again later.']);
        }

        $referenceId = 'AF-'.Str::upper((string) Str::ulid());
        try {
            Mail::to($recipient)->send(new ContactSubmission($request->validated(), $referenceId));
        } catch (Throwable $exception) {
            // Do not write the sender's message or SMTP credentials to application logs.
            Log::warning('Contact email could not be sent.', ['reference' => $referenceId, 'exception' => $exception::class]);

            return back()->withErrors(['submission' => 'Your message could not be sent. Please try again, or email us directly.']);
        }

        return to_route('contact')->with('contact_success', $referenceId);
    }
}
