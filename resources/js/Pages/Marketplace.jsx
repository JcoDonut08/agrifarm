import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import Icon from '../Components/Storefront/Icon';
import ProductCard from '../Components/Storefront/ProductCard';
import { communities, products, compareProducts } from '../Components/Storefront/catalog';

export default function Marketplace({ initialBarangay = '' }) {
    const { url } = usePage();
    const [resetMessage, setResetMessage] = useState('');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [barangay, setBarangay] = useState(communities.some((item) => item.name === initialBarangay) ? initialBarangay : '');
    const [price, setPrice] = useState('');
    const [sort, setSort] = useState('recommended');

    function update(setter, value) { setter(value); setResetMessage(''); }
    function clearFilters() { setSearch(''); setCategory('All'); setBarangay(''); setPrice(''); setSort('recommended'); setResetMessage('Filters reset. Showing all products.'); if (new URLSearchParams(url.split('?')[1] || '').has('barangay')) router.get('/?page=marketplace', {}, { replace: true, preserveScroll: true }); }

    const filtered = products.filter((product) =>
        `${product.name} ${product.barangay} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase())
        && (category === 'All' || product.category === category)
        && (!barangay || product.barangay === barangay)
        && (!price || (price === 'under50' ? product.price < 50 : price === '50to70' ? product.price >= 50 && product.price <= 70 : product.price > 70))
    ).sort((a, b) => compareProducts(a, b, sort));
    const hasFilters = search || category !== 'All' || barangay || price || sort !== 'recommended';

    return (
        <div className="store-container marketplace-page">
            <div className="marketplace-title"><h1>Marketplace</h1><p>Fresh produce from your local growers.</p></div>
            <div className="market-search"><Icon name="search" size={23} /><input type="search" aria-label="Search fresh produce" placeholder="Search fresh produce..." value={search} onChange={(event) => update(setSearch, event.target.value)} />{search && <button className="store-icon-button" onClick={() => update(setSearch, '')} aria-label="Clear search"><Icon name="close" size={18} /></button>}</div>
            <div className="category-filters" role="group" aria-label="Product category">{['All', 'Vegetables', 'Fruits', 'Herbs', 'Beans'].map((item) => <button key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => update(setCategory, item)}>{item}</button>)}</div>
            <div className="market-toolbar"><div className="market-selects">
                <FilterSelect label="Barangay" icon="pin" value={barangay} onChange={(value) => update(setBarangay, value)}><option value="">Barangay</option>{communities.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</FilterSelect>
                <FilterSelect label="Price" icon="tag" value={price} onChange={(value) => update(setPrice, value)}><option value="">Price</option><option value="under50">Under ₱50</option><option value="50to70">₱50 – ₱70</option><option value="over70">Over ₱70</option></FilterSelect>
                <FilterSelect label="Sort products" icon="sort" value={sort} onChange={(value) => update(setSort, value)}><option value="recommended">Sort: Recommended</option><option value="trending">Trending</option><option value="latest">Latest</option><option value="best-selling">Best Selling</option><option value="rating">Highest rated</option><option value="name">Name: A to Z</option></FilterSelect>
            </div><div className="market-filter-status">{hasFilters && <button type="button" className="reset-filters-link" onClick={clearFilters}>Reset filters</button>}<p className="product-count" role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</p></div></div>
            <p className="sr-only" role="status">{resetMessage}</p>
            {filtered.length ? <><div className="market-product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div></> : <div className="market-empty"><Icon name="search" size={38} /><h2>No produce found</h2><p>Try another search or give your filters a fresh start.</p><button className="store-button" onClick={clearFilters}>Clear filters</button></div>}
            <p className="market-preview-note">Marketplace preview · Sample products and prices</p>
        </div>
    );
}

function FilterSelect({ label, icon, value, onChange, children }) {
    return <label className="filter-select"><Icon name={icon} size={18} /><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select><Icon name="chevron" size={15} /></label>;
}
