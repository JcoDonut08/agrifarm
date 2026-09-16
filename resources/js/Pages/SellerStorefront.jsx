import { Link } from '@inertiajs/react';
import Icon from '../Components/Storefront/Icon';
import ProductCard from '../Components/Storefront/ProductCard';
import { marketHref } from '../Components/Storefront/catalog';

export default function SellerStorefront({ profile }) {
    if (!profile) {
        return <div className="store-container seller-public-page seller-public-missing">
            <Icon name="people" size={38} />
            <h1>Seller not found</h1>
            <p>This seller profile is unavailable or no longer active.</p>
            <Link className="store-button" href={marketHref()}>Browse marketplace <Icon name="arrow" size={17} /></Link>
        </div>;
    }

    return <div className="store-container seller-public-page">
        <header className="seller-public-header">
            <div className="seller-public-avatar" aria-hidden="true">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.name.charAt(0).toUpperCase()}</div>
            <div className="seller-public-identity">
                <span className="seller-public-kicker"><Icon name="sprout" size={15} /> AgriFarm seller</span>
                <h1>{profile.name}</h1>
                <p>{profile.barangay ? <><Icon name="pin" size={15} />Barangay {profile.barangay}, Pasig City</> : <><Icon name="pin" size={15} />Pasig City</>}</p>
            </div>
            <div className="seller-public-count"><strong>{profile.listingCount}</strong><span>{profile.listingCount === 1 ? 'active listing' : 'active listings'}</span></div>
        </header>

        <section className="seller-public-products" aria-labelledby="seller-products-heading">
            <div className="section-heading"><div><h2 id="seller-products-heading">Products from this seller</h2><p>Current listings published by {profile.name}.</p></div><Link className="section-link" href={marketHref(profile.barangay)}>Browse marketplace <Icon name="arrow" size={17} /></Link></div>
            {profile.products.length
                ? <div className="market-product-grid">{profile.products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
                : <div className="seller-public-empty"><Icon name="sprout" size={30} /><h2>No active listings</h2><p>This seller does not have products available right now.</p></div>}
        </section>
    </div>;
}
