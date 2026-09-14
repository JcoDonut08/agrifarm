import { useEffect, useRef, useState } from 'react';
import Icon from '../../Components/Storefront/Icon';
import ThemeToggle from '../../Components/ThemeToggle';

export default function NavbarControls({ alerts = [], filipino = false }) {
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
            <button ref={trigger} className="seller-icon-button" aria-label={filipino ? 'Mga abiso' : 'Notifications'} aria-expanded={open} aria-controls="seller-notification-panel" onClick={() => setOpen(!open)}>
                <Icon name="bell" />
                {alerts.length > 0 && <span className="seller-notification-count">{alerts.length}</span>}
            </button>
            {open && <section id="seller-notification-panel" className="seller-notification-panel" aria-label={filipino ? 'Mga abiso' : 'Notifications'}>
                <div><h2>{filipino ? 'Mga Abiso' : 'Notifications'}</h2><button className="seller-icon-button" aria-label={filipino ? 'Isara ang mga abiso' : 'Close notifications'} onClick={() => { setOpen(false); trigger.current?.focus(); }}><Icon name="close" /></button></div>
                {alerts.length ? <ul className="seller-notification-list">{alerts.map((alert, index) => <li key={`${alert.title}-${index}`}>
                    <span><Icon name={alert.icon} size={19} /></span><div><strong>{alert.title}</strong><p>{alert.detail}</p></div>
                </li>)}</ul> : <><Icon name="bell" size={30} /><strong>{filipino ? 'Wala pang abiso' : 'No notifications yet'}</strong><p>{filipino ? 'Dito lalabas ang mga abiso tungkol sa order, stock, at panahon.' : 'Order, stock, and weather alerts will appear here.'}</p></>}
            </section>}
        </div>
        <ThemeToggle labels={filipino ? { switchToLight: 'Lumipat sa maliwanag na tema', switchToDark: 'Lumipat sa madilim na tema' } : undefined} />
    </>;
}
