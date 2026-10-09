<?php

namespace App\Providers;

use Illuminate\Auth\Events\Login;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(Login::class, function (Login $event): void {
            if (request()->hasSession()) {
                // Bind the session immediately, including Google and remembered logins.
                request()->session()->put('password_hash_'.$event->guard,
                    Auth::guard($event->guard)->hashPasswordForCookie($event->user->getAuthPassword()));
            }
        });

        RateLimiter::for('seller-forecast-uploads', function (Request $request): Limit {
            $seller = $request->user()?->getAuthIdentifier() ?? $request->ip();

            return Limit::perMinute(5)->by('seller-forecast-uploads:'.$seller);
        });
        RateLimiter::for('seller-order-status', function (Request $request): Limit {
            $seller = $request->user()?->getAuthIdentifier() ?? $request->ip();

            return Limit::perMinute(60)->by('seller-order-status:'.$seller);
        });
        RateLimiter::for('seller-product-management', function (Request $request): Limit {
            $seller = $request->user()?->getAuthIdentifier() ?? $request->ip();

            return Limit::perMinute(60)->by('seller-product-management:'.$seller);
        });
    }
}
