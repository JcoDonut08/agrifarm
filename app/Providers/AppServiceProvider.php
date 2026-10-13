<?php

namespace App\Providers;

use Illuminate\Auth\Events\Login;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoApiTransport;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(BrevoApiTransport::class, function (): BrevoApiTransport {
            $key = (string) config('services.brevo.key');

            if (trim($key) === '') {
                throw new InvalidArgumentException('Configure BREVO_API_KEY before using the Brevo mailer.');
            }

            return new BrevoApiTransport($key, HttpClient::create([
                'timeout' => (int) config('mail.mailers.brevo.timeout', 20),
                'max_duration' => (int) config('mail.mailers.brevo.timeout', 20),
            ]));
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Mail::extend('brevo', fn (array $config): BrevoApiTransport => $this->app->make(BrevoApiTransport::class));

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
