<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\WalkInOrder;
use App\Services\ProductPhotoService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    private const CATEGORIES = ['Vegetables', 'Fruits', 'Herbs', 'Beans'];

    private const UNITS = ['kg', 'bunch', 'piece', 'head', 'pack'];

    private const ACTIVE_ORDER_STATUSES = ['pending', 'reservation', 'preparing', 'out_for_delivery'];

    public function store(Request $request, ProductPhotoService $photos): RedirectResponse
    {
        $data = $this->validatedProduct($request, true);
        $path = $photos->store($request->file('photo'), $request->user()->id);
        unset($data['photo']);
        try {
            $product = new Product([...$data, 'photo_path' => $path]);
            $product->user_id = $request->user()->id;
            $product->save();
        } catch (\Throwable $exception) {
            $photos->delete($path);
            throw $exception;
        }

        return redirect('/seller/dashboard?section=products')->with('status', 'Product added successfully.');
    }

    public function update(Request $request, Product $product, ProductPhotoService $photos): RedirectResponse
    {
        $this->ensureOwner($request, $product);
        $data = $this->validatedProduct($request, false);
        $previousPath = $product->photo_path;
        $replacementPath = null;

        if ($request->hasFile('photo')) {
            $replacementPath = $photos->store($request->file('photo'), $request->user()->id);
            $data['photo_path'] = $replacementPath;
        }
        unset($data['photo']);

        try {
            DB::transaction(function () use ($product, $data, &$previousPath): void {
                $currentProduct = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();
                if ($data['unit'] !== $currentProduct->unit && WalkInOrder::where('product_id', $currentProduct->id)
                    ->whereIn('status', self::ACTIVE_ORDER_STATUSES)->exists()) {
                    throw ValidationException::withMessages([
                        'unit' => 'Finish or cancel open orders before changing the selling unit.',
                    ]);
                }
                $inventoryErrors = [];
                foreach (['stock', 'expected_yield'] as $field) {
                    if (! array_key_exists($field, $data)) {
                        continue;
                    }
                    $original = (int) $data['original_'.$field];
                    if ((int) $data[$field] === $original) {
                        unset($data[$field]);
                    } elseif ((int) $currentProduct->{$field} !== $original) {
                        $label = $field === 'stock' ? 'Available stock' : 'Expected harvest quantity';
                        $inventoryErrors[$field] = "{$label} changed. Current quantity: {$currentProduct->{$field}}. Review it before saving.";
                    }
                }
                if ($inventoryErrors !== []) {
                    throw ValidationException::withMessages($inventoryErrors);
                }
                unset($data['original_stock'], $data['original_expected_yield']);
                $previousPath = $currentProduct->photo_path;
                $currentProduct->update($data);
            });
        } catch (\Throwable $exception) {
            if ($replacementPath) {
                $photos->delete($replacementPath);
            }
            throw $exception;
        }

        if ($replacementPath && $previousPath !== $replacementPath) {
            $photos->delete($previousPath);
        }

        return redirect('/seller/dashboard?section=products')->with('status', 'Product updated successfully.');
    }

    public function destroy(Request $request, Product $product, ProductPhotoService $photos): RedirectResponse
    {
        $this->ensureOwner($request, $product);
        $path = DB::transaction(function () use ($request, $product): ?string {
            // Order creation reserves inventory under this same product lock.
            $currentProduct = Product::where('user_id', $request->user()->id)
                ->whereKey($product->id)->lockForUpdate()->firstOrFail();
            if (WalkInOrder::where('product_id', $currentProduct->id)
                ->whereIn('status', self::ACTIVE_ORDER_STATUSES)->exists()) {
                throw ValidationException::withMessages([
                    'product' => 'This product has unfinished orders or reservations. Finish or cancel them before deleting it.',
                ]);
            }
            $path = $currentProduct->photo_path;
            $currentProduct->delete();

            return $path;
        });
        $photos->delete($path);

        return redirect('/seller/dashboard?section=products')->with('status', 'Product deleted successfully.');
    }

    public function bulkDestroy(Request $request, ProductPhotoService $photos): RedirectResponse
    {
        $data = $request->validate([
            'product_ids' => ['required', 'array', 'min:1', 'max:100'],
            'product_ids.*' => ['required', 'integer', 'distinct'],
        ]);
        $ids = collect($data['product_ids'])->map(fn ($id) => (int) $id)->unique()->values();
        $paths = DB::transaction(function () use ($request, $ids): array {
            $products = Product::where('user_id', $request->user()->id)->whereIn('id', $ids)
                ->orderBy('id')->lockForUpdate()->get();
            if ($products->count() !== $ids->count()) {
                throw ValidationException::withMessages(['product_ids' => 'One or more selected products could not be deleted.']);
            }
            if (WalkInOrder::whereIn('product_id', $ids)
                ->whereIn('status', self::ACTIVE_ORDER_STATUSES)->exists()) {
                throw ValidationException::withMessages([
                    'product_ids' => 'One or more selected products have unfinished orders or reservations. No products were deleted. Finish or cancel those orders, or remove those products from your selection.',
                ]);
            }
            Product::where('user_id', $request->user()->id)->whereIn('id', $ids)->delete();

            return $products->pluck('photo_path')->all();
        });
        $photos->delete($paths);

        $count = $ids->count();

        return redirect('/seller/dashboard?section=products')->with('status', "{$count} ".($count === 1 ? 'product' : 'products').' deleted successfully.');
    }

    public function photo(Request $request, Product $product, ProductPhotoService $photos)
    {
        $this->ensureOwner($request, $product);
        abort_unless(Storage::disk('local')->exists($product->photo_path), 404);

        $path = $photos->displayPath($product->photo_path, $request->query('size') === 'card');

        return response()->file(Storage::disk('local')->path($path), ['Cache-Control' => 'private, max-age=3600', 'X-Content-Type-Options' => 'nosniff']);
    }

    private function validatedProduct(Request $request, bool $photoRequired): array
    {
        $request->merge(['name' => trim((string) $request->input('name'))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'description' => ['nullable', 'string', 'max:1000'],
            'price' => ['required', 'numeric', 'min:0.01', 'max:99999999.99', 'decimal:0,2'],
            'unit' => ['required', Rule::in(self::UNITS)],
            'stock' => [$photoRequired ? 'required' : 'sometimes', 'integer', 'min:0', 'max:1000000'],
            'threshold' => ['required', 'integer', 'min:0', 'max:1000000'],
            'expected_yield' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'harvest_date' => ['nullable', 'date', 'after_or_equal:today'],
            'photo' => [$photoRequired ? 'required' : 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240', 'dimensions:max_width=6000,max_height=6000'],
            ...($photoRequired ? [] : [
                'original_stock' => [Rule::requiredIf($request->exists('stock')), 'integer', 'min:0', 'max:1000000'],
                'original_expected_yield' => [Rule::requiredIf($request->exists('expected_yield')), 'integer', 'min:0', 'max:1000000'],
            ]),
        ], [
            'original_stock.required' => 'Refresh this product before changing its stock.',
            'original_expected_yield.required' => 'Refresh this product before changing its expected harvest quantity.',
        ]);
        if (array_key_exists('expected_yield', $data)) {
            $data['expected_yield'] = (int) $data['expected_yield'];
        }

        return $data;
    }

    private function ensureOwner(Request $request, Product $product): void
    {
        abort_unless($product->user_id === $request->user()->id, 404);
    }
}
