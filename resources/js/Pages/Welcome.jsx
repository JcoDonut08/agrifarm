import { Head, Link } from '@inertiajs/react';

import GuestLayout from '../Layouts/GuestLayout';

const stack = ['Laravel 12', 'React 19', 'Inertia 3', 'Tailwind CSS 4', 'PostgreSQL'];

const safeguards = [
    'Customer-only public registration',
    'Email verification and sign-in codes',
    'Server-enforced role access',
];

export default function Welcome() {
    return (
        <GuestLayout>
            <Head title="Foundation" />

            <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.35fr_0.65fr] lg:items-center lg:px-8 lg:py-28">
                <div>
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Authentication foundation
                    </p>
                    <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl lg:text-6xl">
                        Secure account access for every AgriFarm role.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                        Customers can create and verify an account. Customers, sellers, and CENRO administrators share
                        one protected sign-in flow with an email security code and role-specific access.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link href="/register" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">
                            Create customer account
                        </Link>
                        <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-800/25 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">
                            Sign in
                        </Link>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-2" aria-label="Technology stack">
                        {stack.map((item) => (
                            <span
                                key={item}
                                className="rounded-full border border-emerald-800/15 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-900"
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                </div>

                <aside className="border border-emerald-950/10 bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="text-lg font-semibold text-emerald-950">Account safeguards</h2>
                    <ul className="mt-5 space-y-4">
                        {safeguards.map((item) => (
                            <li key={item} className="flex gap-3 text-sm leading-6 text-stone-600">
                                <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-emerald-700" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </aside>
            </section>
        </GuestLayout>
    );
}
