import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AppMark from '../../Components/AppMark';
import Icon from '../../Components/Storefront/Icon';
import '../../../css/seller.css';
import ProfileForm from './ProfileForm';
import Avatar from './Avatar';
import NavbarControls from './NavbarControls';
import Products from './Products';

const sections = [['Dashboard', 'home'], ['Products', 'box'], ['Orders', 'cart'], ['Forecasting', 'trend'], ['Analytics', 'chart'], ['Store Profile', 'store']];
function SellerIcon({ name }) {
    const paths = {
        home: <path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z" />,
        box: <path d="m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10M7 4.8l10 5.5" />,
        chart: <path d="M12 2v10h10A10 10 0 1 1 9 2.5M15 2.5A10 10 0 0 1 21.5 9H15Z" />,
        store: <path d="M4 10v11h16V10M3 3h18l1 6c-1 4-4 4-5 0-1 4-4 4-5 0-1 4-4 4-5 0-1 4-4 4-5 0ZM9 21v-7h6v7" />,
        star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />,
    };
    return paths[name] ? <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg> : <Icon name={name} size={25} />;
}
function EmptyState({ icon, title, children }) {
    return <div className="seller-empty"><SellerIcon name={icon} /><strong>{title}</strong><p>{children}</p></div>;
}
export default function Dashboard() {
    const { auth, products = [] } = usePage().props;
    const [section, setSection] = useState(() => new URLSearchParams(window.location.search).get('section') === 'profile' ? 'Store Profile' : new URLSearchParams(window.location.search).get('section') === 'products' ? 'Products' : 'Dashboard');
    const [menuOpen, setMenuOpen] = useState(false);
    const [period, setPeriod] = useState('This week');
    const name = auth.user.name;
    const navigate = (next) => { setSection(next); setMenuOpen(false); };
    return <div className="seller-app">
        <Head title={`${name} · AgriFarm`} />
        <aside className="seller-sidebar">
            <div className="seller-brand"><AppMark storefront href="/seller/dashboard" /></div>
            <button className="seller-menu-toggle" aria-label="Toggle seller navigation" aria-expanded={menuOpen} aria-controls="seller-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
            <div id="seller-navigation" className={`seller-navigation ${menuOpen ? 'is-open' : ''}`}>
                <nav aria-label="Seller navigation">{sections.map(([label, icon]) => <button key={label} onClick={() => navigate(label)} aria-current={section === label ? 'page' : undefined}><SellerIcon name={icon} />{label}</button>)}</nav>
                <Link href="/logout" method="post" as="button" className="seller-logout"><Icon name="logout" />Sign out</Link>
                <div className="seller-store"><Avatar user={auth.user} className="seller-store-icon" /><div><strong>{name}</strong><span>Partner barangay · Pasig City</span></div></div>
            </div>
        </aside>
        <div className="seller-workspace">
            <header className="seller-topbar"><span className="seller-location"><Icon name="pin" size={17} />Pasig City</span><div className="seller-navbar-actions"><NavbarControls /><button className="seller-account" onClick={() => navigate('Store Profile')}><Avatar user={auth.user} /><span>{name}</span><Icon name="chevron" size={16} /></button></div></header>
            <main className="seller-main">
                {section === 'Dashboard' ? <>
                    <h1 className="sr-only">Barangay store overview</h1>
                    <div className="seller-stats">{[
                        { icon: 'trend', label: 'Today’s sales', value: '₱0', detail: 'No orders yet' },
                        { icon: 'cart', label: 'Pending orders', value: '0', detail: 'No orders to review' },
                        { icon: 'box', label: 'Active products', value: String(products.length), detail: products.length ? products.filter(product => product.stock <= product.threshold).length + " low in stock" : 'No products listed' },
                        { icon: 'star', label: 'Store rating', value: '—', detail: 'No reviews yet' },
                    ].map(({ icon, label, value, detail }) => <article className="seller-stat seller-stat--sales" key={label}>
                        <div className="seller-stat-heading"><h2>{label}</h2><span className="seller-stat-icon"><SellerIcon name={icon} /></span></div>
                        <strong className="seller-stat-value">{value}</strong>
                        <p>{detail}</p>
                    </article>)}</div>
                    <div className="seller-overview-grid">
                        <section className="seller-panel seller-sales"><div className="seller-panel-heading"><h2><SellerIcon name="trend" />Sales overview</h2><select aria-label="Sales period" value={period} onChange={event => setPeriod(event.target.value)}><option>This week</option><option>This month</option></select></div><strong className="seller-sales-total">₱0</strong><p>Sales {period.toLowerCase()}</p><div className="seller-chart"><div className="seller-chart-grid" aria-hidden="true"><span>₱0</span></div><div className="seller-chart-message"><strong>No sales {period.toLowerCase()}</strong><span>Sales will appear here when orders are completed.</span></div><div className="seller-chart-labels">{(period === 'This week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Week 1', 'Week 2', 'Week 3', 'Week 4']).map(day => <span key={day}>{day}</span>)}</div></div></section>
                        <section className="seller-panel seller-weather"><div className="seller-panel-heading"><h2><SellerIcon name="sprout" />Weather & farm outlook</h2></div><div className="seller-weather-status"><Icon name="pin" size={18} /><span>Pasig City</span></div><div className="seller-weather-reading"><span>—°C</span><p>Weather data unavailable</p></div><div className="seller-weather-details"><span>Rain chance<strong>—</strong></span><span>Humidity<strong>—</strong></span></div><div className="seller-reminder"><Icon name="leaf" size={30} /><div><strong>Plan your next harvest</strong><p>Check your local weather bulletin before scheduling farm activities.</p></div></div><button className="seller-text-link" onClick={() => navigate('Forecasting')}>View forecasting <Icon name="arrow" size={17} /></button></section>
                    </div>
                    <div className="seller-bottom-grid">
                        <section className="seller-panel"><div className="seller-panel-heading"><h2><SellerIcon name="cart" />Recent orders</h2><button className="seller-text-link" onClick={() => navigate('Orders')}>View all orders <Icon name="arrow" size={17} /></button></div><div className="seller-table-wrap"><table><thead><tr><th>Order</th><th>Product</th><th>Total</th><th>Status</th></tr></thead><tbody><tr><td colSpan="4"><EmptyState icon="cart" title="No orders yet">New orders for your barangay will appear here.</EmptyState></td></tr></tbody></table></div></section>
                        <section className="seller-panel seller-inventory"><div className="seller-panel-heading"><h2><SellerIcon name="box" />Inventory watch</h2></div><div className="seller-inventory-items">{products.filter(product => product.stock <= product.threshold).length ? products.filter(product => product.stock <= product.threshold).slice(0, 4).map(product => <div className="seller-inventory-item" key={product.id}><img src={product.photo_url} alt="" /><div><strong>{product.name}</strong><p>{product.stock} {product.unit} left</p></div><span>{product.stock === 0 ? "Out of stock" : "Low stock"}</span></div>) : <EmptyState icon="box" title={products.length ? "Stock levels are healthy" : "No inventory to track"}>{products.length ? "No products need replenishment right now." : "Low-stock products will appear here once your store has listings."}</EmptyState>}</div><button className="seller-outline-button" onClick={() => navigate('Products')}>Manage products</button></section>
                    </div>
                </> : section === 'Products' ? <Products /> : <>
                    <h1 className="seller-page-title">{section}</h1>
                    <section className="seller-panel seller-section-panel">
                        {section === 'Store Profile' ? <ProfileForm /> : <EmptyState icon={sections.find(([label]) => label === section)?.[1]} title={{ Products: 'No products listed yet', Orders: 'No orders yet', Forecasting: 'Forecasts are not available yet', Analytics: 'No sales data yet' }[section]}>{{ Products: 'Product and inventory management will be available when store listings are connected.', Orders: 'Order management will be available when your barangay starts receiving orders.', Forecasting: 'Weather and crop forecasts will appear when the forecasting service is connected.', Analytics: 'Sales analytics will appear when completed orders are available.' }[section]}</EmptyState>}
                    </section>
                </>}
                <footer className="seller-footer">AgriFarm · Partner barangay</footer>
            </main>
        </div>
    </div>;
}
