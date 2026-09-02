import { Link, usePage } from '@inertiajs/react';

import AppMark from '../Components/AppMark';

export default function GuestLayout({ children }) {
    const user = usePage().props.auth?.user;

    return (
        <div className="min-h-screen bg-stone-50">
            <header className="border-b border-emerald-950/10 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <AppMark />
                    <nav className="flex shrink-0 items-center gap-2 text-sm" aria-label="Account navigation">
                        {user ? (
                            <Link href={rolePath(user.role)} className="rounded-lg px-3 py-2 font-medium text-emerald-800 hover:bg-emerald-50">
                                My area
                            </Link>
                        ) : (
                            <>
                                <Link href="/login" className="rounded-lg px-3 py-2 font-medium text-stone-700 hover:bg-stone-100">
                                    Sign in
                                </Link>
                                <Link
                                    href="/register"
                                    className="hidden rounded-lg bg-emerald-800 px-3.5 py-2 font-semibold text-white hover:bg-emerald-900 sm:inline-flex"
                                >
                                    Customer account
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main>{children}</main>

            <footer className="border-t border-emerald-950/10 bg-white">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <span>AgriFarm undergraduate thesis project</span>
                    <nav className="flex gap-4" aria-label="Legal information">
                        <Link href="/terms" className="hover:text-emerald-800">Terms</Link>
                        <Link href="/privacy" className="hover:text-emerald-800">Privacy</Link>
                    </nav>
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
