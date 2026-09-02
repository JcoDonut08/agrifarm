import { Link } from '@inertiajs/react';

export default function AppMark({ href = '/', compact = false, inverted = false }) {
    return (
        <Link href={href} className="group inline-flex min-w-0 items-center gap-3 rounded-xl" aria-label="AgriFarm home">
            <span
                aria-hidden="true"
                className={`grid size-12 shrink-0 place-items-center rounded-[1.1rem] shadow-lg ring-2 transition ${inverted ? 'bg-white ring-harvest-400/80 group-hover:bg-cream-50' : 'bg-forest-800 ring-forest-100 group-hover:bg-forest-900'}`}
            >
                <svg viewBox="0 0 36 36" className="size-8" fill="none">
                    <circle cx="26.5" cy="9.5" r="4" fill="#ffba2f" />
                    <path d="M18 28V15" stroke="#fffdf5" strokeWidth="2.6" strokeLinecap="round" />
                    <path d="M18 18c-6.2.1-9.6-3-10-8.8 5.9-.2 9.6 2.8 10 8.8Z" fill="#83d78f" />
                    <path d="M18 15c6.4.1 9.9-3.1 10.3-9.1-6.1-.2-9.9 2.9-10.3 9.1Z" fill="#d9f5dc" />
                    <path d="M8 28c2.7-3.2 6-4.8 10-4.8s7.3 1.6 10 4.8" stroke="#f47b58" strokeWidth="3" strokeLinecap="round" />
                    <path d="M9 30h18" stroke="#fffdf5" strokeWidth="2.3" strokeLinecap="round" />
                </svg>
            </span>
            <span className="min-w-0">
                <span className={`block text-base font-bold tracking-tight ${inverted ? 'text-white' : 'text-forest-950'}`}>AgriFarm</span>
                {!compact && (
                    <span className={`hidden truncate text-xs font-medium sm:block ${inverted ? 'text-white/85' : 'text-stone-500'}`}>
                        Fresh from local growers
                    </span>
                )}
            </span>
        </Link>
    );
}
