<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductReviewRequest;
use App\Models\ProductReview;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProductReviewController extends Controller
{
    public function store(ProductReviewRequest $request): RedirectResponse
    {
        $data = $request->validated();

        ProductReview::query()->create($this->reviewData($data, $request->user()->id));

        return redirect('/?page=product&product='.$data['product_key'].'#product-reviews')
            ->with('review_status', 'Your review has been posted.');
    }

    public function update(ProductReviewRequest $request, ProductReview $productReview): RedirectResponse
    {
        abort_unless($productReview->user_id === $request->user()->id, 403);
        $data = $request->validated();
        abort_unless($productReview->product_key === $data['product_key'], 422);
        $productReview->update($this->reviewData($data, $request->user()->id));

        return redirect('/?page=product&product='.$productReview->product_key.'#product-reviews')
            ->with('review_status', 'Your review has been updated.');
    }

    public function destroy(Request $request, ProductReview $productReview): RedirectResponse
    {
        abort_unless($productReview->user_id === $request->user()->id, 403);
        $productKey = $productReview->product_key;
        $productReview->delete();

        return redirect('/?page=product&product='.$productKey.'#product-reviews')
            ->with('review_status', 'Your review has been deleted.');
    }

    private function reviewData(array $data, int $userId): array
    {
        return [
            'product_key' => $data['product_key'],
            'product_id' => str_starts_with($data['product_key'], 'seller-') ? (int) substr($data['product_key'], 7) : null,
            'user_id' => $userId,
            'rating' => $data['rating'],
            'comment' => trim($data['comment']),
            'anonymous' => $data['anonymous'],
        ];
    }
}
