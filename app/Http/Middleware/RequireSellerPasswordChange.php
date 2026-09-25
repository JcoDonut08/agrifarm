<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireSellerPasswordChange
{
    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->password_must_be_changed) {
            return redirect()->route('seller.temporary-password.create');
        }

        return $next($request);
    }
}
