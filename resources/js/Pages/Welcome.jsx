import { Head, Link, usePage } from '@inertiajs/react';
import GuestLayout from '../Layouts/GuestLayout';
import Marketplace from './Marketplace';
import Cart from './Cart';
import Favorites from './Favorites';
import Notifications from './Notifications';
import Icon from '../Components/Storefront/Icon';
import ProductCard from '../Components/Storefront/ProductCard';
import { ShopProvider } from '../Components/Storefront/ShopContext';
import { communities, marketHref, products } from '../Components/Storefront/catalog';

const popularProducts = [products[0], products[1], products[2], products[6]];
const newProducts = [products[3], products[4], products[5], products[9]];

export default function Welcome() {
    const { url, props } = usePage();
    const query = new URLSearchParams(url.split('?')[1]?.split('#')[0] || '');
    const page = query.get('page') || 'home';
    const market = page === 'marketplace';
    const extraPage = { cart: Cart, favorites: Favorites, notifications: Notifications }[page];
    const ExtraPage = extraPage;
    const user = props.auth?.user;
    const accountDestination = user
        ? ({ customer: '/customer', seller: '/seller/dashboard', cenro_admin: '/admin/dashboard' }[user.role] || '/')
        : '/register';

    return (
        <ShopProvider>
            <GuestLayout storefront market={market}>
                <Head title={{ marketplace: 'Marketplace', cart: 'Your cart', favorites: 'Favorites', notifications: 'Notifications' }[page] || 'Fresh from your community'} />
                {ExtraPage ? <ExtraPage /> : market ? <Marketplace key={url} initialBarangay={query.get('barangay') || ''} /> : <>
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
                                {communities.map((community, index) => (
                                    <Link href={marketHref(community.name)} className="community-card" key={community.name}>
                                        <div
                                            className="community-photo"
                                            role="img"
                                            aria-label={`Illustration of a community garden in Barangay ${community.name}`}
                                            style={{ backgroundPosition: `${index * 50}% 50%` }}
                                        />
                                        <div className="community-copy">
                                            <h3>{community.name}</h3>
                                            <p>{community.description}</p>
                                            <span>Explore products <Icon name="arrow" size={17} /></span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                        <section className="featured-banner" aria-labelledby="featured-heading">
                            <div className="featured-photo" role="img" aria-label="Fresh pechay with crisp white stalks and green leaves" />
                            <div className="featured-leaves" aria-hidden="true"><Icon name="leaf" size={110} /><Icon name="leaf" size={100} /></div>
                            <div className="featured-copy">
                                <p className="featured-eyebrow"><Icon name="trophy" size={25} /> #1 FEATURED BARANGAY</p>
                                <h2 id="featured-heading">Barangay Rosario</h2>
                                <div className="featured-rating" aria-label="Sample rating: 4.9 out of 5"><span aria-hidden="true">★★★★★</span> 4.9</div>
                                <p>Rooted in community. Grown with care.</p>
                                <Link className="store-button white-button" href={marketHref('Rosario')}>Shop Rosario <Icon name="arrow" /></Link>
                            </div>
                            <span className="featured-price">Fresh Pechay · ₱35 / bunch</span>
                        </section>
                        <ProductSection id="popular-heading" title="Popular Products" description="Everyday favorites from neighborhood growers." products={popularProducts} />
                        <ProductSection id="fresh-heading" title="Fresh New Products" description="A fresh selection for your next meal." products={newProducts} />
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
