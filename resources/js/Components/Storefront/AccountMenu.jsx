import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import ThemeToggle from '../ThemeToggle';

export default function AccountMenu({ user, destination, onFavorites, onOpen }) {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState(false);
    const container = useRef(null);
    const trigger = useRef(null);

    useEffect(() => {
        if (!open) return;

        function dismissOutside(event) {
            if (!container.current?.contains(event.target)) setOpen(false);
        }

        function dismissOnEscape(event) {
            if (event.key === 'Escape') {
                setOpen(false);
                trigger.current?.focus();
            }
        }

        document.addEventListener('pointerdown', dismissOutside);
        document.addEventListener('keydown', dismissOnEscape);
        return () => {
            document.removeEventListener('pointerdown', dismissOutside);
            document.removeEventListener('keydown', dismissOnEscape);
        };
    }, [open]);

    return (
        <div ref={container} className="account-menu" onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}>
            <button
                ref={trigger}
                type="button"
                className={`account-trigger ${open ? 'is-open' : ''}`}
                aria-label="Open account menu"
                aria-expanded={open}
                aria-controls="account-options"
                onClick={() => { setOpen(!open); onOpen?.(); }}
            >
                <AccountAvatar user={user} />
            </button>
            {open && (
                <div id="account-options" className="account-dropdown" role="region" aria-label="Account options">
                    <div className="account-identity">
                        <AccountAvatar user={user} />
                        <div><strong>{user?.name || 'Your account'}</strong><span>{user?.email || 'Welcome to AgriFarm'}</span></div>
                    </div>
                    <div className="account-links">
                        <Link href={destination} onClick={() => setOpen(false)}>
                            <Icon name="user" />{!user ? 'Log in' : user.role === 'customer' ? 'My profile' : 'My workspace'}<Icon name="arrow" size={16} />
                        </Link>
                        <button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); onFavorites(); }}>
                            <Icon name="heart" />Saved favorites
                        </button>
                        <button type="button" aria-expanded={settings} aria-controls="profile-settings" onClick={() => setSettings(!settings)}>
                            <Icon name="settings" />Settings<Icon name="chevron" size={16} />
                        </button>
                    </div>
                    {settings && <div id="profile-settings"><ThemeToggle settings /></div>}
                    {user && <Link href="/logout" method="post" as="button" className="account-signout">
                        <Icon name="logout" />Sign out
                    </Link>}
                </div>
            )}
        </div>
    );
}

function AccountAvatar({ user }) {
    const photo = user?.avatar_url || user?.profile_photo_url || user?.avatar;
    const [failedPhoto, setFailedPhoto] = useState(null);
    const initials = (user?.name || 'Account').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    const hasPhoto = typeof photo === 'string' && /^(https?:\/\/|\/)/.test(photo) && photo !== failedPhoto;

    return (
        <span className="account-avatar">
            {hasPhoto
                ? <img src={photo} alt={`${user.name}'s profile`} referrerPolicy="no-referrer" onError={() => setFailedPhoto(photo)} />
                : user ? <span aria-hidden="true">{initials}</span> : <Icon name="user" size={20} />}
        </span>
    );
}
