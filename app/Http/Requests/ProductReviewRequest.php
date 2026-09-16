<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductReviewRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('comment'))) {
            $this->merge(['comment' => trim($this->input('comment'))]);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $sellerKeys = Product::query()->whereHas('seller', fn ($query) => $query->where('role', UserRole::Seller->value))
            ->pluck('id')->map(fn ($id) => 'seller-'.$id)->all();

        return [
            'product_key' => ['required', 'string', Rule::in([...config('marketplace.preview_product_keys'), ...$sellerKeys])],
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['required', 'string', 'min:10', 'max:2000'],
            'anonymous' => ['required', 'boolean'],
        ];
    }
}
