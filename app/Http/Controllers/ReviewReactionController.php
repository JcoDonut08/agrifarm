<?php

namespace App\Http\Controllers;

use App\Models\ProductReview;
use App\Models\ReviewReaction;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

class ReviewReactionController extends Controller
{
    public function toggle(Request $request, ProductReview $productReview): RedirectResponse
    {
        $data = $request->validate([
            "type" => ["required", "in:like,dislike"]
        ]);

        $userId = $request->user()->id;

        $existing = ReviewReaction::query()
            ->where("product_review_id", $productReview->id)
            ->where("user_id", $userId)
            ->first();

        if ($existing) {
            if ($existing->type === $data["type"]) {
                $existing->delete();
            } else {
                $existing->update(["type" => $data["type"]]);
            }
        } else {
            ReviewReaction::create([
                "product_review_id" => $productReview->id,
                "user_id" => $userId,
                "type" => $data["type"],
            ]);
        }

        return back();
    }
}

