export default function GoogleAuthButton({ href, onClick, error }) {
    const className = 'inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-800 shadow-sm transition hover:border-forest-300 hover:bg-forest-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2';

    return (
        <div className="mt-5">
            <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400" aria-hidden="true">
                <span className="h-px flex-1 bg-stone-200" />
                <span>or</span>
                <span className="h-px flex-1 bg-stone-200" />
            </div>

            {href
                ? <a href={href} className={className}><GoogleIcon />Continue with Google</a>
                : <button type="button" onClick={onClick} className={className}><GoogleIcon />Continue with Google</button>}

            {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 18 18" className="size-[1.15rem] shrink-0">
            <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.614Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.715H.956v2.332A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.963 10.705A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.281-1.705V4.963H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.037l3.007-2.332Z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.58C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.963l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
        </svg>
    );
}
