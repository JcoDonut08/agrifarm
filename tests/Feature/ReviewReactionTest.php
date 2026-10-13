<?php

namespace Tests\Feature;

use App\Models\ProductReview;
use App\Models\ReviewReaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewReactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_explicit_reaction_targets_are_safe_to_retry(): void
    {
        $user = User::factory()->create();
        $review = $this->review();
        $this->actingAs($user);

        foreach (['like', 'dislike'] as $type) {
            for ($attempt = 0; $attempt < 2; $attempt++) {
                $this->post('/product-reviews/'.$review->id.'/react', ['type' => $type, 'active' => true])->assertRedirect();
                $this->assertDatabaseCount('review_reactions', 1);
                $this->assertDatabaseHas('review_reactions', ['user_id' => $user->id, 'product_review_id' => $review->id, 'type' => $type]);
            }
        }
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $this->post('/product-reviews/'.$review->id.'/react', ['type' => 'dislike', 'active' => false])->assertRedirect();
            $this->assertDatabaseCount('review_reactions', 0);
        }
    }

    public function test_older_clients_can_still_toggle_a_reaction(): void
    {
        $this->actingAs(User::factory()->create());
        $review = $this->review();
        $url = '/product-reviews/'.$review->id.'/react';
        $this->post($url, ['type' => 'like'])->assertRedirect();
        $this->assertDatabaseCount('review_reactions', 1);
        $this->post($url, ['type' => 'like'])->assertRedirect();
        $this->assertDatabaseCount('review_reactions', 0);
    }

    public function test_a_target_does_not_change_another_users_reaction(): void
    {
        $other = User::factory()->create();
        $review = $this->review();
        ReviewReaction::create(['user_id' => $other->id, 'product_review_id' => $review->id, 'type' => 'like']);
        $this->actingAs(User::factory()->create())
            ->post('/product-reviews/'.$review->id.'/react', ['type' => 'like', 'active' => false])->assertRedirect();
        $this->assertDatabaseCount('review_reactions', 1);
        $this->assertDatabaseHas('review_reactions', ['user_id' => $other->id, 'type' => 'like']);
    }

    public function test_invalid_targets_are_rejected_and_sign_in_is_required(): void
    {
        $review = $this->review();
        $url = '/product-reviews/'.$review->id.'/react';
        $this->post($url, ['type' => 'like', 'active' => true])->assertRedirect('/login');
        $this->actingAs(User::factory()->create())
            ->postJson($url, ['type' => 'like', 'active' => 'invalid'])->assertUnprocessable()->assertJsonValidationErrors('active');
        $this->assertDatabaseCount('review_reactions', 0);
    }

    private function review(): ProductReview
    {
        return ProductReview::create(['product_key' => 'pechay', 'user_id' => User::factory()->create()->id, 'rating' => 5, 'comment' => 'Fresh harvest.', 'anonymous' => false]);
    }
}
