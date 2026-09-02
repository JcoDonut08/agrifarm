import { Head } from '@inertiajs/react';

import GuestLayout from '../Layouts/GuestLayout';

const stack = ['Laravel 12', 'React 19', 'Inertia 3', 'Tailwind CSS 4', 'PostgreSQL'];

const boundaries = [
    'No authentication or role workflows yet',
    'No AgriFarm database migrations yet',
    'No forecasting integration yet',
];

export default function Welcome() {
    return (
        <GuestLayout>
            <Head title="Foundation" />

            <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.35fr_0.65fr] lg:items-center lg:px-8 lg:py-28">
                <div>
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Foundation ready
                    </p>
                    <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl lg:text-6xl">
                        A simple base for building AgriFarm one feature at a time.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                        Laravel owns routing and business logic. React renders the interface through Inertia. PostgreSQL
                        will become the application database after the schema is reviewed.
                    </p>

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

                <aside className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="text-lg font-semibold text-emerald-950">Intentionally deferred</h2>
                    <ul className="mt-5 space-y-4">
                        {boundaries.map((item) => (
                            <li key={item} className="flex gap-3 text-sm leading-6 text-stone-600">
                                <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-amber-500" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </aside>
            </section>
        </GuestLayout>
    );
}
