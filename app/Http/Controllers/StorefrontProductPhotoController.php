<?php

namespace App\Http\Controllers;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Product;
use App\Services\ProductPhotoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StorefrontProductPhotoController extends Controller
{
    public function __invoke(Request $request, Product $product, ProductPhotoService $photos): BinaryFileResponse
    {
        $product->load('seller:id,role,account_status');
        abort_unless($product->seller?->role === UserRole::Seller && $product->seller->account_status === AccountStatus::Active, 404);
        abort_unless(Storage::disk('local')->exists($product->photo_path), 404);

        $path = $photos->displayPath($product->photo_path, $request->query('size') === 'card');

        return response()->file(Storage::disk('local')->path($path), [
            'Cache-Control' => 'public, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
