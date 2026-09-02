import { Head } from '@inertiajs/react';

import GuestLayout from '../Layouts/GuestLayout';

export default function LegalDocument({ title, summary, updated, sections }) {
    return (
        <GuestLayout>
            <Head title={title} />
            <article>
                <header className="border-b border-forest-950/10 bg-white">
                    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
                        <p className="text-xs font-bold uppercase tracking-[0.17em] text-forest-600">Account and marketplace information</p>
                        <h1 className="mt-3 text-3xl font-bold tracking-tight text-forest-950 sm:text-5xl">{title}</h1>
                        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600 sm:text-lg">{summary}</p>
                        <p className="mt-4 text-sm font-medium text-stone-500">Last updated: {updated}</p>
                    </div>
                </header>

                <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-8">
                    <nav className="hidden lg:block" aria-label={`${title} sections`}>
                        <div className="sticky top-6 rounded-2xl border border-forest-950/10 bg-white p-4 shadow-sm">
                            <p className="px-2 text-xs font-bold uppercase tracking-[0.15em] text-forest-600">On this page</p>
                            <ol className="mt-3 space-y-1">
                                {sections.map((section, index) => (
                                    <li key={section.title}><a href={`#section-${index}`} className="block rounded-lg px-2 py-2 text-sm font-medium leading-5 text-stone-600 hover:bg-forest-50 hover:text-forest-800">{index + 1}. {section.title}</a></li>
                                ))}
                            </ol>
                        </div>
                    </nav>

                    <div className="space-y-5">
                        {sections.map((section, index) => (
                            <section key={section.title} aria-labelledby={`section-${index}`} className="scroll-mt-6 rounded-2xl border border-forest-950/10 bg-white p-5 shadow-sm sm:p-7">
                                <h2 id={`section-${index}`} className="text-xl font-bold text-forest-950 sm:text-2xl"><span className="mr-2 text-forest-500">{String(index + 1).padStart(2, '0')}</span> {section.title}</h2>
                                <div className="mt-4 space-y-3 text-base leading-7 text-stone-700">{section.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
                                {section.items && <ul className="mt-4 space-y-2 pl-5 text-base leading-7 text-stone-700 marker:text-forest-600">{section.items.map((item) => <li key={item} className="list-disc pl-1">{item}</li>)}</ul>}
                            </section>
                        ))}
                    </div>
                </div>
            </article>
        </GuestLayout>
    );
}
