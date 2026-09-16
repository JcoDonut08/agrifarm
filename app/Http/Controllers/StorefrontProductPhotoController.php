<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StorefrontProductPhotoController extends Controller
{
    public function __invoke(Product $product): BinaryFileResponse
    {
        $product->load('seller:id,role');
        abort_unless($product->seller?->role === UserRole::Seller, 404);
        abort_unless(Storage::disk('local')->exists($product->photo_path), 404);

        return response()->file(Storage::disk('local')->path($product->photo_path), [
            'Cache-Control' => 'public, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
