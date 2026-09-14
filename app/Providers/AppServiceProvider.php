<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
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
