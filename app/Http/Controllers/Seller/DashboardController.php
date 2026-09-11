<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return Inertia::render('Seller/Dashboard', [
            'products' => Product::where('user_id', $request->user()->id)->latest('id')->get(),
        ]);
    }
}
