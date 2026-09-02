import { Link, usePage } from '@inertiajs/react';

import AppMark from '../Components/AppMark';

export default function GuestLayout({ children, authPage = false }) {
    const user = usePage().props.auth?.user;

    if (authPage) {
        return (
            <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-forest-950">
                <img
                    src="/images/agrifarm-auth-produce-color.png"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 -z-20 size-full object-cover"
                />
                <div className="pointer-events-none fixed inset-0 -z-10 bg-forest-900/50" aria-hidden="true" />

                <header className="relative z-10 px-4 pt-4 sm:px-7 sm:pt-6 lg:px-10 lg:pt-8">
                    <AppMark inverted />
                </header>

                <main className="flex flex-1">{children}</main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-cream-50">
            <div className="bg-forest-800 px-4 py-2 text-center text-xs font-semibold tracking-wide text-white">
                Secure account access for the AgriFarm marketplace
            </div>
            <header className="border-b border-forest-950/10 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <AppMark />
                    <nav className="flex shrink-0 items-center gap-2 text-sm" aria-label="Account navigation">
                        {user ? (
                            <Link href={rolePath(user.role)} className="rounded-xl bg-forest-700 px-4 py-2.5 font-bold text-white hover:bg-forest-800">
                                Open workspace
                            </Link>
                        ) : (
                            <>
                                <Link href="/login" className="rounded-xl px-3 py-2.5 font-semibold text-forest-800 hover:bg-forest-50 sm:px-4">
                                    Sign in
                                </Link>
                                <Link
                                    href="/register"
                                    className="hidden rounded-xl bg-harvest-500 px-4 py-2.5 font-bold text-forest-950 shadow-sm hover:bg-harvest-400 sm:inline-flex"
                                >
                                    Create account
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="border-t border-forest-950/10 bg-white">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-stone-600 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6 lg:px-8">
                    <div>
                        <p className="font-bold text-forest-950">AgriFarm</p>
                        <p className="mt-1 max-w-md leading-6">A secure account portal for a local agricultural marketplace serving customers, sellers, and CENRO administrators.</p>
                    </div>
                    <div className="sm:text-right">
                        <nav className="flex gap-5 sm:justify-end" aria-label="Legal information">
                            <Link href="/terms" className="font-semibold hover:text-forest-700">Terms of Use</Link>
                            <Link href="/privacy" className="font-semibold hover:text-forest-700">Privacy Notice</Link>
                        </nav>
                        <p className="mt-2 text-xs text-stone-500">Account services only. Marketplace features are in development.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function rolePath(role) {
    return {
        customer: '/customer',
        seller: '/seller/dashboard',
        cenro_admin: '/admin/dashboard',
    }[role] ?? '/';
}
