export default function SubmitButton({ processing = false, children, className = '', ...props }) {
    return (
        <button
            type="submit"
            disabled={processing}
            className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-forest-700 px-4 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-10px_rgba(12,84,45,0.9)] ring-1 ring-forest-800/10 transition hover:bg-forest-800 hover:shadow-[0_12px_24px_-12px_rgba(12,84,45,1)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
