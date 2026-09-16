import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import Icon from '../Components/Storefront/Icon';
import ProductCard from '../Components/Storefront/ProductCard';
import { communities, products as previewProducts, compareProducts } from '../Components/Storefront/catalog';

export default function Marketplace({ initialBarangay = '', initialSort = '', products = previewProducts, hasSellerProducts = false, serverResults = null }) {
    const { url, props } = usePage();
    const serverMode = Boolean(serverResults);
    const hasBarangayListings = hasSellerProducts || products.some((product) => Boolean(product.barangay));
    const [resetMessage, setResetMessage] = useState('');
    const [search, setSearch] = useState(serverResults?.filters.search || '');
    const [category, setCategory] = useState(serverResults?.filters.category || 'All');
    const [barangay, setBarangay] = useState(serverResults?.filters.barangay || (communities.some((item) => item.name === initialBarangay) ? initialBarangay : ''));
    const [price, setPrice] = useState(serverResults?.filters.price || '');
    const [sort, setSort] = useState(serverResults?.filters.sort || (initialSort === 'best-selling' ? 'best-selling' : 'recommended'));

    function navigate(filters, page = 1) {
        const query = new URLSearchParams({ page: 'marketplace' });
        for (const [key, value] of Object.entries(filters)) {
            if (value && value !== 'All' && value !== 'recommended') query.set(key === 'search' ? 'q' : key, value);
        }
        if (page > 1) query.set('market_page', String(page));
        router.get(`/?${query}`, {}, { replace: true, preserveScroll: true });
    }

    useEffect(() => {
        if (!serverMode || search === serverResults.filters.search) return;
        const timeout = window.setTimeout(() => navigate({ search: search.trim(), category, barangay, price, sort }), 350);
        return () => window.clearTimeout(timeout);
    }, [search, serverMode, serverResults?.filters.search]);

    function update(setter, value) { setter(value); setResetMessage(''); }
    function change(key, setter, value) {
        update(setter, value);
        if (serverMode) navigate({ search, category, barangay, price, sort, [key]: value });
    }
    function clearFilters() { setSearch(''); setCategory('All'); setBarangay(''); setPrice(''); setSort('recommended'); setResetMessage('Filters reset. Showing all products.'); const query = new URLSearchParams(url.split('?')[1] || ''); if (serverMode || query.has('barangay') || query.has('sort')) router.get('/?page=marketplace', {}, { replace: true, preserveScroll: true }); }

    const filtered = serverMode ? serverResults.products : products.filter((product) =>
        `${product.name} ${product.barangay || product.sellerName || ''} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase())
        && (category === 'All' || product.category === category)
        && (!barangay || product.barangay === barangay)
        && (!price || (price === 'under50' ? product.price < 50 : price === '50to70' ? product.price >= 50 && product.price <= 70 : product.price > 70))
    ).sort((a, b) => compareProducts(a, b, sort, props.reviewStats));
    const hasFilters = search || category !== 'All' || barangay || price || sort !== 'recommended';

    return (
        <div className="store-container marketplace-page">
            <div className="marketplace-title"><h1>Marketplace</h1><p>Fresh produce from your local growers.</p></div>
            <div className="market-search"><Icon name="search" size={23} /><input type="search" aria-label="Search fresh produce" placeholder="Search fresh produce..." value={search} onChange={(event) => update(setSearch, event.target.value)} />{search && <button className="store-icon-button" onClick={() => update(setSearch, '')} aria-label="Clear search"><Icon name="close" size={18} /></button>}</div>
            <div className="category-filters" role="group" aria-label="Product category">{['All', 'Vegetables', 'Fruits', 'Herbs', 'Beans'].map((item) => <button key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => change('category', setCategory, item)}>{item}</button>)}</div>
            <div className="market-toolbar"><div className="market-selects">
                {hasBarangayListings && <FilterSelect label="Barangay" icon="pin" value={barangay} onChange={(value) => change('barangay', setBarangay, value)}><option value="">Barangay</option>{communities.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</FilterSelect>}
                <FilterSelect label="Price" icon="tag" value={price} onChange={(value) => change('price', setPrice, value)}><option value="">Price</option><option value="under50">Under ₱50</option><option value="50to70">₱50 – ₱70</option><option value="over70">Over ₱70</option></FilterSelect>
                <FilterSelect label="Sort products" icon="sort" value={sort} onChange={(value) => change('sort', setSort, value)}><option value="recommended">Sort: Recommended</option>{!hasSellerProducts && <option value="trending">Trending</option>}<option value="best-selling">Best Selling</option><option value="latest">Latest</option><option value="rating">Highest rated</option><option value="name">Name: A to Z</option></FilterSelect>
            </div><div className="market-filter-status">{hasFilters && <button type="button" className="reset-filters-link" onClick={clearFilters}>Reset filters</button>}<p className="product-count" role="status" aria-live="polite">{serverMode ? serverResults.total : filtered.length} {(serverMode ? serverResults.total : filtered.length) === 1 ? 'product' : 'products'}</p></div></div>
            <p className="sr-only" role="status">{resetMessage}</p>
            {filtered.length ? <><div className="market-product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div></> : <div className="market-empty"><Icon name="search" size={38} /><h2>No produce found</h2><p>Try another search or give your filters a fresh start.</p><button className="store-button" onClick={clearFilters}>Clear filters</button></div>}
            {serverMode && serverResults.lastPage > 1 && <nav className="market-pagination" aria-label="Product pages"><button type="button" disabled={serverResults.currentPage === 1} onClick={() => navigate({ search, category, barangay, price, sort }, serverResults.currentPage - 1)}>Previous</button><span>Page {serverResults.currentPage} of {serverResults.lastPage}</span><button type="button" disabled={serverResults.currentPage === serverResults.lastPage} onClick={() => navigate({ search, category, barangay, price, sort }, serverResults.currentPage + 1)}>Next</button></nav>}
            {!hasSellerProducts && <p className="market-preview-note">Marketplace preview · Sample products and prices</p>}
        </div>
    );
}

function FilterSelect({ label, icon, value, onChange, children }) {
    return <label className="filter-select"><Icon name={icon} size={18} /><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select><Icon name="chevron" size={15} /></label>;
}
