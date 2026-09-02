import { Link, usePage } from '@inertiajs/react';

import AppMark from '../Components/AppMark';

export default function AuthenticatedLayout({ title, introduction, children }) {
    const user = usePage().props.auth.user;

    return (
        <div className="min-h-screen bg-stone-50">
            <header className="border-b border-emerald-950/10 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <AppMark compact />
                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-medium text-stone-800">{user.name}</p>
                            <p className="text-xs text-stone-500">{user.roleLabel}</p>
                        </div>
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="min-h-10 rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400 hover:bg-stone-100"
                        >
                            Sign out
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">{user.roleLabel}</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">{title}</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">{introduction}</p>
                <div className="mt-8">{children}</div>
            </main>
        </div>
    );
}
