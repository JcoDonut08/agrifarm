import { Head, Link } from '@inertiajs/react';

import GuestLayout from '../Layouts/GuestLayout';

const accessTypes = [
    { label: 'Customers', description: 'Create and verify an account for future marketplace access.', action: 'Create account', href: '/register' },
    { label: 'Sellers', description: 'Use the seller account issued by the AgriFarm team.', action: 'Seller sign in', href: '/login' },
    { label: 'CENRO administrators', description: 'Enter through the same secure account process.', action: 'Admin sign in', href: '/login' },
];

export default function Welcome() {
    return (
        <GuestLayout>
            <Head title="Local agricultural marketplace" />

            <section className="overflow-hidden border-b border-forest-950/10 bg-white">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14 lg:px-8 lg:py-18">
                    <div>
                        <span className="inline-flex rounded-full bg-forest-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-forest-700">
                            Local agriculture, one secure account
                        </span>
                        <h1 className="mt-5 max-w-2xl text-4xl font-bold tracking-[-0.035em] text-forest-950 sm:text-5xl lg:text-6xl">
                            Your way into the AgriFarm marketplace.
                        </h1>
                        <p className="mt-5 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">
                            AgriFarm is preparing a digital marketplace for local harvests. Create a customer account or sign in with your assigned role to access your workspace.
                        </p>

                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-forest-700 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-forest-800">Sign in to AgriFarm</Link>
                            <Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-forest-200 bg-white px-6 py-3 text-sm font-bold text-forest-800 hover:border-forest-300 hover:bg-forest-50">Create account</Link>
                        </div>

                        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-stone-600">
                            <span className="flex items-center gap-2"><CheckIcon /> Email verification</span>
                            <span className="flex items-center gap-2"><CheckIcon /> Secure password sign-in</span>
                            <span className="flex items-center gap-2"><CheckIcon /> Role-protected access</span>
                        </div>
                    </div>

                    <div className="relative min-h-80 overflow-hidden rounded-[2rem] bg-forest-900 shadow-[0_30px_80px_-36px_rgba(11,31,23,0.55)] sm:min-h-[30rem]">
                        <img src="/images/agrifarm-market-hero.png" alt="A Filipino farmer arranging freshly harvested vegetables at a local collection point" className="absolute inset-0 size-full object-cover object-[68%_center]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                            <p className="text-sm font-bold uppercase tracking-[0.16em] text-harvest-400">Built around local harvests</p>
                            <p className="mt-2 max-w-lg text-xl font-bold sm:text-2xl">A marketplace experience designed for Philippine farming communities.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
                <div className="max-w-2xl">
                    <p className="text-xs font-bold uppercase tracking-[0.17em] text-forest-600">Choose your access</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">One sign-in, separate workspaces</h2>
                    <p className="mt-3 leading-7 text-stone-600">Use the account type assigned to you. Public registration always creates a customer account.</p>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {accessTypes.map((type, index) => (
                        <article key={type.label} className="flex flex-col rounded-2xl border border-forest-950/10 bg-white p-5 shadow-sm sm:p-6">
                            <span className="grid size-10 place-items-center rounded-xl bg-forest-100 text-sm font-bold text-forest-700">0{index + 1}</span>
                            <h3 className="mt-5 text-lg font-bold text-forest-950">{type.label}</h3>
                            <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">{type.description}</p>
                            <Link href={type.href} className="mt-5 inline-flex min-h-10 items-center font-bold text-forest-700 hover:text-forest-900">{type.action} <span aria-hidden="true" className="ml-2">→</span></Link>
                        </article>
                    ))}
                </div>
            </section>
        </GuestLayout>
    );
}

function CheckIcon() {
    return (
        <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-forest-100 text-forest-700">
            <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m5 10 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
    );
}
