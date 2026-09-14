import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppMark from '../../Components/AppMark';
import Icon from '../../Components/Storefront/Icon';
import '../../../css/seller.css';
import ProfileForm from './ProfileForm';
import Avatar from './Avatar';
import NavbarControls from './NavbarControls';
import Products from './Products';
import Orders from './Orders';
import WeatherCard from './WeatherCard';
import Settings from './Settings';
import Analytics from './Analytics';
import Reports from './Reports';
import { formatMoney, getDashboardMetrics, InventoryWatch, RecentOrders, SalesOverview } from './DashboardCards';

const sections = [['Dashboard', 'home'], ['Products', 'box'], ['Orders', 'cart'], ['Forecasting', 'trend'], ['Analytics', 'chart'], ['Reports', 'receipt'], ['Store Profile', 'store'], ['Settings', 'settings']];
const sectionParams = { Products: 'products', Orders: 'orders', Forecasting: 'forecasting', Analytics: 'analytics', Reports: 'reports', 'Store Profile': 'profile', Settings: 'settings' };
const sectionLabels = {
    Dashboard: 'Dashboard', Products: 'Mga Produkto', Orders: 'Mga Order', Forecasting: 'Taya ng Panahon',
    Analytics: 'Pagsusuri', Reports: 'Mga Ulat', 'Store Profile': 'Profile ng Tindahan', Settings: 'Mga Setting',
};
const defaultNotifications = { newOrders: true, lowStock: true, weatherAlerts: true };

function savedLanguage() {
    try { return localStorage.getItem('agrifarm-seller-language') === 'filipino' ? 'filipino' : 'english'; }
    catch { return 'english'; }
}

function savedNotifications() {
    try {
        return { ...defaultNotifications, ...JSON.parse(localStorage.getItem('agrifarm-seller-notifications') || '{}') };
    } catch {
        return defaultNotifications;
    }
}
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
    const { auth, products = [], orders = [], weather = null } = usePage().props;
    const [section, setSection] = useState(() => {
        const requested = new URLSearchParams(window.location.search).get('section');
        return Object.entries(sectionParams).find(([, value]) => value === requested)?.[0] || 'Dashboard';
    });
    const [menuOpen, setMenuOpen] = useState(false);
    const [language, setLanguage] = useState(savedLanguage);
    const [notificationPreferences, setNotificationPreferences] = useState(savedNotifications);
    const filipino = language === 'filipino';
    const name = auth.user.name;
    const metrics = getDashboardMetrics(orders, products);
    const notificationItems = [];
    if (notificationPreferences.newOrders && metrics.pendingOrders) notificationItems.push({
        icon: 'cart',
        title: filipino ? 'May order na kailangang asikasuhin' : 'New order needs review',
        detail: filipino ? `${metrics.pendingOrders} order ang naghihintay na maasikaso.` : `${metrics.pendingOrders} ${metrics.pendingOrders === 1 ? 'order is' : 'orders are'} waiting for review.`,
    });
    if (notificationPreferences.lowStock && metrics.lowStockProducts) notificationItems.push({
        icon: 'box',
        title: filipino ? 'May produktong kaunti na ang stock' : 'Low-stock products',
        detail: filipino ? `${metrics.lowStockProducts} produkto ang kailangang dagdagan ang stock.` : `${metrics.lowStockProducts} ${metrics.lowStockProducts === 1 ? 'product needs' : 'products need'} restocking.`,
    });
    const weatherKey = `${weather?.condition_key || ''} ${weather?.condition || ''}`.toLowerCase();
    if (notificationPreferences.weatherAlerts && (weatherKey.includes('storm') || weatherKey.includes('thunder') || Number(weather?.rain_chance_percent) >= 70)) notificationItems.push({
        icon: 'bell',
        title: filipino ? 'Abiso sa panahon sa Pasig' : 'Pasig weather alert',
        detail: filipino ? 'Posible ang malakas na ulan. Suriin ang daluyan ng tubig at takpan ang mga inaning produkto.' : 'Heavy rain is possible. Check drainage and keep harvested produce covered.',
    });
    useEffect(() => {
        document.documentElement.lang = filipino ? 'fil' : 'en';
    }, [filipino]);
    const changeLanguage = (next) => {
        setLanguage(next);
        try { localStorage.setItem('agrifarm-seller-language', next); } catch { /* Keep this session usable without storage. */ }
    };
    const changeNotification = (key, enabled) => {
        setNotificationPreferences(current => {
            const next = { ...current, [key]: enabled };
            try { localStorage.setItem('agrifarm-seller-notifications', JSON.stringify(next)); } catch { /* Keep this session usable without storage. */ }
            return next;
        });
    };
    const navigate = (next) => {
        const url = new URL(window.location.href);
        if (sectionParams[next]) url.searchParams.set('section', sectionParams[next]);
        else url.searchParams.delete('section');
        window.history.replaceState({}, '', url);
        setSection(next);
        setMenuOpen(false);
    };
    return <div className="seller-app">
        <Head title={`${name} · AgriFarm`} />
        <aside className="seller-sidebar">
            <div className="seller-brand"><AppMark storefront href="/seller/dashboard" /></div>
            <button className="seller-menu-toggle" aria-label={filipino ? 'Buksan o isara ang menu ng seller' : 'Toggle seller navigation'} aria-expanded={menuOpen} aria-controls="seller-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
            <div id="seller-navigation" className={`seller-navigation ${menuOpen ? 'is-open' : ''}`}>
                <nav aria-label={filipino ? 'Menu ng seller' : 'Seller navigation'}>{sections.map(([label, icon]) => <button key={label} onClick={() => navigate(label)} aria-current={section === label ? 'page' : undefined}><SellerIcon name={icon} />{filipino ? sectionLabels[label] : label}</button>)}</nav>
                <Link href="/logout" method="post" as="button" className="seller-logout"><Icon name="logout" />{filipino ? 'Mag-sign out' : 'Sign out'}</Link>
                <div className="seller-store"><Avatar user={auth.user} className="seller-store-icon" filipino={filipino} /><div><strong>{name}</strong><span>{filipino ? 'Katuwang na barangay · Pasig City' : 'Partner barangay · Pasig City'}</span></div></div>
            </div>
        </aside>
        <div className="seller-workspace">
            <header className="seller-topbar"><span className="seller-location"><Icon name="pin" size={17} />Pasig City</span><div className="seller-navbar-actions"><NavbarControls alerts={notificationItems} filipino={filipino} /><button className="seller-account" aria-label={filipino ? 'Buksan ang profile ng tindahan' : 'Open store profile'} onClick={() => navigate('Store Profile')}><Avatar user={auth.user} filipino={filipino} /><span>{name}</span><Icon name="chevron" size={16} /></button></div></header>
            <main className="seller-main">
                {section === 'Dashboard' ? <>
                    <h1 className="sr-only">{filipino ? 'Pangkalahatang-tanaw ng tindahan ng barangay' : 'Barangay store overview'}</h1>
                    <div className="seller-stats">{[
                        { icon: 'trend', label: filipino ? 'Kabuuang benta' : 'Total sales', value: formatMoney(metrics.totalSales), detail: metrics.completedOrders ? (filipino ? `${metrics.completedOrders} nakumpletong order` : `${metrics.completedOrders} completed ${metrics.completedOrders === 1 ? 'order' : 'orders'}`) : (filipino ? 'Wala pang nakumpletong order' : 'No completed orders yet') },
                        { icon: 'cart', label: filipino ? 'Mga order na naghihintay' : 'Pending orders', value: String(metrics.pendingOrders), detail: metrics.pendingOrders ? (filipino ? `${metrics.pendingOrders} order ang kailangang asikasuhin` : `${metrics.pendingOrders} ${metrics.pendingOrders === 1 ? 'order needs' : 'orders need'} review`) : (filipino ? 'Walang order na kailangang asikasuhin' : 'No orders to review') },
                        { icon: 'box', label: filipino ? 'Mga aktibong produkto' : 'Active products', value: String(metrics.activeProducts), detail: products.length ? (filipino ? `${metrics.lowStockProducts} produkto ang kaunti na ang stock` : `${metrics.lowStockProducts} low in stock`) : (filipino ? 'Wala pang nakalistang produkto' : 'No products listed') },
                        { icon: 'star', label: filipino ? 'Rating ng tindahan' : 'Store rating', value: '—', detail: filipino ? 'Wala pang feedback ng mamimili' : 'No reviews yet' },
                    ].map(({ icon, label, value, detail }) => <article className="seller-stat seller-stat--sales" key={label}>
                        <div className="seller-stat-heading"><h2>{label}</h2><span className="seller-stat-icon"><SellerIcon name={icon} /></span></div>
                        <strong className="seller-stat-value">{value}</strong>
                        <p>{detail}</p>
                    </article>)}</div>
                    <div className="seller-overview-grid">
                        <SalesOverview orders={orders} SellerIcon={SellerIcon} filipino={filipino} />
                        <WeatherCard weather={weather} onViewForecast={() => navigate('Forecasting')} filipino={filipino} />
                    </div>
                    <div className="seller-bottom-grid">
                        <RecentOrders orders={orders} products={products} navigate={navigate} SellerIcon={SellerIcon} EmptyState={EmptyState} filipino={filipino} />
                        <InventoryWatch products={products} navigate={navigate} SellerIcon={SellerIcon} EmptyState={EmptyState} filipino={filipino} />
                    </div>
                </> : section === 'Products' ? <Products filipino={filipino} /> : section === 'Orders' ? <Orders products={products} orders={orders} filipino={filipino} /> : section === 'Analytics' ? <Analytics products={products} orders={orders} SellerIcon={SellerIcon} filipino={filipino} /> : section === 'Reports' ? <Reports products={products} orders={orders} storeName={name} SellerIcon={SellerIcon} filipino={filipino} /> : section === 'Settings' ? <Settings language={language} onLanguageChange={changeLanguage} notifications={notificationPreferences} onNotificationChange={changeNotification} /> : <>
                    <h1 className="seller-page-title">{filipino ? sectionLabels[section] : section}</h1>
                    <section className="seller-panel seller-section-panel">
                        {section === 'Store Profile' ? <ProfileForm filipino={filipino} /> : <EmptyState icon={sections.find(([label]) => label === section)?.[1]} title={(filipino ? { Forecasting: 'Wala pang detalyadong taya', Analytics: 'Wala pang datos ng benta' } : { Forecasting: 'Forecasts are not available yet', Analytics: 'No sales data yet' })[section]}>{(filipino ? { Forecasting: 'Lalabas dito ang mas detalyadong taya ng panahon at pananim kapag nakakonekta na ang serbisyo ng pagtataya.', Analytics: 'Lalabas dito ang pagsusuri ng benta kapag may mga nakumpletong order na.' } : { Forecasting: 'Weather and crop forecasts will appear when the forecasting service is connected.', Analytics: 'Sales analytics will appear when completed orders are available.' })[section]}</EmptyState>}
                    </section>
                </>}
                <footer className="seller-footer">AgriFarm · {filipino ? 'Katuwang na barangay' : 'Partner barangay'}</footer>
            </main>
        </div>
    </div>;
}
