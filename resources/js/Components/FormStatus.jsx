import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import Icon from './Storefront/Icon';

// Flash IDs belong to an action, even when a dashboard section remounts.
const shownFlashIds = new Set();

const statusLabels = {
    'Profile photo updated successfully.': 'Profile photo updated.',
    'Profile updated successfully.': 'Profile saved.',
    'Password updated successfully.': 'Password updated.',
    'Harvest record updated successfully.': 'Harvest record updated.',
    'Product added successfully.': 'Product added.',
    'Product updated successfully.': 'Product updated.',
    'Matagumpay na naidagdag ang produkto.': 'Naidagdag ang produkto.',
    'Matagumpay na na-update ang produkto.': 'Na-update ang produkto.',
};

function statusLabel(message) {
    if (typeof message !== 'string') return message;
    if (message.startsWith('Harvest recorded successfully.')) return 'Harvest recorded.';
    if (/^Harvest record for .+ deleted successfully\.$/.test(message)) return 'Harvest record deleted.';
    return statusLabels[message] || message;
}

export default function FormStatus({ children, dismissible = false, messageId, dismissLabel = 'Dismiss message', onDismiss, action, tone = 'success', duration = 6000 }) {
    const [dismissedId, setDismissedId] = useState(null);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [ownedId, setOwnedId] = useState(null);
    const element = useRef(null);
    const paused = hovered || focused;
    const currentId = messageId || children;
    const scope = typeof window === 'undefined' ? '' : window.location.pathname + window.location.search;
    const previous = useRef({ id: currentId, scope });
    const leavingScope = previous.current.scope !== scope && previous.current.id === currentId;
    const replayed = dismissible && typeof messageId === 'string' && shownFlashIds.has(messageId) && ownedId !== currentId;
    const dismiss = () => { setDismissedId(currentId); onDismiss?.(); };

    useEffect(() => {
        if (!children || !dismissible || replayed || ownedId === currentId) return;
        if (typeof messageId === 'string') {
            shownFlashIds.add(messageId);
            if (shownFlashIds.size > 128) shownFlashIds.delete(shownFlashIds.values().next().value);
        }
        setOwnedId(currentId);
    }, [children, currentId, dismissible, messageId, ownedId, replayed]);

    useEffect(() => {
        if (leavingScope && dismissible) dismiss();
        previous.current = { id: currentId, scope };
    }, [currentId, scope]);

    useEffect(() => {
        if (!children || !dismissible || replayed || dismissedId === currentId) return;
        const stopListening = router.on('start', dismiss);
        const leaveTab = () => { if (document.hidden && tone === 'success') dismiss(); };
        document.addEventListener('visibilitychange', leaveTab);
        window.addEventListener('popstate', dismiss);
        leaveTab();
        return () => {
            stopListening();
            document.removeEventListener('visibilitychange', leaveTab);
            window.removeEventListener('popstate', dismiss);
        };
    }, [children, currentId, dismissible, dismissedId, onDismiss, replayed, tone]);

    useEffect(() => {
        setHovered(Boolean(element.current?.matches(':hover')));
        setFocused(Boolean(element.current?.contains(document.activeElement)));
    }, [currentId]);

    useEffect(() => {
        if (!children || !dismissible || tone !== 'success' || !duration || paused || replayed || dismissedId === currentId) return;
        const timer = window.setTimeout(() => { setDismissedId(currentId); onDismiss?.(); }, duration);
        return () => window.clearTimeout(timer);
    }, [children, currentId, dismissedId, dismissible, duration, paused, replayed, tone, onDismiss]);

    if (!children || (dismissible && (dismissedId === currentId || leavingScope || replayed))) {
        return null;
    }

    const status = (
        <div ref={element} className={`app-form-status${dismissible ? ' app-form-status--toast' : ''}${tone === 'error' ? ' app-form-status--error' : ''}`}
            role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'} aria-atomic="true"
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
            <span className="app-status-icon" aria-hidden="true"><Icon name={tone === 'error' ? 'close' : 'check'} size={18} /></span>
            <span>{statusLabel(children)}</span>
            {action && <div className="app-status-action">{action}</div>}
            {dismissible && <button type="button" className="app-status-dismiss" aria-label={dismissLabel} onClick={dismiss}><Icon name="close" size={18} /></button>}
        </div>
    );
    return dismissible ? createPortal(status, document.body) : status;
}
