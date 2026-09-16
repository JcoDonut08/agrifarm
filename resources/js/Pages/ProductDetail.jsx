import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '../Components/Storefront/Icon';
import ProductCard, { ProducePhoto } from '../Components/Storefront/ProductCard';
import ProductReviews from '../Components/Storefront/ProductReviews';
import { useShop } from '../Components/Storefront/ShopContext';
import { getProductBadge, marketHref, money, sellerHref, stockUnit, products as previewProducts } from '../Components/Storefront/catalog';

export default function ProductDetail({ productId, products = previewProducts, reviewFeed, user }) {
    const product = products.find((item) => item.id === productId);
    const { cart, favorites, addQuantity, toggleFavorite } = useShop();
    const [quantity, setQuantity] = useState(1);

    useEffect(() => setQuantity(1), [productId]);

    if (!product) {
        return <div className="store-container product-detail-page">
            <h1>Product not found</h1>
            <p>This product is no longer available in the marketplace.</p>
            <Link href={marketHref()} className="store-button">Browse marketplace <Icon name="arrow" size={18} /></Link>
        </div>;
    }

    const badge = getProductBadge(product);
    const inCart = cart[product.id] || 0;
    const available = Math.max(0, product.stock - inCart);
    const selectedQuantity = available ? Math.min(quantity, available) : 0;
    const favorite = favorites.includes(product.id);
    const related = products.filter((item) => item.id !== product.id && (item.category === product.category || (product.sellerName && item.sellerName === product.sellerName) || (product.barangay && item.barangay === product.barangay))).slice(0, 4);

    function addToCart() {
        if (addQuantity(product, selectedQuantity)) setQuantity(1);
    }

    return <div className="store-container product-detail-page">
        <div className="product-detail-main">
            <div className="product-detail-gallery-column">
                <div className="product-detail-gallery">
                    <ProducePhoto product={product} className="product-detail-photo" />
                </div>
            </div>

            <section className="product-detail-info" aria-labelledby="product-detail-title">
                {badge && <span className={`product-detail-badge badge-${badge.style}`} title={badge.description}><Icon name={badge.icon} size={15} />{badge.label}</span>}
                <h1 id="product-detail-title">{product.name}</h1>
                <a className="product-detail-rating" href="#product-reviews" aria-label={`View ratings and reviews for ${product.name}`}>
                    <span aria-hidden="true">{reviewFeed?.summary?.count ? '★'.repeat(Math.round(reviewFeed.summary.average)) + '☆'.repeat(5 - Math.round(reviewFeed.summary.average)) : '☆☆☆☆☆'}</span>{reviewFeed?.summary?.count ? <><strong>{Number(reviewFeed.summary.average).toFixed(1)}</strong><small>{reviewFeed.summary.count} {reviewFeed.summary.count === 1 ? 'review' : 'reviews'}</small></> : <small>No reviews yet</small>}<span className="product-detail-rating-link">See reviews <Icon name="arrow" size={15} /></span>
                </a>

                <div className="product-detail-price"><strong>{money(product.price)}</strong><span>/ {product.unit}</span></div>

                <dl className="product-detail-facts">
                    {!product.sellerId && <div><dt>From</dt><dd><Icon name="pin" size={17} />{`Barangay ${product.barangay}`}</dd></div>}
                    <div><dt>Category</dt><dd>{product.category}</dd></div>
                    <div><dt>Unit</dt><dd>{product.unit}</dd></div>
                    <div><dt>Availability</dt><dd><Icon name="check" size={17} />{product.stock ? `${product.stock} ${stockUnit(product.unit, product.stock)} available` : 'Out of stock'}</dd></div>
                </dl>
                {product.description && <div className="product-detail-description"><h2>About this product</h2><p>{product.description}</p></div>}

                <div className="product-detail-order">
                    <div className="product-detail-quantity-row">
                        <span>Quantity</span>
                        <div className="quantity-control" role="group" aria-label="Quantity">
                            <button type="button" aria-label="Decrease quantity" disabled={selectedQuantity <= 1} onClick={() => setQuantity((current) => current - 1)}><Icon name="minus" size={16} /></button>
                            <output aria-label="Selected quantity">{selectedQuantity}</output>
                            <button type="button" aria-label="Increase quantity" disabled={selectedQuantity >= available} onClick={() => setQuantity((current) => selectedQuantity + 1)}><Icon name="plus" size={16} /></button>
                        </div>
                        <small>{available} available to add</small>
                    </div>
                    <div className="product-detail-actions">
                        <button type="button" className="store-button" disabled={!available} onClick={addToCart}><Icon name="cart" size={19} />{available ? 'Add to cart' : product.stock === 0 ? 'Out of stock' : 'Cart limit reached'}</button>
                        <button type="button" className={`product-detail-favorite ${favorite ? 'is-saved' : ''}`} aria-label={favorite ? `Remove ${product.name} from favorites` : `Save ${product.name} to favorites`} aria-pressed={favorite} onClick={() => toggleFavorite(product.id)}><Icon name="heart" size={20} fill={favorite ? 'currentColor' : 'none'} />{favorite ? 'Saved' : 'Save'}</button>
                    </div>
                </div>
            </section>
            {product.sellerId && <section className="product-seller-card" aria-label={`${product.sellerName} seller profile`}>
                <span className="product-seller-avatar" aria-hidden="true">{product.sellerAvatarUrl ? <img src={product.sellerAvatarUrl} alt="" /> : product.sellerName?.charAt(0)?.toUpperCase()}</span>
                <div className="product-seller-identity">
                    <span>Seller</span>
                    <strong>{product.sellerName}</strong>
                    <small><Icon name="pin" size={14} />Barangay {product.barangay}</small>
                </div>
                <Link className="product-seller-shop-button" href={sellerHref(product.sellerId)} aria-label={`View ${product.sellerName} shop`}><Icon name="people" size={17} />View shop</Link>
            </section>}
        </div>

        <ProductReviews product={product} feed={reviewFeed} user={user} />

        {related.length > 0 && <section className="product-detail-related" aria-labelledby="product-detail-related-title">
            <div className="section-heading"><div><h2 id="product-detail-related-title">You may also like</h2><p>More produce from the marketplace.</p></div><Link className="section-link" href={marketHref()}>View all <Icon name="arrow" size={17} /></Link></div>
            <div className="market-product-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div>
        </section>}
    </div>;
}
