import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AppMark from '../Components/AppMark';
import AccountMenu from '../Components/Storefront/AccountMenu';
import Icon from '../Components/Storefront/Icon';
import { marketHref } from '../Components/Storefront/catalog';
import { useShop } from '../Components/Storefront/ShopContext';
import HelpWidget from '../Components/Storefront/HelpWidget';
import FormStatus from '../Components/FormStatus';
import '../../css/storefront.css';

export default function StorefrontLayout({ children, market }) {
    const { props, url } = usePage();
    const user = props.auth?.user;
    const pathname = url.split('?')[0];
    const isCustomerAccountPage = ['/customer', '/customer/orders', '/customer/settings'].includes(pathname);
    const currentPage = pathname === '/contact' ? 'contact' : pathname === '/about' ? 'about' : pathname === '/customer' ? 'profile' : new URLSearchParams(url.split('?')[1] || '').get('page') || 'home';
    const { filipino, count, favorites, panel, setPanel, notice, noticeId, noticeTarget, noticeTone, dismissNotice } = useShop();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuDialog = useRef(null);
    const menuTrigger = useRef(null);
    const menuClose = useRef(null);
    const destination = user ? ({ customer: '/customer', seller: '/seller/dashboard', cenro_admin: '/admin/dashboard' }[user.role] || '/') : '/login';
    const links = [{ label: filipino ? 'Home' : 'Home', href: '/', active: currentPage === 'home' }, { label: filipino ? 'Pamilihan' : 'Marketplace', href: marketHref(), active: market }, { label: filipino ? 'Tungkol' : 'About', href: '/about', active: currentPage === 'about' }];

    useEffect(() => { setMenuOpen(false); }, [url]);

    useEffect(() => {
        if (!menuOpen) return;
        const element = menuDialog.current;
        const previousOverflow = document.body.style.overflow;
        const desktop = window.matchMedia('(min-width: 1001px)');
        const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
        element.showModal();
        document.body.style.overflow = 'hidden';
        menuClose.current?.focus();
        desktop.addEventListener('change', closeOnDesktop);
        closeOnDesktop();
        return () => {
            desktop.removeEventListener('change', closeOnDesktop);
            element.close();
            document.body.style.overflow = previousOverflow;
            if (!desktop.matches) menuTrigger.current?.focus();
        };
    }, [menuOpen]);

    return (
        <div className="storefront">
            <a className="store-skip-link" href="#main-content">Skip to content</a>
            <header className="store-header">
                <div className="store-nav-inner">
                    <AppMark storefront />
                    <nav className="store-desktop-nav" aria-label="Main navigation">
                        {links.map((link) => <Link key={link.label} href={link.href} className={link.active ? 'active' : ''} aria-current={link.active ? 'page' : undefined}>{link.label}</Link>)}
                        <Link href="/contact" className={currentPage === 'contact' ? 'active' : ''} aria-current={currentPage === 'contact' ? 'page' : undefined}>{filipino ? 'Makipag-ugnayan' : 'Contact'}</Link>
                    </nav>
                    <div className="store-header-actions">
                        <Link className="store-icon-button favorites-header" aria-label={`Favorites${favorites.length ? `, ${favorites.length} saved` : ''}`} href="/?page=favorites" aria-current={currentPage === 'favorites' ? 'page' : undefined}><Icon name="heart" size={23} />{favorites.length > 0 && <span className="count-badge">{favorites.length}</span>}</Link>
                        <Link className="store-icon-button" aria-label={`Shopping cart, ${count} items`} href="/?page=cart" aria-current={currentPage === 'cart' ? 'page' : undefined}><Icon name="cart" size={23} />{count > 0 && <span className="count-badge">{count}</span>}</Link>
                        <Link className="store-icon-button notifications-header" aria-label="Notifications" href="/?page=notifications" aria-current={currentPage === 'notifications' ? 'page' : undefined}><Icon name="bell" size={23} />{((usePage().props.notifications || []).filter(n => !n.read_at).length) > 0 && <span className="count-badge">{((usePage().props.notifications || []).filter(n => !n.read_at).length)}</span>}</Link>
                        {user
                            ? <AccountMenu user={user} destination={destination} current={currentPage === 'profile'} onOpen={() => setMenuOpen(false)} />
                            : <Link className="store-button header-login" href={destination}>Log in</Link>}
                        <button ref={menuTrigger} type="button" className="store-icon-button store-menu-button" aria-label={filipino ? 'Buksan ang menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="store-mobile-menu" aria-haspopup="dialog" onClick={() => setMenuOpen(true)}><Icon name="menu" /></button>
                    </div>
                </div>
            </header>
            <dialog ref={menuDialog} id="store-mobile-menu" className="store-mobile-drawer" aria-label={filipino ? 'Menu ng AgriFarm' : 'AgriFarm menu'}
                onCancel={event => { event.preventDefault(); setMenuOpen(false); }}
                onClick={event => {
                    if (event.target !== event.currentTarget) return;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setMenuOpen(false);
                }}>
                <div className="store-mobile-drawer-heading" onClick={event => { if (event.target.closest('a')) setMenuOpen(false); }}>
                    <AppMark storefront />
                    <button ref={menuClose} type="button" className="store-icon-button" aria-label={filipino ? 'Isara ang menu' : 'Close navigation menu'} onClick={() => setMenuOpen(false)}><Icon name="close" /></button>
                </div>
                <nav id="store-mobile-nav" className="store-mobile-nav" aria-label={filipino ? 'Nabigasyon sa mobile' : 'Mobile navigation'}>
                    {links.map((link, index) => <Link key={link.href} href={link.href} aria-current={link.active ? 'page' : undefined} onClick={() => setMenuOpen(false)}><Icon name={['home', 'leaf', 'people'][index]} />{link.label}</Link>)}
                    {['favorites', 'cart', 'notifications'].map((page) => <Link key={page} href={`/?page=${page}`} aria-current={currentPage === page ? 'page' : undefined} onClick={() => setMenuOpen(false)}><Icon name={{ favorites: 'heart', cart: 'cart', notifications: 'bell' }[page]} />{filipino ? {favorites: 'Mga Paborito', cart: 'Cart', notifications: 'Mga Notipikasyon'}[page] : page.charAt(0).toUpperCase() + page.slice(1)}</Link>)}
                    <Link href="/contact" aria-current={currentPage === 'contact' ? 'page' : undefined} onClick={() => setMenuOpen(false)}><Icon name="mail" />{filipino ? 'Makipag-ugnayan' : 'Contact'}</Link>
                </nav>
                <div className="store-mobile-drawer-account">
                    <Link href={destination} onClick={() => setMenuOpen(false)}><Icon name="user" /><span>{user ? (filipino ? (user.role === 'customer' ? 'Aking profile' : 'Aking workspace') : (user.role === 'customer' ? 'My profile' : 'My workspace')) : (filipino ? 'Mag-log in' : 'Log in')}</span><Icon name="arrow" size={18} /></Link>
                </div>
            </dialog>
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
                            <h2>{filipino ? 'Tuklasin ang AgriFarm' : 'Explore AgriFarm'}</h2>
                            <Link href="/">{filipino ? 'Home' : 'Home'}</Link>
                            <Link href={marketHref()}>{filipino ? 'Pamilihan' : 'Marketplace'}</Link>
                            <Link href="/contact" className={currentPage === 'contact' ? 'active' : ''} aria-current={currentPage === 'contact' ? 'page' : undefined}>Contact</Link>
                        </nav>
                        <nav aria-label="Community gardens">
                            <h2>{filipino ? 'Ang aming mga komunidad' : 'Our communities'}</h2>
                            <Link href={marketHref('Rosario')}>Barangay Rosario</Link>
                            <Link href={marketHref('Maybunga')}>Barangay Maybunga</Link>
                            <Link href={marketHref('Sto. Tomas')}>Barangay Sto. Tomas</Link>
                            <span className="footer-location"><Icon name="pin" size={15} />Pasig City, Philippines</span>
                        </nav>
                    </div>
                    <div className="store-footer-bottom">
                        <p>© {new Date().getFullYear()} AgriFarm</p>
                        {pathname === '/' && !props.sellerProducts?.length && <p className="sample-note">Design preview · Sample products, stock and prices</p>}
                        <nav aria-label="Legal information"><Link href="/terms">{filipino ? 'Mga Tuntunin sa Paggamit' : 'Terms of use'}</Link><Link href="/privacy">{filipino ? 'Patakaran sa Pagkapribado' : 'Privacy policy'}</Link></nav>
                    </div>
                </div>
            </footer>
            <FormStatus dismissible messageId={noticeId} onDismiss={dismissNotice} tone={noticeTone}
                dismissLabel={filipino ? 'Isara ang mensahe' : 'Dismiss message'}
                action={noticeTarget && <Link href={`/?page=${noticeTarget}`}>{filipino ? (noticeTarget === 'cart' ? 'Tingnan ang basket' : 'Tingnan ang mga paborito') : `View ${noticeTarget === 'cart' ? 'cart' : 'favorites'}`} <Icon name="arrow" size={16} /></Link>}>
                {notice}
            </FormStatus>
            <ShopDialog />
            {!isCustomerAccountPage && <HelpWidget />}
        </div>
    );
}

function ShopDialog() {
    const { props, url } = usePage();
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
            

        </dialog>
    );
}
