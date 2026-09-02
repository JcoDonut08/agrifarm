import { Link } from '@inertiajs/react';

export default function AppMark({ href = '/', compact = false }) {
    return (
        <Link href={href} className="inline-flex min-w-0 items-center gap-3 rounded-lg">
            <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-800 text-sm font-bold text-white"
            >
                AF
            </span>
            <span className="min-w-0">
                <span className="block font-semibold tracking-tight text-emerald-950">AgriFarm</span>
                {!compact && (
                    <span className="hidden truncate text-xs text-stone-500 sm:block">
                        Agricultural marketplace and decision support
                    </span>
                )}
            </span>
        </Link>
    );
}
