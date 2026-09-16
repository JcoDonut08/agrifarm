<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\WalkInOrder;
use App\Services\WeatherService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, WeatherService $weatherService): Response
    {
        return Inertia::render('Seller/Dashboard', [
            'products' => Product::where('user_id', $request->user()->id)->latest('id')->get(),
            'orders' => WalkInOrder::with('checkout:id,recipient_name,phone,address,notes,payment_method,reference_number')->where('user_id', $request->user()->id)->latest('id')->get(),
            'weather' => $weatherService->current(),
        ]);
    }
}
