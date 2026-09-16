import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import ConfirmationDialog from '../ConfirmationDialog';
import Icon from './Icon';
import { reviewHref } from './catalog';

const stars = [5, 4, 3, 2, 1];

function StarRating({ rating, label }) {
    return <span className="review-stars" role="img" aria-label={label || `${rating} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, index) => <span key={index} className={index < rating ? 'is-filled' : ''} aria-hidden="true">★</span>)}
    </span>;
}

function ReviewForm({ product, existing = null, status = null, onCancel }) {
    const form = useForm({ product_key: product.id, rating: existing?.rating || 0, comment: existing?.comment || '', anonymous: existing?.anonymous || false });
    const trimmedCommentLength = form.data.comment.trim().length;
    const canSubmit = Boolean(form.data.rating) && trimmedCommentLength >= 10;
    const requirementId = existing ? `review-submit-requirement-${existing.id}` : 'review-submit-requirement-new';
    const submitRequirement = !form.data.rating
        ? 'Choose a star rating to continue.'
        : trimmedCommentLength < 10
            ? `Write at least ${10 - trimmedCommentLength} more ${10 - trimmedCommentLength === 1 ? 'character' : 'characters'}.`
            : 'Ready to post.';

    useEffect(() => {
        form.setData({ product_key: product.id, rating: existing?.rating || 0, comment: existing?.comment || '', anonymous: existing?.anonymous || false });
        form.clearErrors();
    }, [product.id, existing?.id]);

    function submit(event) {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                if (existing) onCancel?.();
                else form.reset();
            },
        };
        if (existing) form.patch(`/product-reviews/${existing.id}`, options);
        else form.post('/product-reviews', options);
    }

    return <div className={`review-form-panel ${existing ? 'is-editing' : ''}`}>
        <div className="review-form-heading"><div><h3>{existing ? 'Edit review' : 'Write a review'}</h3><p>{existing ? 'Update this review without affecting your other posts.' : 'You may post another review whenever you have more to share.'}</p></div>{existing && <button type="button" className="review-text-button" onClick={onCancel}>Cancel</button>}</div>
        {status && <p className="review-status" role="status">{status}</p>}
        <form onSubmit={submit}>
            <fieldset className="review-rating-input"><legend>Your rating</legend><div className="review-rating-options">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} aria-label={`Rate ${star} ${star === 1 ? 'star' : 'stars'}`} aria-pressed={form.data.rating === star} className={form.data.rating >= star ? 'is-selected' : ''} onClick={() => form.setData('rating', star)}>★</button>)}</div></fieldset>
            {form.errors.rating && <p className="review-error">{form.errors.rating}</p>}
            <label className="review-comment-label" htmlFor="review-comment">Your review</label>
            <textarea id="review-comment" value={form.data.comment} onChange={(event) => form.setData('comment', event.target.value)} minLength={10} maxLength={2000} rows={4} placeholder="What did you like? How was the produce?" required />
            <div className="review-form-meta"><span>{form.data.comment.length}/2000 characters</span>{form.errors.comment && <p className="review-error">{form.errors.comment}</p>}</div>
            <label className="review-anonymous"><input type="checkbox" checked={form.data.anonymous} onChange={(event) => form.setData('anonymous', event.target.checked)} /><span><strong>Post anonymously</strong><small>Your name will be hidden from other shoppers. Your account remains linked so you can edit or delete this review.</small></span></label>
            {form.errors.anonymous && <p className="review-error">{form.errors.anonymous}</p>}
            <div className="review-form-actions"><button type="submit" className="store-button" disabled={form.processing || !canSubmit} aria-describedby={requirementId}>{form.processing ? 'Saving…' : existing ? 'Save changes' : 'Post review'}</button></div>
            <p id={requirementId} className={`review-submit-requirement ${canSubmit ? 'is-ready' : ''}`} aria-live="polite">{submitRequirement}</p>
        </form>
    </div>;
}

export default function ProductReviews({ product, feed, user }) {
    const summary = feed?.summary || { count: 0, average: null };
    const filter = feed?.filter || null;
    const reviews = feed?.reviews || [];
    const count = summary.count || 0;
    const [editingReview, setEditingReview] = useState(null);
    const [reviewToDelete, setReviewToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const formAnchor = useRef(null);

    function navigate(rating, page = 1) {
        router.visit(reviewHref(product.id, rating, page), { preserveScroll: true, preserveState: true });
    }

    function editReview(review) {
        setEditingReview(review);
        window.setTimeout(() => formAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
    }

    function deleteReview() {
        if (!reviewToDelete || deleting) return;
        setDeleting(true);
        router.delete(`/product-reviews/${reviewToDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (editingReview?.id === reviewToDelete.id) setEditingReview(null);
                setReviewToDelete(null);
            },
            onFinish: () => setDeleting(false),
        });
    }

    const reviewAction = user?.role === 'customer'
        ? <div ref={formAnchor}><ReviewForm key={editingReview?.id || 'new'} product={product} existing={editingReview} status={feed?.status} onCancel={() => setEditingReview(null)} /></div>
        : <div className="review-signin">
            <h3>{user ? 'Customer reviews only' : 'Bought or tried this product?'}</h3>
            <p>{user ? 'Reviews are posted from customer accounts. Seller and administrator accounts can still read every review.' : 'Log in with a customer account to rate this product. You can post anonymously and manage each review later.'}</p>
            {!user && <Link className="store-button" href="/login">Log in to write a review</Link>}
        </div>;

    return <section id="product-reviews" className="product-detail-reviews" aria-labelledby="product-reviews-title">
        <div className="product-review-heading"><div><h2 id="product-reviews-title">Product ratings</h2><p>Reviews from AgriFarm customers</p></div><span>{count} {count === 1 ? 'review' : 'reviews'}</span></div>
        <div className="review-overview">
            <div className="review-overview-score"><strong>{count ? Number(summary.average).toFixed(1) : '—'} <span>out of 5</span></strong><StarRating rating={count ? Math.round(summary.average) : 0} label={count ? `${summary.average} out of 5 stars` : 'No ratings yet'} /></div>
            <div className="review-filters" role="group" aria-label="Filter reviews by rating"><button type="button" className={!filter ? 'is-active' : ''} aria-pressed={!filter} onClick={() => navigate(null)}>All ({count})</button>{stars.map((star) => <button type="button" key={star} className={filter === star ? 'is-active' : ''} aria-pressed={filter === star} onClick={() => navigate(star)}>{star} Star ({feed?.counts?.[star] || 0})</button>)}</div>
        </div>
        <div className="review-list" aria-live="polite">{reviews.length ? reviews.map((review) => <article className="review-item" key={review.id}><div className="review-avatar" aria-hidden="true">{review.anonymous ? '?' : review.displayName?.charAt(0)?.toUpperCase()}</div><div className="review-item-body"><div className="review-item-top"><div><strong>{review.displayName}</strong>{review.isMine && <span>Your review</span>}</div>{review.isMine && <div className="review-item-actions"><button type="button" aria-label="Edit this review" title="Edit review" onClick={() => editReview(review)}><Icon name="edit" size={16} /></button><button type="button" className="is-delete" aria-label="Delete this review" title="Delete review" onClick={() => setReviewToDelete(review)}><Icon name="trash" size={16} /></button></div>}</div><StarRating rating={review.rating} /><time dateTime={review.createdAt}>{new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(review.createdAt))}</time><p>{review.comment}</p></div></article>) : <div className="review-list-empty"><h3>{filter ? `No ${filter}-star reviews yet` : 'No customer reviews yet'}</h3><p>{filter ? 'Choose another rating or show all reviews.' : 'Be the first to share your experience with this product.'}</p></div>}</div>
        {feed?.lastPage > 1 && <nav className="review-pagination" aria-label="Review pages"><button type="button" disabled={feed.currentPage <= 1} onClick={() => navigate(filter, feed.currentPage - 1)}>Previous</button><span>Page {feed.currentPage} of {feed.lastPage}</span><button type="button" disabled={feed.currentPage >= feed.lastPage} onClick={() => navigate(filter, feed.currentPage + 1)}>Next</button></nav>}
        {reviewAction}
        <ConfirmationDialog
            open={Boolean(reviewToDelete)}
            title="Delete review?"
            description="This review will be permanently removed. This action cannot be undone."
            confirmLabel="Delete review"
            cancelLabel="Keep review"
            workingLabel="Deleting…"
            busy={deleting}
            onCancel={() => setReviewToDelete(null)}
            onConfirm={deleteReview}
        />
    </section>;
}
