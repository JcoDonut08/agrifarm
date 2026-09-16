import { Head, Link, usePage } from '@inertiajs/react';
import GuestLayout from '../Layouts/GuestLayout';
import Marketplace from './Marketplace';
import Cart from './Cart';
import Checkout from './Checkout';
import Favorites from './Favorites';
import Notifications from './Notifications';
import ProductDetail from './ProductDetail';
import SellerStorefront from './SellerStorefront';
import Icon from '../Components/Storefront/Icon';
import ProductCard, { ProducePhoto } from '../Components/Storefront/ProductCard';
import { ShopProvider } from '../Components/Storefront/ShopContext';
import { communities, marketHref, money, productHref, products } from '../Components/Storefront/catalog';

export default function Welcome() {
    const { url, props } = usePage();
    const sellerProducts = props.sellerProducts || [];
    const hasSellerProducts = sellerProducts.length > 0;
    const listings = hasSellerProducts ? sellerProducts : products;
    const popularProducts = hasSellerProducts ? listings.slice(0, 4) : [products[0], products[1], products[2], products[6]];
    const newProducts = hasSellerProducts ? listings.slice(4, 8) : [products[3], products[4], products[5], products[9]];
    const bestBarangay = props.bestBarangay;
    const bestSellingProducts = (props.bestSellingProducts || []).map((sale) => listings.find((product) => product.id === sale.id)).filter(Boolean);
    const bestBarangaySale = props.bestBarangayProduct;
    const bestBarangayProduct = listings.find((product) => product.id === bestBarangaySale?.id);
    const query = new URLSearchParams(url.split('?')[1]?.split('#')[0] || '');
    const page = query.get('page') || 'home';
    const market = page === 'marketplace';
    const productId = query.get('product') || '';
    const selectedProduct = listings.find((product) => product.id === productId);
    const extraPage = { cart: Cart, favorites: Favorites, notifications: Notifications }[page];
    const ExtraPage = extraPage;
    const user = props.auth?.user;
    const accountDestination = user
        ? ({ customer: '/customer', seller: '/seller/dashboard', cenro_admin: '/admin/dashboard' }[user.role] || '/')
        : '/register';

    return (
        <ShopProvider products={listings}>
            <GuestLayout storefront market={market || page === 'product' || page === 'seller'}>
                <Head title={{ marketplace: 'Marketplace', cart: 'Your cart', checkout: 'Checkout', 'order-success': 'Order placed', favorites: 'Favorites', notifications: 'Notifications', product: selectedProduct?.name || 'Product not found', seller: props.sellerProfile?.name || 'Seller not found' }[page] || 'Fresh from your community'} />
                {page === 'product' ? <ProductDetail productId={productId} products={listings} reviewFeed={props.reviewFeed} user={user} /> : page === 'seller' ? <SellerStorefront profile={props.sellerProfile} /> : page === 'checkout' || page === 'order-success' ? <Checkout order={props.checkoutOrder} successPage={page === 'order-success'} /> : ExtraPage ? <ExtraPage /> : market ? <Marketplace key={url} products={listings} hasSellerProducts={hasSellerProducts} serverResults={props.marketplaceResults} initialBarangay={query.get('barangay') || ''} initialSort={query.get('sort') || ''} /> : <>
                    <section className="home-hero" aria-labelledby="hero-heading">
                        <img
                            className="hero-photo"
                            src="/images/market-hero-v2.png"
                            alt="A basket of fresh leafy greens, tomatoes, carrots, and eggplants in a sunny community garden"
                            fetchPriority="high"
                        />
                        <div className="hero-copy-surface" aria-hidden="true" />
                        <div className="hero-foliage" aria-hidden="true"><i /><i /><i /><i /><i /></div>
                        <div className="store-container hero-inner">
                            <div className="hero-copy">
                                <h1 id="hero-heading">Fresh from<br />your community.</h1>
                                <p className="hero-description">Shop locally grown produce.<br />Support the farmers of Pasig.</p>
                                <Link href={marketHref()} className="store-button hero-button">
                                    Explore marketplace <Icon name="arrow" />
                                </Link>
                                <div className="hero-values">
                                    <div><Icon name="sprout" /><span>Local farmers</span></div>
                                    <div><Icon name="people" /><span>Stronger communities</span></div>
                                    <div><Icon name="leaf" /><span>A greener tomorrow</span></div>
                                </div>
                            </div>
                            <span className="hero-handwriting" aria-hidden="true">Good<br />Food &hearts;<br />Brighter<br />Pasig &hearts;</span>
                        </div>
                    </section>
                    <div className="store-container home-content">
                        <section className="home-section" aria-labelledby="communities-heading">
                            <div className="section-heading">
                                <div><h2 id="communities-heading">Featured Barangays</h2><p>Good things grow close to home.</p></div>
                            </div>
                            <div className="community-grid">
                                {communities.map((community, index) => {
                                    const stats = props.communityStats?.find((item) => item.name === community.name);
                                    const active = !hasSellerProducts || (stats?.listingCount || 0) > 0;
                                    const content = <>
                                        <div
                                            className="community-photo"
                                            role="img"
                                            aria-label={`Illustration of a community garden in Barangay ${community.name}`}
                                            style={{ backgroundPosition: `${index * 50}% 50%` }}
                                        />
                                        <div className="community-copy">
                                            <h3>{community.name}</h3>
                                            <p>{hasSellerProducts ? `${stats?.listingCount || 0} ${(stats?.listingCount || 0) === 1 ? 'seller listing' : 'seller listings'}` : community.description}</p>
                                            <span>{active ? <>Explore products <Icon name="arrow" size={17} /></> : 'Awaiting listings'}</span>
                                        </div>
                                    </>;
                                    return active
                                        ? <Link href={marketHref(community.name)} className="community-card" key={community.name}>{content}</Link>
                                        : <div className="community-card is-unavailable" key={community.name}>{content}</div>;
                                })}
                            </div>
                        </section>
                        <section className={`featured-banner ${bestBarangayProduct ? 'has-featured-product' : ''}`} aria-labelledby="featured-heading">
                            {!bestBarangayProduct && <div className="featured-photo" role="img" aria-label="Fresh leafy produce from a local garden" />}
                            <div className="featured-copy">
                                <p className="featured-eyebrow"><Icon name="trophy" size={25} /> {bestBarangay ? 'BEST BARANGAY' : 'BEST BARANGAY · RANKING PENDING'}</p>
                                <h2 id="featured-heading">{bestBarangay ? `Barangay ${bestBarangay.name}` : 'Fresh communities, growing together'}</h2>
                                <p>{bestBarangay ? `${money(bestBarangay.deliveredRevenue)} from ${bestBarangay.deliveredOrderCount} delivered ${bestBarangay.deliveredOrderCount === 1 ? 'order' : 'orders'}.` : 'The leading barangay will appear after orders are delivered.'}</p>
                                <div className="featured-actions"><Link className="store-button white-button" href={bestBarangayProduct ? productHref(bestBarangayProduct.id) : marketHref()}>{bestBarangayProduct ? 'View featured product' : 'Browse marketplace'} <Icon name="arrow" /></Link>{bestBarangay && <Link className="featured-market-link" href={marketHref(bestBarangay.name)}>Shop {bestBarangay.name} <Icon name="arrow" size={17} /></Link>}</div>
                            </div>
                            {bestBarangayProduct ? <div className="featured-product-stage">
                                <div className="featured-stage-image"><ProducePhoto product={bestBarangayProduct} className="featured-product-photo" /></div>
                                <div className="featured-stage-copy">
                                    <span className="featured-stage-kicker"><Icon name="sprout" size={16} /> {bestBarangaySale.orderCount ? 'MOST ORDERED' : 'LOCAL LISTING'}</span>
                                    <Link href={productHref(bestBarangayProduct.id)} className="featured-stage-name">{bestBarangayProduct.name} <Icon name="arrow" size={18} /></Link>
                                    <span className="featured-stage-origin">From Barangay {bestBarangay.name}</span>
                                    <strong>{money(bestBarangayProduct.price)} <small>/ {bestBarangayProduct.unit}</small></strong>
                                    {bestBarangaySale.orderCount > 0 && <span className="featured-stage-sales">{bestBarangaySale.orderCount} delivered {bestBarangaySale.orderCount === 1 ? 'order' : 'orders'}</span>}
                                </div>
                            </div> : <span className="featured-price">Based on delivered sales</span>}
                        </section>
                        <section className="home-section top-selling-section" aria-labelledby="top-selling-heading">
                            <div className="section-heading"><div><h2 id="top-selling-heading">Best-selling plants</h2><p>Most ordered products from delivered sales.</p></div>{bestSellingProducts.length > 0 && <Link className="section-link" href={marketHref(null, 'best-selling')}>View all <Icon name="arrow" size={17} /></Link>}</div>
                            {bestSellingProducts.length > 0 ? <div className="home-product-grid">{bestSellingProducts.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <div className="top-selling-empty"><Icon name="trophy" size={28} /><div><h3>No best sellers yet</h3><p>Products with delivered orders will appear here.</p></div></div>}
                        </section>
                        <ProductSection id="popular-heading" title={hasSellerProducts ? 'Fresh from local sellers' : 'Popular Products'} description={hasSellerProducts ? 'Real harvests listed by AgriFarm growers.' : 'Everyday favorites from neighborhood growers.'} products={popularProducts} />
                        {newProducts.length > 0 && <ProductSection id="fresh-heading" title={hasSellerProducts ? 'More to explore' : 'Fresh New Products'} description={hasSellerProducts ? 'Find more produce from local sellers.' : 'A fresh selection for your next meal.'} products={newProducts} />}
                        <section className="harvest-cta" aria-labelledby="harvest-heading">
                            <div>
                                <h2 id="harvest-heading">READY TO GRAB<br />THE HARVEST?</h2>
                                <p>Browse the full marketplace or create an account to support<br className="desktop-break" /> local growers directly.</p>
                            </div>
                            <div className="harvest-actions">
                                <Link href={marketHref()} className="store-button lime-button">Browse marketplace</Link>
                                <Link href={accountDestination} className="store-button white-button">{user ? 'Open my account' : 'Create account'}</Link>
                            </div>
                        </section>
                    </div>
                </>}
            </GuestLayout>
        </ShopProvider>
    );
}

function ProductSection({ id, title, description, products }) {
    return (
        <section className="home-section" aria-labelledby={id}>
            <div className="section-heading">
                <div><h2 id={id}>{title}</h2><p>{description}</p></div>
                <Link className="section-link" href={marketHref()}>View all <Icon name="arrow" size={17} /></Link>
            </div>
            <div className="home-product-grid">
                {products.map((product) => <ProductCard product={product} key={product.id} />)}
            </div>
        </section>
    );
}
