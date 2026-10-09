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
    const filipino = typeof window !== 'undefined' && localStorage.getItem('agrifarm-customer-language') === 'filipino';
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
        : '/register';    const metaTitle = { marketplace: 'Marketplace', cart: 'Your cart', checkout: 'Checkout', 'order-success': 'Order placed', favorites: 'Favorites', notifications: 'Notifications', product: selectedProduct?.name || 'Product not found', seller: props.sellerProfile?.name || 'Seller not found' }[page] || (filipino ? 'Sariwa mula sa iyong komunidad' : 'Fresh from your community');
    const metaDescription = page === 'product' && selectedProduct ? `${selectedProduct.name} - ₱${selectedProduct.price}. ${selectedProduct.description || 'Grown locally in Pasig.'}` : page === 'seller' && props.sellerProfile ? `Shop fresh harvests from ${props.sellerProfile.name} in Barangay ${props.sellerProfile.barangay || 'Pasig'}. Support urban farmers.` : 'Discover fresh produce grown by your neighbors. Support local Pasig City urban farmers directly through the AgriFarm marketplace.';
    const metaImage = page === 'product' && selectedProduct?.photo_url ? selectedProduct.photo_url : page === 'seller' && props.sellerProfile?.avatarUrl ? props.sellerProfile.avatarUrl : '/images/market-hero-v2.png';

    return (
        <ShopProvider products={listings}>
            <GuestLayout storefront market={market || page === 'product' || page === 'seller'}>
                <Head>
                    <title>{`${metaTitle} - AgriFarm`}</title>
                    <meta name="description" content={metaDescription} />
                    <meta property="og:title" content={`${metaTitle} - AgriFarm`} />
                    <meta property="og:description" content={metaDescription} />
                    <meta property="og:image" content={metaImage} />
                    <meta property="og:type" content={page === 'product' ? 'product' : 'website'} />
                    <meta name="twitter:card" content="summary_large_image" />
                </Head>
                {page === 'product' ? <ProductDetail productId={productId} products={listings} reviewFeed={props.reviewFeed} user={user} /> : page === 'seller' ? <SellerStorefront profile={props.sellerProfile} /> : page === 'checkout' || page === 'order-success' ? <Checkout order={props.checkoutOrder} successPage={page === 'order-success'} /> : ExtraPage ? <ExtraPage /> : market ? <Marketplace key={url} products={listings} hasSellerProducts={hasSellerProducts} serverResults={props.marketplaceResults} initialBarangay={query.get('barangay') || ''} initialSort={query.get('sort') || ''} /> : <>
                                        <section className="home-hero modern-hero" aria-labelledby="hero-heading">
                        <img
                            className="hero-photo modern-hero-photo"
                            src="/images/pasig-urban-garden.jpg"
                            alt="A vibrant community garden in Pasig"
                            fetchPriority="high"
                        />
                        <div className="modern-hero-overlay" aria-hidden="true" />
                        
                        <div className="store-container hero-inner modern-hero-inner">
                            <div className="hero-copy modern-hero-copy">
                                <h1 id="hero-heading">{filipino ? 'Sariwang ani,' : 'Fresh produce,'} <br/>{filipino ? 'laking Pasig.' : 'grown in Pasig.'}</h1>
                                <p className="hero-description modern-hero-desc">
                                    {filipino ? 'Bumili ng malusog at bagong aning gulay direkta mula sa iyong mga lokal na urban farmers.' : 'Buy healthy, freshly-harvested greens directly from your neighborhood urban farmers.'}
                                </p>
                                <Link href={marketHref()} className="store-button modern-hero-btn">
                                    {filipino ? 'Mamili Ngayon' : 'Shop the Harvest'} <Icon name="arrow" />
                                </Link>
                                <div className="hero-values modern-hero-values">
                                    <div><Icon name="leaf" /><span>{filipino ? '100% Lokal' : '100% Locally Grown'}</span></div>
                                    <div><Icon name="sprout" /><span>{filipino ? 'Sariwang ani' : 'Freshly harvested'}</span></div>
                                    <div><Icon name="people" /><span>{filipino ? 'Suportahan ang Pasig' : 'Support Pasig Farmers'}</span></div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <div className="store-container home-content">
                        <section className="home-section" aria-labelledby="communities-heading">
                            <div className="section-heading">
                                <div><h2 id="communities-heading">{filipino ? 'Mga Tampok na Barangay' : 'Featured Barangays'}</h2><p>{filipino ? 'Sa sariling komunidad, may magandang ani.' : 'Good things grow close to home.'}</p></div>
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
                                            <p>{hasSellerProducts ? `${stats?.listingCount || 0} ${(stats?.listingCount || 0) === 1 ? (filipino ? 'produktong naka-list' : 'seller listing') : (filipino ? 'produktong naka-list' : 'seller listings')}` : community.description}</p>
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
                                <h2 id="featured-heading">{bestBarangay ? `Barangay ${bestBarangay.name}` : (filipino ? 'Sariwang komunidad, sabay-sabay umaasenso' : 'Fresh communities, growing together')}</h2>
                                <p>{bestBarangay ? `${money(bestBarangay.deliveredRevenue)} ${filipino ? 'mula sa' : 'from'} ${bestBarangay.deliveredOrderCount} ${filipino ? 'naihatid na' : 'delivered'} ${bestBarangay.deliveredOrderCount === 1 ? 'order' : (filipino ? 'order' : 'orders')}.` : (filipino ? 'Lilitaw ang nangungunang barangay kapag may mga naihatid nang order.' : 'The leading barangay will appear after orders are delivered.')}</p>
                                <div className="featured-actions"><Link className="store-button white-button" href={bestBarangayProduct ? productHref(bestBarangayProduct.id) : marketHref()}>{bestBarangayProduct ? (filipino ? 'Tingnan ang produkto' : 'View featured product') : 'Browse marketplace'} <Icon name="arrow" /></Link>{bestBarangay && <Link className="featured-market-link" href={marketHref(bestBarangay.name)}>{filipino ? 'Bumili sa' : 'Shop'} {bestBarangay.name} <Icon name="arrow" size={17} /></Link>}</div>
                            </div>
                            {bestBarangayProduct ? <div className="featured-product-stage">
                                <div className="featured-stage-image"><ProducePhoto product={bestBarangayProduct} className="featured-product-photo" priority /></div>
                                <div className="featured-stage-copy">
                                    <span className="featured-stage-kicker"><Icon name="sprout" size={16} /> {bestBarangaySale.orderCount ? (filipino ? 'PINAKAMABENTA' : 'MOST ORDERED') : (filipino ? 'LOKAL NA PRODUKTO' : 'LOCAL LISTING')}</span>
                                    <Link href={productHref(bestBarangayProduct.id)} className="featured-stage-name">{bestBarangayProduct.name} <Icon name="arrow" size={18} /></Link>
                                    <span className="featured-stage-origin">{filipino ? 'Mula sa Barangay' : 'From Barangay'} {bestBarangay.name}</span>
                                    <strong>{money(bestBarangayProduct.price)} <small>/ {bestBarangayProduct.unit}</small></strong>
                                    {bestBarangaySale.orderCount > 0 && <span className="featured-stage-sales">{bestBarangaySale.orderCount} {filipino ? 'naihatid na' : 'delivered'} {bestBarangaySale.orderCount === 1 ? 'order' : (filipino ? 'order' : 'orders')}</span>}
                                </div>
                            </div> : <span className="featured-price">{filipino ? 'Batay sa mga naihatid na order' : 'Based on delivered sales'}</span>}
                        </section>
                        <section className="home-section top-selling-section" aria-labelledby="top-selling-heading">
                            <div className="section-heading"><div><h2 id="top-selling-heading">{filipino ? 'Pinakamabentang mga halaman' : 'Best-selling plants'}</h2><p>{filipino ? 'Mga produktong pinakamaraming order na naihatid.' : 'Most ordered products from delivered sales.'}</p></div>{bestSellingProducts.length > 0 && <Link className="section-link" href={marketHref(null, 'best-selling')}>{filipino ? 'Tingnan lahat' : 'View all'} <Icon name="arrow" size={17} /></Link>}</div>
                            {bestSellingProducts.length > 0 ? <div className="home-product-grid">{bestSellingProducts.map((product, index) => <ProductCard product={product} key={product.id} priority={index < 4} />)}</div> : <div className="top-selling-empty"><Icon name="trophy" size={28} /><div><h3>{filipino ? 'Wala pang pinakamabenta' : 'No best sellers yet'}</h3><p>{filipino ? 'Lilitaw dito ang mga produkto na may naihatid nang order.' : 'Products with delivered orders will appear here.'}</p></div></div>}
                        </section>
                        <ProductSection id="popular-heading" title={hasSellerProducts ? (filipino ? 'Sariwa mula sa mga lokal na nagtitinda' : 'Fresh from local sellers') : (filipino ? 'Mga Sikat na Produkto' : 'Popular Products')} description={hasSellerProducts ? (filipino ? 'Mga totoong ani mula sa mga magsasaka ng AgriFarm.' : 'Real harvests listed by AgriFarm growers.') : (filipino ? 'Mga paborito sa araw-araw mula sa mga nagtitinda sa kapitbahayan.' : 'Everyday favorites from neighborhood growers.')} products={popularProducts} />
                        {newProducts.length > 0 && <ProductSection id="fresh-heading" title={hasSellerProducts ? (filipino ? 'Marami pang pagpipilian' : 'More to explore') : (filipino ? 'Mga Bagong Produkto' : 'Fresh New Products')} description={hasSellerProducts ? (filipino ? 'Maghanap ng iba pang produkto mula sa mga lokal na nagtitinda.' : 'Find more produce from local sellers.') : (filipino ? 'Mga bagong pagpipilian para sa iyong susunod na lutuin.' : 'A fresh selection for your next meal.')} products={newProducts} />}
                        <section className="harvest-cta" aria-labelledby="harvest-heading">
                            <div>
                                <h2 id="harvest-heading">{filipino ? <>HANDA NANG KUNIN<br />ANG ANI?</> : <>READY TO GRAB<br />THE HARVEST?</>}</h2>
                                <p>{filipino ? <>Tingnan ang buong pamilihan o gumawa ng account upang<br className="desktop-break" /> direktang suportahan ang mga lokal na magsasaka.</> : <>Browse the full marketplace or create an account to support<br className="desktop-break" /> local growers directly.</>}</p>
                            </div>
                            <div className="harvest-actions">
                                <Link href={marketHref()} className="store-button lime-button">{filipino ? 'Tingnan ang pamilihan' : 'Browse marketplace'}</Link>
                                <Link href={accountDestination} className="store-button white-button">{user ? (filipino ? 'Buksan ang aking account' : 'Open my account') : (filipino ? 'Gumawa ng account' : 'Create account')}</Link>
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
