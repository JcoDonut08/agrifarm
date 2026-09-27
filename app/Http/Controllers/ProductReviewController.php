<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductReviewRequest;
use App\Models\ProductReview;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductReviewController extends Controller
{
    public function store(ProductReviewRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $reviewData = $this->reviewData($data, $request->user()->id);
        if ($request->hasFile('attachment')) {
            $reviewData['attachment_path'] = $request->file('attachment')->store('reviews', 'public');
        }
        ProductReview::query()->create($reviewData);

        return redirect('/?page=product&product='.$data['product_key'].'#product-reviews')
            ->with('review_status', 'Your review has been posted.');
    }

    public function update(ProductReviewRequest $request, ProductReview $productReview): RedirectResponse
    {
        abort_unless($productReview->user_id === $request->user()->id, 403);
        $data = $request->validated();
        abort_unless($productReview->product_key === $data['product_key'], 422);
        $reviewData = $this->reviewData($data, $request->user()->id);
        if ($request->hasFile('attachment')) {
            if ($productReview->attachment_path) {
                Storage::disk('public')->delete($productReview->attachment_path);
            }
            $reviewData['attachment_path'] = $request->file('attachment')->store('reviews', 'public');
        }
        $productReview->update($reviewData);

        return redirect('/?page=product&product='.$productReview->product_key.'#product-reviews')
            ->with('review_status', 'Your review has been updated.');
    }

    public function destroy(Request $request, ProductReview $productReview): RedirectResponse
    {
        abort_unless($productReview->user_id === $request->user()->id, 403);
        $productKey = $productReview->product_key;
        if ($productReview->attachment_path) {
            Storage::disk('public')->delete($productReview->attachment_path);
        }
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
