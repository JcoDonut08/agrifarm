<?php

namespace App\Enums;

enum UserRole: string
{
    case Customer = 'customer';
    case Seller = 'seller';
    case CenroAdmin = 'cenro_admin';

    public function label(): string
    {
        return match ($this) {
            self::Customer => 'Customer',
            self::Seller => 'Seller / Urban Farmer',
            self::CenroAdmin => 'CENRO Administrator',
        };
    }
}
