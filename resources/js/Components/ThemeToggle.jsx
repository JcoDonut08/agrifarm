import { useEffect, useState } from 'react';

const storageKey = 'agrifarm-theme';
const allowedThemes = ['light', 'dark', 'system'];

function savedTheme() {
    try {
        const saved = localStorage.getItem(storageKey);
        return allowedThemes.includes(saved) ? saved : 'system';
    } catch {
        return 'system';
    }
}

export default function ThemeToggle({ inverted = false, settings = false, systemOption = false, labels = {} }) {
    const [preference, setPreference] = useState(savedTheme);
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const syncSystemTheme = () => {
            if (savedTheme() !== 'system') return;
            applyTheme(media.matches);
            setDark(media.matches);
        };
        const syncTheme = (event) => {
            if (event.key !== storageKey) return;
            const next = allowedThemes.includes(event.newValue) ? event.newValue : 'system';
            const nextDark = next === 'dark' || (next === 'system' && media.matches);
            applyTheme(nextDark);
            setPreference(next);
            setDark(nextDark);
        };

        media.addEventListener('change', syncSystemTheme);
        window.addEventListener('storage', syncTheme);

        return () => {
            media.removeEventListener('change', syncSystemTheme);
            window.removeEventListener('storage', syncTheme);
        };
    }, []);

    function setTheme(nextPreference) {
        const nextDark = nextPreference === 'dark'
            || (nextPreference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        applyTheme(nextDark);
        try { localStorage.setItem(storageKey, nextPreference); } catch { /* Keep the current session usable without storage. */ }
        setPreference(nextPreference);
        setDark(nextDark);
    }

    if (settings) return (
        <fieldset className="appearance-settings">
            <legend>{labels.title || 'Appearance'}</legend>
            <p>{labels.description || 'Choose how AgriFarm looks on this device.'}</p>
            <div className="appearance-options">
                <button type="button" aria-pressed={preference === 'light'} onClick={() => setTheme('light')}><SunIcon />{labels.light || 'Light'}</button>
                <button type="button" aria-pressed={preference === 'dark'} onClick={() => setTheme('dark')}><MoonIcon />{labels.dark || 'Dark'}</button>
                {systemOption && <button type="button" aria-pressed={preference === 'system'} onClick={() => setTheme('system')}><SystemIcon />{labels.system || 'System'}</button>}
            </div>
        </fieldset>
    );

    const switchLabel = dark
        ? (labels.switchToLight || 'Switch to light mode')
        : (labels.switchToDark || 'Switch to dark mode');

    return (
        <button
            type="button"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            aria-label={switchLabel}
            title={switchLabel}
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

function SystemIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="M8 22h8M12 18v4" />
        </svg>
    );
}
