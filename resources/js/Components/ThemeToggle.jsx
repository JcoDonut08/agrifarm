import { useEffect, useState } from 'react';

const storageKey = 'agrifarm-theme';

export default function ThemeToggle({ inverted = false, settings = false }) {
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const syncTheme = (event) => {
            if (event.key === storageKey && event.newValue) {
                applyTheme(event.newValue === 'dark');
                setDark(event.newValue === 'dark');
            }
        };

        window.addEventListener('storage', syncTheme);

        return () => window.removeEventListener('storage', syncTheme);
    }, []);

    function setTheme(nextDark) {
        applyTheme(nextDark);
        try { localStorage.setItem(storageKey, nextDark ? 'dark' : 'light'); } catch { /* Keep the current session usable without storage. */ }
        setDark(nextDark);
    }

    if (settings) return (
        <fieldset className="appearance-settings">
            <legend>Appearance</legend>
            <p>Choose how AgriFarm looks on this device.</p>
            <div className="appearance-options">
                <button type="button" aria-pressed={!dark} onClick={() => setTheme(false)}><SunIcon />Light</button>
                <button type="button" aria-pressed={dark} onClick={() => setTheme(true)}><MoonIcon />Dark</button>
            </div>
        </fieldset>
    );

    return (
        <button
            type="button"
            onClick={() => setTheme(!dark)}
            aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
            title={`Switch to ${dark ? 'light' : 'dark'} mode`}
            aria-pressed={dark}
            className={`grid size-10 shrink-0 place-items-center rounded-xl border transition ${inverted ? 'border-white/25 bg-white/10 text-white hover:bg-white/20' : 'border-forest-950/10 text-forest-800 hover:bg-forest-50 dark:border-white/15 dark:text-harvest-400 dark:hover:bg-white/10'}`}
        >
            {dark ? <SunIcon /> : <MoonIcon />}
        </button>
    );
}

function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';

    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101210' : '#0c542d');
}

function SunIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" />
        </svg>
    );
}
