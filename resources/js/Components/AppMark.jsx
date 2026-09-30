import { Link } from '@inertiajs/react';

export default function AppMark({ href = '/', compact = false, inverted = false, storefront = false }) {
    if (storefront) return <Link href={href} className="store-brand" aria-label="AgriFarm home"><img src="/images/logo.png" alt="" aria-hidden="true" width="42" height="42" style={{ borderRadius: '50%', objectFit: 'cover' }} /><span>AgriFarm</span></Link>;

    return (
        <Link href={href} className="group inline-flex min-w-0 items-center gap-3 rounded-xl" aria-label="AgriFarm home">
            <span
                aria-hidden="true"
                className={`grid size-12 shrink-0 place-items-center rounded-[1.1rem] shadow-lg ring-2 overflow-hidden transition ${inverted ? 'bg-white ring-harvest-400/80 group-hover:bg-cream-50' : 'bg-forest-800 ring-forest-100 group-hover:bg-forest-900 dark:ring-forest-700'}`}
            >
                <img src="/images/logo.png" alt="" className="size-full object-cover" />
            </span>
            <span className="min-w-0">
                <span className={`block text-base font-bold tracking-tight ${inverted ? 'text-white' : 'text-forest-950 dark:text-white'}`}>AgriFarm</span>
                {!compact && (
                    <span className={`hidden truncate text-xs font-medium sm:block ${inverted ? 'text-white/85' : 'text-stone-500 dark:text-stone-300'}`}>
                        Fresh from local growers
                    </span>
                )}
            </span>
        </Link>
    );
}