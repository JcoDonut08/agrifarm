<?php

namespace App\Http\Middleware;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureSellerAccountIsActive
{
    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->role === UserRole::Seller && $user->account_status === AccountStatus::Suspended) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('status', 'This seller account is suspended. Please contact Pasig CENRO.');
        }

        return $next($request);
    }
}
