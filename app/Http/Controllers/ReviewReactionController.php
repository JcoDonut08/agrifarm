<?php

namespace App\Http\Controllers;

use App\Models\ProductReview;
use App\Models\ReviewReaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ReviewReactionController extends Controller
{
    public function toggle(Request $request, ProductReview $productReview): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', 'in:like,dislike'],
            'active' => ['sometimes', 'required', 'boolean'],
        ]);

        $userId = $request->user()->id;

        $existing = ReviewReaction::query()
            ->where('product_review_id', $productReview->id)
            ->where('user_id', $userId)
            ->first();

        if (array_key_exists('active', $data)) {
            // An explicit target makes retries safe when a saved response is lost.
            if ($data['active']) {
                ReviewReaction::query()->updateOrCreate(
                    ['product_review_id' => $productReview->id, 'user_id' => $userId],
                    ['type' => $data['type']],
                );
            } else {
                $existing?->delete();
            }

            return back();
        }

        if ($existing) {
            if ($existing->type === $data['type']) {
                $existing->delete();
            } else {
                $existing->update(['type' => $data['type']]);
            }
        } else {
            ReviewReaction::create([
                'product_review_id' => $productReview->id,
                'user_id' => $userId,
                'type' => $data['type'],
            ]);
        }

        return back();
    }
}
