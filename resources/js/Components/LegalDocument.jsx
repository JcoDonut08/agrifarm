import { Head } from '@inertiajs/react';

import GuestLayout from '../Layouts/GuestLayout';

export default function LegalDocument({ title, summary, updated, sections }) {
    return (
        <GuestLayout>
            <Head title={title} />
            <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
                <header className="border-b border-emerald-950/10 pb-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">AgriFarm legal information</p>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-emerald-950 sm:text-5xl">{title}</h1>
                    <p className="mt-5 max-w-3xl text-base leading-7 text-stone-600 sm:text-lg">{summary}</p>
                    <p className="mt-4 text-sm text-stone-500">Last updated: {updated}</p>
                </header>

                <div className="mt-10 space-y-10">
                    {sections.map((section, index) => (
                        <section key={section.title} aria-labelledby={`section-${index}`}>
                            <h2 id={`section-${index}`} className="text-xl font-semibold text-emerald-950 sm:text-2xl">
                                {index + 1}. {section.title}
                            </h2>
                            <div className="mt-3 space-y-3 text-base leading-7 text-stone-700">
                                {section.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                            </div>
                            {section.items && (
                                <ul className="mt-4 space-y-2 pl-5 text-base leading-7 text-stone-700 marker:text-emerald-700">
                                    {section.items.map((item) => <li key={item} className="list-disc pl-1">{item}</li>)}
                                </ul>
                            )}
                        </section>
                    ))}
                </div>
            </article>
        </GuestLayout>
    );
}
