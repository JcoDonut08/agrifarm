import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { money, getProductBadge } from './catalog';
import { useShop } from './ShopContext';

export function ProducePhoto({ product, className = '' }) {
    const extra = product.photo >= 9;
    const index = extra ? product.photo - 9 : product.photo;
    return <div role="img" aria-label={product.name} className={`produce-photo ${extra ? 'produce-photo-extra' : ''} ${className}`} style={{ '--photo-position': `${(index % 3) * 50}% ${extra ? 50 : Math.floor(index / 3) * 50}%` }} />;
}

export default function ProductCard({ product }) {
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
            <div className="produce-image-wrap">
                <ProducePhoto product={product} />
                {badge && <span className={`product-badge badge-${badge.style}`}><Icon name={badge.icon} size={13} />{badge.label}</span>}
                <button type="button" className={`favorite-button ${favorite ? 'is-saved' : ''}`} aria-label={`${favorite ? 'Remove' : 'Save'} ${product.name} ${favorite ? 'from' : 'to'} favorites`} aria-pressed={favorite} onClick={() => { toggleFavorite(product.id); setSaveAnimation((value) => value + 1); }}><span key={saveAnimation} className={saveAnimation ? 'favorite-feedback' : ''}><Icon name="heart" fill={favorite ? 'currentColor' : 'none'} /></span></button>
            </div>
            <div className="produce-info">
                <h3>{product.name}</h3>
                <div className="produce-meta">
                    <span className="barangay-label"><Icon name="pin" size={13} />{product.barangay}</span>
                </div>
                <div className="produce-price-row"><p className="produce-price">{money(product.price)} <span>/ {product.unit}</span></p><span className="product-stock">{product.stock} {product.unit === 'kg' ? 'kg' : product.unit === 'bunch' ? 'bunches' : 'heads'} left</span></div>
                <div className="produce-rating" aria-label={`${product.rating} out of 5 stars, ${product.reviews} sample reviews`}>
                    <span className="rating-stars" aria-hidden="true"><span style={{ width: `${product.rating / 5 * 100}%` }}>★★★★★</span>★★★★★</span>
                    <strong>{product.rating.toFixed(1)}</strong>
                    <small>({product.reviews})</small>
                </div>
                <button type="button" className={`market-add-button ${added ? 'is-added' : ''}`} disabled={atLimit} onClick={addToCart} aria-label={`Add ${product.name} to cart`}>
                    <span key={addAnimation} className={added ? 'add-feedback' : ''}><Icon name={added ? 'check' : 'cart'} size={17} />{added ? 'Added to cart' : atLimit ? 'Limit reached' : 'Add to cart'}</span>
                </button>
            </div>
        </article>
    );
}
