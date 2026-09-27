import { Head } from '@inertiajs/react';

import GuestLayout from '../Layouts/GuestLayout';

export default function LegalDocument({ title, summary, updated, sections }) {
    return (
        <GuestLayout legalPage>
            <Head title={title} />
            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-950/5 dark:bg-night-800 dark:ring-white/10">
                    <header className="border-b border-stone-200 bg-stone-50/50 px-6 py-10 sm:px-10 dark:border-white/5 dark:bg-night-900/50">
                        <p className="text-xs font-bold uppercase tracking-[0.17em] text-forest-600 dark:text-forest-400">Account and marketplace information</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-forest-950 dark:text-white sm:text-4xl">{title}</h1>
                        <p className="mt-4 text-base leading-7 text-stone-600 dark:text-stone-300">{summary}</p>
                        <p className="mt-4 text-sm font-medium text-stone-500 dark:text-stone-400">Last updated: {updated}</p>
                    </header>

                    <div className="px-6 py-10 sm:px-10 space-y-12 pb-16">
                        {sections.map((section, index) => (
                            <section key={section.title} id={`section-${index}`} className="scroll-mt-12">
                                <h2 className="text-xl font-bold text-forest-950 dark:text-white sm:text-2xl">{index + 1}. {section.title}</h2>
                                <div className="mt-4 space-y-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
                                    {section.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                                </div>
                                {section.items && <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-relaxed text-stone-600 marker:text-forest-400 dark:text-stone-300 dark:marker:text-forest-500">{section.items.map((item) => <li key={item} className="pl-1">{item}</li>)}</ul>}
                            </section>
                        ))}
                    </div>
                </article>
            </div>
        </GuestLayout>
    );
}
