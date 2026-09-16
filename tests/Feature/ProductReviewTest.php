<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ProductReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProductReviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_only_signed_in_customer_accounts_can_post_reviews(): void
    {
        $payload = $this->payload();
        $this->post('/product-reviews', $payload)->assertRedirect('/login');
        $this->actingAs(User::factory()->seller()->create())->post('/product-reviews', $payload)->assertForbidden();
        $customer = User::factory()->unverified()->create();
        $this->actingAs($customer)->post('/product-reviews', $payload)
            ->assertRedirect('/?page=product&product=pechay#product-reviews');
        $this->assertDatabaseHas('product_reviews', ['user_id' => $customer->id, 'product_key' => 'pechay']);
    }

    public function test_review_is_persisted_and_anonymous_name_is_hidden(): void
    {
        $customer = User::factory()->create(['name' => 'Maria Rosario']);
        $this->actingAs($customer)->post('/product-reviews', $this->payload(['anonymous' => true]))
            ->assertRedirect('/?page=product&product=pechay#product-reviews');

        $this->assertDatabaseHas('product_reviews', ['product_key' => 'pechay', 'user_id' => $customer->id, 'rating' => 4, 'anonymous' => true]);
        $this->get('/?page=product&product=pechay')->assertInertia(fn (Assert $page) => $page
            ->component('Welcome')
            ->where('reviewFeed.summary.count', 1)
            ->where('reviewFeed.summary.average', 4)
            ->where('reviewFeed.reviews.0.displayName', 'Anonymous customer')
            ->where('reviewFeed.reviews.0.isMine', true)
            ->etc());

        auth()->logout();
        $this->get('/?page=product&product=pechay')->assertInertia(fn (Assert $page) => $page
            ->where('reviewFeed.reviews.0.displayName', 'Anonymous customer')
            ->where('reviewFeed.reviews.0.isMine', false)
            ->etc());
    }

    public function test_customer_can_post_multiple_reviews_then_edit_and_delete_each_one(): void
    {
        $customer = User::factory()->create(['name' => 'Maria Rosario']);
        $this->actingAs($customer)->post('/product-reviews', $this->payload(['anonymous' => true]));
        $this->post('/product-reviews', $this->payload(['rating' => 5, 'comment' => 'Loved the pechay, healthy and fresh.', 'anonymous' => false]));

        $this->assertDatabaseCount('product_reviews', 2);
        $firstReview = ProductReview::query()->oldest('id')->firstOrFail();
        $secondReview = ProductReview::query()->latest('id')->firstOrFail();

        $this->patch('/product-reviews/'.$firstReview->id, $this->payload([
            'rating' => 3,
            'comment' => 'Updated notes about this batch of pechay.',
            'anonymous' => false,
        ]))->assertRedirect('/?page=product&product=pechay#product-reviews');
        $this->assertDatabaseHas('product_reviews', ['id' => $firstReview->id, 'rating' => 3, 'comment' => 'Updated notes about this batch of pechay.']);

        $this->delete('/product-reviews/'.$secondReview->id)
            ->assertRedirect('/?page=product&product=pechay#product-reviews');
        $this->assertDatabaseMissing('product_reviews', ['id' => $secondReview->id]);
        $this->assertDatabaseCount('product_reviews', 1);

        $this->get('/?page=product&product=pechay')->assertInertia(fn (Assert $page) => $page
            ->where('reviewFeed.summary.count', 1)
            ->where('reviewFeed.summary.average', 3)
            ->where('reviewFeed.reviews.0.displayName', 'Maria Rosario')
            ->where('reviewFeed.reviews.0.comment', 'Updated notes about this batch of pechay.')
            ->etc());
    }

    public function test_customer_cannot_change_or_delete_another_customers_review(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $review = ProductReview::create([
            'product_key' => 'pechay', 'user_id' => $owner->id, 'rating' => 5,
            'comment' => 'The owner wrote this product review.', 'anonymous' => false,
        ]);

        $this->actingAs($other)->patch('/product-reviews/'.$review->id, $this->payload())->assertForbidden();
        $this->delete('/product-reviews/'.$review->id)->assertForbidden();
        $this->assertDatabaseHas('product_reviews', ['id' => $review->id]);
    }

    public function test_validation_rejects_unknown_products_and_invalid_reviews(): void
    {
        $this->actingAs(User::factory()->create())->post('/product-reviews', $this->payload([
            'product_key' => 'unknown', 'rating' => 6, 'comment' => 'short', 'anonymous' => 'maybe',
        ]))->assertSessionHasErrors(['product_key', 'rating', 'comment', 'anonymous']);
        $this->assertDatabaseCount('product_reviews', 0);
    }

    public function test_rating_filter_returns_only_matching_reviews(): void
    {
        foreach ([5, 4, 1] as $rating) {
            $user = User::factory()->create();
            ProductReview::create(['product_key' => 'pechay', 'user_id' => $user->id, 'rating' => $rating, 'comment' => "Rating {$rating} for this produce.", 'anonymous' => false]);
        }

        $this->get('/?page=product&product=pechay&review_rating=5')->assertInertia(fn (Assert $page) => $page
            ->where('reviewFeed.summary.count', 3)
            ->where('reviewFeed.counts.5', 1)
            ->where('reviewFeed.filter', 5)
            ->has('reviewFeed.reviews', 1)
            ->where('reviewFeed.reviews.0.rating', 5)
            ->etc());
    }

    public function test_reviews_are_paginated_five_at_a_time(): void
    {
        $customer = User::factory()->create();
        foreach (range(1, 6) as $index) {
            ProductReview::create([
                'product_key' => 'pechay',
                'user_id' => $customer->id,
                'rating' => 5,
                'comment' => "Fresh pechay review number {$index}.",
                'anonymous' => false,
            ]);
        }

        $this->get('/?page=product&product=pechay')->assertInertia(fn (Assert $page) => $page
            ->where('reviewFeed.summary.count', 6)
            ->where('reviewFeed.currentPage', 1)
            ->where('reviewFeed.lastPage', 2)
            ->where('reviewFeed.total', 6)
            ->has('reviewFeed.reviews', 5)
            ->etc());

        $this->get('/?page=product&product=pechay&review_page=2')->assertInertia(fn (Assert $page) => $page
            ->where('reviewFeed.currentPage', 2)
            ->where('reviewFeed.lastPage', 2)
            ->has('reviewFeed.reviews', 1)
            ->etc());
    }

    private function payload(array $override = []): array
    {
        return array_replace([
            'product_key' => 'pechay',
            'rating' => 4,
            'comment' => 'Fresh leaves and crisp stalks from the garden.',
            'anonymous' => false,
        ], $override);
    }
}
