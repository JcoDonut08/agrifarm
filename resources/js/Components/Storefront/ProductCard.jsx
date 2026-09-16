import { useEffect, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import Icon from './Icon';
import { money, stockUnit, getProductBadge, productHref } from './catalog';
import { useShop } from './ShopContext';

export function ProducePhoto({ product, className = '' }) {
    if (product.photoUrl) return <div className={`produce-photo has-upload ${className}`}><img src={product.photoUrl} alt={product.name} loading="lazy" /></div>;
    const extra = product.photo >= 9;
    const index = extra ? product.photo - 9 : product.photo;
    return <div role="img" aria-label={product.name} className={`produce-photo ${extra ? 'produce-photo-extra' : ''} ${className}`} style={{ '--photo-position': `${(index % 3) * 50}% ${extra ? 50 : Math.floor(index / 3) * 50}%` }} />;
}

export default function ProductCard({ product }) {
    const stats = usePage().props.reviewStats?.[product.id];
    const rating = stats?.average || 0;
    const count = stats?.count || 0;
    const { favorites, toggleFavorite, add, cart } = useShop();
    const [added, setAdded] = useState(false);
    const [saveAnimation, setSaveAnimation] = useState(0);
    const [addAnimation, setAddAnimation] = useState(0);
    const resetAdded = useRef(null);
    useEffect(() => () => window.clearTimeout(resetAdded.current), []);
    function addToCart() {
        if (!add(product)) return;
        setAdded(true);
        setAddAnimation((value) => value + 1);
        window.clearTimeout(resetAdded.current);
        resetAdded.current = window.setTimeout(() => setAdded(false), 1400);
    }
    const favorite = favorites.includes(product.id);
    const atLimit = (cart[product.id] || 0) >= product.stock;
    const badge = getProductBadge(product);

    return (
        <article className="produce-card">
            <Link className="produce-card-link" href={productHref(product.id)} aria-label={`View ${product.name} details`} />
            <div className="produce-image-wrap">
                <ProducePhoto product={product} />
                {badge && <span className={`product-badge badge-${badge.style}`} title={badge.description}><Icon name={badge.icon} size={13} />{badge.label}</span>}
                <button type="button" className={`favorite-button ${favorite ? 'is-saved' : ''}`} aria-label={`${favorite ? 'Remove' : 'Save'} ${product.name} ${favorite ? 'from' : 'to'} favorites`} aria-pressed={favorite} onClick={() => { toggleFavorite(product.id); setSaveAnimation((value) => value + 1); }}><span key={saveAnimation} className={saveAnimation ? 'favorite-feedback' : ''}><Icon name="heart" fill={favorite ? 'currentColor' : 'none'} /></span></button>
            </div>
            <div className="produce-info">
                <h3>{product.name}</h3>
                <div className="produce-meta">
                    <span className="barangay-label"><Icon name={product.barangay ? 'pin' : 'people'} size={13} />{product.barangay || product.sellerName}</span>
                </div>
                <div className="produce-price-row"><p className="produce-price">{money(product.price)} <span>/ {product.unit}</span></p><span className="product-stock">{product.stock} {stockUnit(product.unit, product.stock)} left</span></div>
                <div className="produce-rating" aria-label={count ? `${rating.toFixed(1)} out of 5 stars, ${count} reviews` : 'No reviews yet'}>
                    {count > 0 && <span className="rating-stars" aria-hidden="true"><span style={{ width: `${rating / 5 * 100}%` }}>★★★★★</span>★★★★★</span>}
                    {count ? <><strong>{rating.toFixed(1)}</strong><small>({count})</small></> : <small>No reviews yet</small>}
                </div>
                <button type="button" className={`market-add-button ${added ? 'is-added' : ''}`} disabled={atLimit} onClick={addToCart} aria-label={`Add ${product.name} to cart`}>
                    <span key={addAnimation} className={added ? 'add-feedback' : ''}><Icon name={added ? 'check' : 'cart'} size={17} />{added ? 'Added to cart' : product.stock === 0 ? 'Out of stock' : atLimit ? 'Limit reached' : 'Add to cart'}</span>
                </button>
            </div>
        </article>
    );
}
