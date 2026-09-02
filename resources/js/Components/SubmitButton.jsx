export default function SubmitButton({ processing = false, children, className = '', ...props }) {
    return (
        <button
            type="submit"
            disabled={processing}
            className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
