import { useEffect, useRef, useState } from 'react';
import Icon from '../../Components/Storefront/Icon';
import ThemeToggle from '../../Components/ThemeToggle';

export default function NavbarControls() {
    const [open, setOpen] = useState(false);
    const container = useRef(null);
    const trigger = useRef(null);
    useEffect(() => {
        if (!open) return;
        const outside = event => { if (!container.current?.contains(event.target)) setOpen(false); };
        const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [open]);
    return <>
        <div className="seller-notifications" ref={container} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
            <button ref={trigger} className="seller-icon-button" aria-label="Notifications" aria-expanded={open} aria-controls="seller-notification-panel" onClick={() => setOpen(!open)}><Icon name="bell" /></button>
            {open && <section id="seller-notification-panel" className="seller-notification-panel" aria-label="Notifications"><div><h2>Notifications</h2><button className="seller-icon-button" aria-label="Close notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }}><Icon name="close" /></button></div><Icon name="bell" size={30} /><strong>No notifications yet</strong><p>Order and store alerts will appear here when notifications are available.</p></section>}
        </div>
        <ThemeToggle />
    </>;
}
