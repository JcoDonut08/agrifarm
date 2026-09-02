export default function FormField({
    id,
    label,
    error,
    hint,
    className = '',
    inputClassName = '',
    startAdornment,
    endAdornment,
    ...inputProps
}) {
    const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
    const leadingIcon = startAdornment ?? defaultIcon(id, inputProps.type);

    return (
        <div className={className}>
            <label htmlFor={id} className="block text-sm font-medium text-stone-800">
                {label}
            </label>
            <div className="relative mt-2">
                <input
                    id={id}
                    name={id}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(error)}
                    className={`block min-h-12 w-full rounded-xl border bg-cream-50 px-3.5 py-2.5 text-base text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 read-only:bg-stone-50 read-only:text-stone-600 focus:bg-white focus:ring-4 focus:ring-harvest-400/30 ${
                        leadingIcon ? 'pl-11' : ''
                    } ${endAdornment ? 'pr-12' : ''} ${error ? 'border-red-500 focus:border-red-600' : 'border-forest-200 focus:border-forest-600'} ${inputClassName}`}
                    {...inputProps}
                />
                {leadingIcon && <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-forest-600">{leadingIcon}</div>}
                {endAdornment && <div className="absolute inset-y-0 right-1 flex items-center">{endAdornment}</div>}
            </div>
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

function defaultIcon(id, type) {
    if (type === 'email') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
            </svg>
        );
    }

    if (id === 'name') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
            </svg>
        );
    }

    return null;
}
