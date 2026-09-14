import { useState } from 'react';

import FormField from './FormField';

export default function PasswordField({ id = 'password', label = 'Password', showLabel = 'Show', hideLabel = 'Hide', ...props }) {
    const [visible, setVisible] = useState(false);

    return (
        <FormField
            id={id}
            label={label}
            type={visible ? 'text' : 'password'}
            startAdornment={<LockIcon />}
            endAdornment={(
                <button
                    type="button"
                    onClick={() => setVisible((value) => !value)}
                    className="grid size-10 place-items-center rounded-lg text-stone-500 transition hover:bg-forest-50 hover:text-forest-700 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-forest-300"
                    aria-label={`${visible ? hideLabel : showLabel} ${label.toLowerCase()}`}
                    aria-pressed={visible}
                >
                    {visible ? <EyeOffIcon /> : <EyeIcon />}
                </button>
            )}
            {...props}
        />
    );
}

function LockIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2.5 12s3.4-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.4 5.5-9.5 5.5S2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="2.6" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="m4 4 16 16" />
            <path d="M10.6 6.6c.5-.1.9-.1 1.4-.1 6.1 0 9.5 5.5 9.5 5.5a16.7 16.7 0 0 1-2.8 3.5M6.1 7.6C3.8 9.2 2.5 12 2.5 12s3.4 5.5 9.5 5.5c1.2 0 2.3-.2 3.3-.6" />
            <path d="M10.1 10.1a2.7 2.7 0 0 0 3.8 3.8" />
        </svg>
    );
}
