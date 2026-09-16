import { Link } from '@inertiajs/react';

import GuestLayout from './GuestLayout';

export default function AuthLayout({ eyebrow, title, description, children, wide = false }) {
    return (
        <GuestLayout authPage>
            <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
                <div className={`w-full overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/95 p-5 shadow-[0_28px_80px_-30px_rgba(5,44,25,0.65)] backdrop-blur-sm dark:border-white/15 dark:bg-night-950/95 sm:p-8 ${wide ? 'max-w-[35rem]' : 'max-w-[30rem]'}`}>
                    <div className="text-center">
                        {eyebrow && <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-forest-700 dark:text-forest-300">{eyebrow}</p>}
                        <h1 className="auth-title mt-2 text-[1.8rem] font-semibold leading-[1.12] tracking-[-0.025em] text-forest-950 dark:text-white sm:text-[2.15rem]">{title}</h1>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600 dark:text-stone-300">{description}</p>
                    </div>
                    <div className="mt-6">{children}</div>
                </div>

                <Link href="/" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white transition hover:bg-white/15">
                    <span aria-hidden="true">←</span>
                    Back to homepage
                </Link>
            </section>
        </GuestLayout>
    );
}
