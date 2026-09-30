<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class AdminProductController extends Controller
{
    public function delist(Product $product)
    {
        $product->status = 'delisted';
        $product->save();
        return Redirect::back()->with('success', 'Product has been hidden from the marketplace.');
    }

    public function relist(Product $product)
    {
        $product->status = 'active';
        $product->save();
        return Redirect::back()->with('success', 'Product has been restored and is now visible.');
    }
}
