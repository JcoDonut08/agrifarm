import GuestLayout from './GuestLayout';

export default function AuthLayout({ eyebrow, title, description, asideTitle, asideItems = [], children }) {
    return (
        <GuestLayout>
            <section className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.82fr)] lg:items-start lg:gap-12 lg:px-8 lg:py-20">
                <div className="pt-2 lg:pt-8">
                    {eyebrow && <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>}
                    <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">{title}</h1>
                    <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">{description}</p>

                    {asideItems.length > 0 && (
                        <div className="mt-8 border-t border-emerald-950/10 pt-6">
                            <h2 className="text-sm font-semibold text-emerald-950">{asideTitle}</h2>
                            <ul className="mt-4 grid gap-3 text-sm leading-6 text-stone-600 sm:grid-cols-2 lg:grid-cols-1">
                                {asideItems.map((item) => (
                                    <li key={item} className="flex gap-3">
                                        <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-700" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="border border-emerald-950/10 bg-white p-5 shadow-sm sm:p-7 lg:p-8">{children}</div>
            </section>
        </GuestLayout>
    );
}
