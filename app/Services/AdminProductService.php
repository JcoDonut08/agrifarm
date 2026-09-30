<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;

class AdminProductService
{
    public function data(): array
    {
        $products = Product::with(['seller', 'reports' => function ($q) {
            $q->where('status', 'Pending')->orderBy('created_at', 'desc');
        }])
        ->orderByDesc('created_at')
        ->get()
        ->map(function ($product) {
            $flagStatus = $product->status;
            if ($flagStatus === 'active' && $product->stock == 0) {
                $flagStatus = 'out_of_stock';
            }

            return [
                'id' => $product->id,
                'name' => $product->name,
                'photo' => '/marketplace/products/' . $product->id . '/photo?v=' . $product->photoVersion(),
                'category' => $product->category,
                'description' => $product->description,
                'created_at' => $product->created_at->format('M j, Y'),
                'price' => $product->price,
                'unit' => $product->unit,
                'stock' => $product->stock,
                'status' => $product->status, // Real database status (active, delisted)
                'display_status' => $flagStatus, // For UI badge
                'seller_name' => $product->seller->name ?? 'Unknown',
                'barangay' => $product->seller->barangay ?? 'Unknown',
                'reports' => $product->reports->map(function ($report) {
                    return [
                        'id' => $report->id,
                        'reporter_name' => $report->reporter_name,
                        'reason' => $report->type,
                        'description' => $report->description,
                        'date' => $report->created_at->format('M j, Y'),
                    ];
                }),
            ];
        });

        return [
            'products' => $products,
        ];
    }
}
