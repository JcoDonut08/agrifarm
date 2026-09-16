import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AppMark from '../Components/AppMark';
import AccountMenu from '../Components/Storefront/AccountMenu';
import Icon from '../Components/Storefront/Icon';
import { marketHref } from '../Components/Storefront/catalog';
import { useShop } from '../Components/Storefront/ShopContext';
import '../../css/storefront.css';

export default function StorefrontLayout({ children, market }) {
    const { props, url } = usePage();
    const user = props.auth?.user;
    const currentPage = url.split('?')[0] === '/contact' ? 'contact' : new URLSearchParams(url.split('?')[1] || '').get('page') || 'home';
    const { count, favorites, setPanel, notice, noticeId, noticeTarget, dismissNotice, setNoticePaused } = useShop();
    const [menuOpen, setMenuOpen] = useState(false);
    const destination = user ? ({ customer: '/customer', seller: '/seller/dashboard', cenro_admin: '/admin/dashboard' }[user.role] || '/') : '/login';
    const links = [{ label: 'Home', href: '/', active: currentPage === 'home' }, { label: 'Marketplace', href: marketHref(), active: market }];

    return (
        <div className="storefront">
            <a className="store-skip-link" href="#main-content">Skip to content</a>
            <header className="store-header">
                <div className="store-nav-inner">
                    <AppMark storefront />
                    <nav className="store-desktop-nav" aria-label="Main navigation">
                        {links.map((link) => <Link key={link.label} href={link.href} className={link.active ? 'active' : ''} aria-current={link.active ? 'page' : undefined}>{link.label}</Link>)}
                        <button onClick={() => setPanel('about')}>About</button>
                        <Link href="/contact" className={currentPage === 'contact' ? 'active' : ''} aria-current={currentPage === 'contact' ? 'page' : undefined}>Contact</Link>
                    </nav>
                    <div className="store-header-actions">
                        <Link className="store-icon-button favorites-header" aria-label={`Favorites${favorites.length ? `, ${favorites.length} saved` : ''}`} href="/?page=favorites" aria-current={currentPage === 'favorites' ? 'page' : undefined}><Icon name="heart" size={23} />{favorites.length > 0 && <span className="count-badge">{favorites.length}</span>}</Link>
                        <Link className="store-icon-button" aria-label={`Shopping cart, ${count} items`} href="/?page=cart" aria-current={currentPage === 'cart' ? 'page' : undefined}><Icon name="cart" size={23} />{count > 0 && <span className="count-badge">{count}</span>}</Link>
                        <Link className="store-icon-button notifications-header" aria-label="Notifications" href="/?page=notifications" aria-current={currentPage === 'notifications' ? 'page' : undefined}><Icon name="bell" size={22} /></Link>
                        {user
                            ? <AccountMenu user={user} destination={destination} onOpen={() => setMenuOpen(false)} onFavorites={() => router.visit('/?page=favorites')} />
                            : <Link className="store-button header-login" href={destination}>Log in</Link>}
                        <button className="store-icon-button store-menu-button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="store-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
                    </div>
                </div>
                {menuOpen && <nav id="store-mobile-nav" className="store-mobile-nav" aria-label="Mobile navigation">
                    {links.map((link) => <Link key={link.label} href={link.href} aria-current={link.active ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}
                    {['favorites', 'cart', 'notifications'].map((page) => <Link key={page} href={`/?page=${page}`} aria-current={currentPage === page ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{page.charAt(0).toUpperCase() + page.slice(1)}</Link>)}
                    <Link href="/contact" aria-current={currentPage === 'contact' ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Contact</Link>
                    {['about'].map((panel) => <button key={panel} onClick={() => { setMenuOpen(false); setPanel(panel); }}>{panel.charAt(0).toUpperCase() + panel.slice(1)}</button>)}
                </nav>}
            </header>
            <main id="main-content" tabIndex={-1}>{children}</main>
            <footer className="store-footer">
                <div className="store-container">
                    <div className="store-footer-grid">
                        <div className="store-footer-brand">
                            <AppMark storefront />
                            <p>Grown locally. Connected through community.</p>
                            <p>Discover fresh produce and the neighborhood growers behind it, right here in Pasig.</p>
                        </div>
                        <nav aria-label="Footer navigation">
                            <h2>Explore AgriFarm</h2>
                            <Link href="/">Home</Link>
                            <Link href={marketHref()}>Marketplace</Link>
                            <button onClick={() => setPanel('about')}>About us</button>
                            <Link href="/contact" className={currentPage === 'contact' ? 'active' : ''} aria-current={currentPage === 'contact' ? 'page' : undefined}>Contact</Link>
                        </nav>
                        <nav aria-label="Community gardens">
                            <h2>Our communities</h2>
                            <Link href={marketHref('Rosario')}>Barangay Rosario</Link>
                            <Link href={marketHref('Maybunga')}>Barangay Maybunga</Link>
                            <Link href={marketHref('Sto. Tomas')}>Barangay Sto. Tomas</Link>
                            <span className="footer-location"><Icon name="pin" size={15} />Pasig City, Philippines</span>
                        </nav>
                    </div>
                    <div className="store-footer-bottom">
                        <p>© {new Date().getFullYear()} AgriFarm</p>
                        {!props.sellerProducts?.length && <p className="sample-note">Design preview · Sample products, stock and prices</p>}
                        <nav aria-label="Legal information"><Link href="/terms">Terms of use</Link><Link href="/privacy">Privacy policy</Link></nav>
                    </div>
                </div>
            </footer>
            <div className={`store-toast ${notice ? 'visible' : ''}`} onMouseEnter={() => setNoticePaused(true)} onMouseLeave={() => setNoticePaused(false)} onFocus={() => setNoticePaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setNoticePaused(false); }}>
                <div className="toast-announcement" role="status" aria-live="polite" aria-atomic="true">{notice && <span key={noticeId} className="toast-message"><Icon name={noticeTarget === 'favorites' ? 'heart' : 'check'} />{notice}</span>}</div>
                {notice && <>{noticeTarget && <Link href={`/?page=${noticeTarget}`}>View {noticeTarget === 'cart' ? 'cart' : 'favorites'} <Icon name="arrow" size={16} /></Link>}<button type="button" className="toast-dismiss" aria-label="Dismiss notification" onClick={dismissNotice}><Icon name="close" size={18} /></button></>}
            </div>
            <ShopDialog />
        </div>
    );
}

function ShopDialog() {
    const { panel, setPanel } = useShop();
    const dialog = useRef(null);
    const title = { about: 'Good food. Stronger communities.', contact: 'Let us grow together' }[panel];

    useEffect(() => {
        if (!panel) return;
        const element = dialog.current;
        const previousOverflow = document.body.style.overflow;
        const opener = document.activeElement;
        element.showModal();
        document.body.style.overflow = 'hidden';
        return () => { element.close(); document.body.style.overflow = previousOverflow; opener?.focus(); };
    }, [panel]);

    if (!panel) return null;

    return (
        <dialog ref={dialog} className={`store-dialog ${panel === 'cart' ? 'cart-dialog' : ''}`} aria-labelledby="shop-dialog-title" onCancel={() => setPanel(null)} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setPanel(null); } }}>
            <div className="dialog-heading"><h2 id="shop-dialog-title">{title}</h2><button className="store-icon-button" aria-label="Close dialog" onClick={() => setPanel(null)}><Icon name="close" /></button></div>
            {panel === 'about' && <div className="information-dialog"><Icon name="sprout" size={44} /><p>AgriFarm brings Pasig’s local growers and their neighbors closer together. Discover community gardens, explore locally grown produce, and support the people growing food close to home.</p><p>Every local harvest is a small step toward a greener, more connected community.</p><p className="preview-message">{props.sellerProducts?.length ? 'Product listings and prices come from AgriFarm sellers. Checkout is not available yet.' : 'You’re exploring a design preview. Products, prices, and barangay features are illustrative.'}</p></div>}

        </dialog>
    );
}

