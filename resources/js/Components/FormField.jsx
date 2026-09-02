export default function FormField({
    id,
    label,
    error,
    hint,
    className = '',
    ...inputProps
}) {
    const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

    return (
        <div className={className}>
            <label htmlFor={id} className="block text-sm font-medium text-stone-800">
                {label}
            </label>
            <input
                id={id}
                name={id}
                aria-describedby={describedBy}
                aria-invalid={Boolean(error)}
                className={`mt-2 block min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-700/20 ${
                    error ? 'border-red-500 focus:border-red-600' : 'border-stone-300 focus:border-emerald-700'
                }`}
                {...inputProps}
            />
            {hint && !error && (
                <p id={`${id}-hint`} className="mt-1.5 text-sm leading-5 text-stone-500">
                    {hint}
                </p>
            )}
            {error && (
                <p id={`${id}-error`} className="mt-1.5 text-sm leading-5 text-red-700" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
