import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

import AppMark from '../Components/AppMark';
import ThemeToggle from '../Components/ThemeToggle';
import StorefrontLayout from './StorefrontLayout';

const siteLinks = [
    { label: 'Home', href: '/#home' },
    { label: 'Marketplace', href: '/#marketplace' },
    { label: 'About', href: '/#about' },
    { label: 'Contact', href: '/#contact' },
];

export default function GuestLayout({ children, authPage = false, storefront = false, market = false }) {
    const user = usePage().props.auth?.user;
    const [menuOpen, setMenuOpen] = useState(false);

    if (storefront) return <StorefrontLayout market={market}>{children}</StorefrontLayout>;

    if (authPage) {
        return (
            <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-forest-950 dark:bg-night-950">
                <img src="/images/agrifarm-auth-produce-color.png" alt="" aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 size-full object-cover" />
                <div className="pointer-events-none fixed inset-0 -z-10 bg-forest-900/50 dark:bg-black/70" aria-hidden="true" />

                <header className="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-7 sm:pt-6 lg:px-10 lg:pt-8">
                    <AppMark inverted />
                    <ThemeToggle inverted />
                </header>

                <main className="flex flex-1">{children}</main>
            </div>
        );
    }

    const destination = user ? rolePath(user.role) : '/login';

    return (
        <div className="flex min-h-screen flex-col bg-cream-50 transition-colors dark:bg-night-950">
            <div className="bg-forest-900 px-4 py-2 text-center text-xs font-semibold tracking-wide text-white">
                Connecting Pasig communities with local urban growers
            </div>
            <header className="sticky top-0 z-50 border-b border-forest-950/10 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-night-950/95">
                <div className="mx-auto grid min-h-20 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-10 lg:px-10 xl:px-12">
                    <div className="justify-self-start">
                        <AppMark compact />
                    </div>

                    <nav className="hidden items-center gap-2 lg:flex" aria-label="Main navigation">
                        {siteLinks.map((item) => (
                            <a key={item.label} href={item.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 transition hover:bg-forest-50 hover:text-forest-800 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white">{item.label}</a>
                        ))}
                    </nav>

                    <div className="flex items-center justify-self-end">
                        <div className="hidden items-center gap-2.5 sm:flex">
                            <ThemeToggle />
                            <div className="hidden items-center gap-2.5 lg:flex">
                                <HeaderIcon href={destination} label="Favorites"><HeartIcon /></HeaderIcon>
                                <HeaderIcon href={destination} label="Shopping cart"><CartIcon /></HeaderIcon>
                            </div>
                            <HeaderIcon href={destination} label="Notifications"><BellIcon /></HeaderIcon>
                            <div className="ml-0.5 border-l border-forest-950/10 pl-3 dark:border-white/15">
                                <Link href={destination} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-forest-700 px-4 py-2 text-sm font-bold text-white hover:bg-forest-800">
                                    <ProfileIcon />
                                    {user?.role === 'customer' ? 'Profile' : user ? 'Workspace' : 'Log in'}
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 lg:hidden">
                            <div className="sm:hidden"><ThemeToggle /></div>
                            <div className="sm:hidden"><HeaderIcon href={destination} label="Notifications"><BellIcon /></HeaderIcon></div>
                            <button type="button" onClick={() => setMenuOpen((open) => !open)} className="grid size-11 place-items-center rounded-xl border border-forest-950/10 text-forest-900 hover:bg-forest-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen}>
                                {menuOpen ? <CloseIcon /> : <MenuIcon />}
                            </button>
                        </div>
                    </div>
                </div>

                {menuOpen && (
                    <div className="border-t border-forest-950/10 bg-white px-4 pb-5 pt-3 dark:border-white/10 dark:bg-night-950 lg:hidden">
                        <nav className="mx-auto grid max-w-7xl gap-1" aria-label="Mobile navigation">
                            {siteLinks.map((item) => (
                                <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-stone-700 hover:bg-forest-50 hover:text-forest-800 dark:text-stone-200 dark:hover:bg-white/10 dark:hover:text-white">{item.label}</a>
                            ))}
                        </nav>
                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-forest-950/10 pt-3 dark:border-white/10 sm:grid-cols-3 lg:hidden">
                            <HeaderIcon href={destination} label="Favorites" mobile><HeartIcon /> Favorites</HeaderIcon>
                            <HeaderIcon href={destination} label="Shopping cart" mobile><CartIcon /> Cart</HeaderIcon>
                            <Link href={destination} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-forest-700 px-4 text-sm font-bold text-white sm:col-span-1"><ProfileIcon /> {user?.role === 'customer' ? 'Profile' : user ? 'Open' : 'Log in'}</Link>
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1">{children}</main>

            <footer id="contact" className="scroll-mt-20 border-t border-forest-950/10 bg-white dark:border-white/10 dark:bg-night-950">
                <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.3fr_0.7fr_1fr] lg:px-8">
                    <div>
                        <AppMark compact />
                        <p className="mt-4 max-w-md text-sm leading-6 text-stone-600 dark:text-stone-300">A local agricultural marketplace being built for Pasig&apos;s customers, urban farmers, and CENRO administrators.</p>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-forest-950 dark:text-white">Explore</p>
                        <nav className="mt-3 grid gap-2 text-sm text-stone-600 dark:text-stone-300" aria-label="Footer navigation">
                            {siteLinks.slice(0, 3).map((item) => <a key={item.label} href={item.href} className="w-fit hover:text-forest-700 dark:hover:text-white">{item.label}</a>)}
                        </nav>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-forest-950 dark:text-white">Contact</p>
                        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">For questions about AgriFarm, connect with your Pasig City CENRO program representative.</p>
                        <nav className="mt-4 flex gap-5 text-sm" aria-label="Legal information">
                            <Link href="/terms" className="font-semibold text-forest-700 hover:text-forest-900 dark:text-forest-300 dark:hover:text-white">Terms</Link>
                            <Link href="/privacy" className="font-semibold text-forest-700 hover:text-forest-900 dark:text-forest-300 dark:hover:text-white">Privacy</Link>
                        </nav>
                    </div>
                </div>
                <div className="border-t border-forest-950/10 px-4 py-4 text-center text-xs text-stone-500 dark:border-white/10 dark:text-stone-400">© {new Date().getFullYear()} AgriFarm. Local harvests, stronger communities.</div>
            </footer>
        </div>
    );
}

function HeaderIcon({ href, label, mobile = false, children }) {
    return <Link href={href} aria-label={label} title={label} className={mobile ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-forest-950/10 px-3 text-xs font-bold text-forest-800 hover:bg-forest-50 dark:border-white/15 dark:text-forest-200 dark:hover:bg-white/10' : 'grid size-10 place-items-center rounded-xl text-forest-800 hover:bg-forest-50 dark:text-forest-200 dark:hover:bg-white/10'}>{children}</Link>;
}

function HeartIcon() {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.8 5.8a5.4 5.4 0 0 0-7.6 0L12 7l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 22l7.6-7.4 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CartIcon() {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6m4 12h.01M17 20h.01" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function BellIcon() {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ProfileIcon() {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" strokeLinecap="round" /></svg>;
}

function MenuIcon() {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>;
}

function CloseIcon() {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function rolePath(role) {
    return {
        customer: '/customer',
        seller: '/seller/dashboard',
        cenro_admin: '/admin/dashboard',
    }[role] ?? '/';
}
