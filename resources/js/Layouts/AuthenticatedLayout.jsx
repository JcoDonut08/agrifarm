import { Link, usePage } from '@inertiajs/react';

import AppMark from '../Components/AppMark';
import ThemeToggle from '../Components/ThemeToggle';

export default function AuthenticatedLayout({ title, introduction, children }) {
    const user = usePage().props.auth.user;

    return (
        <div className="min-h-screen bg-cream-50 dark:bg-night-950">
            <header className="border-b border-forest-950/10 bg-white dark:border-white/10 dark:bg-night-950">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <AppMark compact />
                    <div className="flex items-center gap-2.5">
                        <ThemeToggle />
                        <Link href={rolePath(user.role)} aria-label="Notifications" title="Notifications" className="grid size-10 place-items-center rounded-xl text-forest-800 hover:bg-forest-50 dark:text-forest-200 dark:hover:bg-white/10">
                            <BellIcon />
                        </Link>
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-bold text-forest-950 dark:text-white">{user.name}</p>
                            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{user.roleLabel}</p>
                        </div>
                        <div className="ml-0.5 border-l border-forest-950/10 pl-3 dark:border-white/15">
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="min-h-10 rounded-xl border border-forest-200 bg-white px-3.5 py-2 text-sm font-bold text-forest-800 hover:border-forest-300 hover:bg-forest-50 dark:border-white/15 dark:bg-night-800 dark:text-stone-100 dark:hover:bg-night-700"
                            >
                                Sign out
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main>
                <section className="bg-forest-800 text-white">
                    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
                        <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-forest-100">{user.roleLabel}</span>
                        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-forest-100">{introduction}</p>
                    </div>
                </section>
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">{children}</div>
            </main>
        </div>
    );
}

function BellIcon() {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function rolePath(role) {
    return {
        customer: '/customer',
        seller: '/seller/dashboard',
        cenro_admin: '/admin/dashboard',
    }[role] ?? '/';
}
