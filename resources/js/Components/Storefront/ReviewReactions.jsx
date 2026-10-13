import { router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useShop } from './ShopContext';

export default function ReviewReactions({ review, user }) {
    const { notify, filipino } = useShop();
    const pending = useRef(false);
    const [busy, setBusy] = useState(false);

    function react(type) {
        if (pending.current) return;
        if (!user) { router.visit('/login'); return; }
        const nextReaction = review.myReaction === type ? null : type;
        pending.current = true;
        setBusy(true);
        const failed = () => {
            notify(filipino ? 'Hindi ma-save ang reaksyon. Subukan muli.' : 'Could not save your reaction. Please try again.', null, 'error');
            return false;
        };
        router.post(`/product-reviews/${review.id}/react`, { type, active: nextReaction !== null }, {
            preserveScroll: true,
            preserveState: true,
            showProgress: false,
            // Set a fixed target so replaying another pending visit never toggles twice.
            optimistic: props => ({
                reviewFeed: {
                    ...props.reviewFeed,
                    reviews: (props.reviewFeed?.reviews || []).map(item => item.id !== review.id ? item : {
                        ...item,
                        myReaction: nextReaction,
                        likes: Math.max(0, item.likes - Number(item.myReaction === 'like') + Number(nextReaction === 'like')),
                        dislikes: Math.max(0, item.dislikes - Number(item.myReaction === 'dislike') + Number(nextReaction === 'dislike')),
                    }),
                },
            }),
            onError: failed,
            onNetworkError: failed,
            onHttpException: failed,
            onFinish: () => { pending.current = false; setBusy(false); },
        });
    }

    return <div className="review-reactions" aria-busy={busy}>
        {['like', 'dislike'].map(type => {
            const ReactionIcon = type === 'like' ? ThumbsUp : ThumbsDown;
            const count = type === 'like' ? review.likes : review.dislikes;
            return <button key={type} type="button" disabled={busy}
                className={`review-reaction-btn ${review.myReaction === type ? 'is-active' : ''}`}
                aria-pressed={review.myReaction === type}
                aria-label={filipino ? `${type === 'like' ? 'I-like' : 'I-dislike'} ang review, ${count}` : `${type === 'like' ? 'Like' : 'Dislike'} review, ${count}`}
                onClick={() => react(type)}><ReactionIcon size={16} aria-hidden="true" /> {count}</button>;
        })}
    </div>;
}
