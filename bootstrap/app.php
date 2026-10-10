<?php

use App\Http\Middleware\EnsureSellerAccountIsActive;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequireSellerPasswordChange;
use App\Support\Auth\RoleRedirector;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\AuthenticateSession;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->redirectGuestsTo(fn () => route('login'));
        $middleware->redirectUsersTo(fn (Request $request) => RoleRedirector::path($request->user()));

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            'seller.active' => EnsureSellerAccountIsActive::class,
            'seller.password-change' => RequireSellerPasswordChange::class,
        ]);

        $middleware->web(append: [
            AuthenticateSession::class,
            HandleInertiaRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            if ($response->getStatusCode() === 429 && $request->header('X-Inertia') && ! $request->isMethod('GET')) {
                $seconds = max(1, (int) $response->headers->get('Retry-After', 60));

                return back(303)->withErrors(['request' => "Please wait {$seconds} seconds before trying again."]);
            }
            if (in_array($response->getStatusCode(), [500, 503, 404, 403, 401])) {
                return Inertia::render('Error', [
                    'status' => $response->getStatusCode(),
                ])->toResponse($request)->setStatusCode($response->getStatusCode());
            }

            return $response;
        });
    })->create();
