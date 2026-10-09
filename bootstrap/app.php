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
        $exceptions->respond(function (\Symfony\Component\HttpFoundation\Response $response, \Throwable $exception, \Illuminate\Http\Request $request) {
            if (in_array($response->getStatusCode(), [500, 503, 404, 403, 401])) {
                return \Inertia\Inertia::render('Error', [
                    'status' => $response->getStatusCode()
                ])->toResponse($request)->setStatusCode($response->getStatusCode());
            }
            return $response;
        });
    })->create();
