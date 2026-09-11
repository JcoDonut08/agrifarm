<?php

namespace App\Support\Auth;

use App\Enums\UserRole;
use App\Models\User;

class RoleRedirector
{
    public static function path(User $user): string
    {
        return match ($user->role) {
            UserRole::Customer => route('home'),
            UserRole::Seller => route('seller.dashboard'),
            UserRole::CenroAdmin => route('admin.dashboard'),
        };
    }
}
