<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Report;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'nullable|integer|exists:products,id',
            'product_name' => 'nullable|string|max:255',
            'seller_name' => 'nullable|string|max:255',
            'barangay' => 'nullable|string|max:100',
            'type' => 'required|string|max:50',
            'description' => 'required|string|max:1000',
        ]);

        $product = isset($validated['product_id']) ? Product::with('seller')->findOrFail($validated['product_id']) : null;

        Report::create([
            'reporter_name' => $request->user()?->name ?? 'Anonymous',
            'seller_name' => $product?->seller?->name,
            'product_id' => $product?->id,
            'product_name' => $product?->name,
            'barangay' => $product?->seller?->barangay,
            'type' => $validated['type'],
            'description' => $validated['description'],
            'status' => 'Pending',
        ]);

        return response()->json(['success' => true]);
    }
}
