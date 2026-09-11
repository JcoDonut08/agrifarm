<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $request->merge(['name' => trim((string) $request->input('name'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'category' => ['required', Rule::in(['Vegetables', 'Fruits', 'Herbs', 'Beans'])],
            'description' => ['nullable', 'string', 'max:1000'],
            'price' => ['required', 'numeric', 'min:0.01', 'max:99999999.99', 'decimal:0,2'],
            'unit' => ['required', Rule::in(['kg', 'bunch', 'piece', 'head', 'pack'])],
            'stock' => ['required', 'integer', 'min:0', 'max:1000000'],
            'threshold' => ['required', 'integer', 'min:0', 'max:1000000'],
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=6000,max_height=6000'],
        ]);
        $path = $request->file('photo')->store('products/'.$request->user()->id, 'local');
        if (! $path) {
            throw ValidationException::withMessages(['photo' => 'The photo could not be saved. Please try again.']);
        }
        unset($data['photo']);
        try {
            $product = new Product([...$data, 'photo_path' => $path]);
            $product->user_id = $request->user()->id;
            $product->save();
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return redirect('/seller/dashboard?section=products')->with('status', 'Product added successfully.');
    }

    public function photo(Request $request, Product $product)
    {
        abort_unless($product->user_id === $request->user()->id, 404);
        abort_unless(Storage::disk('local')->exists($product->photo_path), 404);

        return response()->file(Storage::disk('local')->path($product->photo_path), ['Cache-Control' => 'private, max-age=3600', 'X-Content-Type-Options' => 'nosniff']);
    }
}
