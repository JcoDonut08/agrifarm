import { useEffect, useId, useRef } from 'react';
import Icon from '../../Components/Storefront/Icon';

export default function ConfirmationDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    workingLabel,
    busy = false,
    icon = 'trash',
    onConfirm,
    onCancel,
}) {
    const dialog = useRef(null);
    const cancelButton = useRef(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const element = dialog.current;
        if (!element) return;

        if (!open) {
            if (element.open) element.close();
            return;
        }

        const previousOverflow = document.body.style.overflow;
        if (!element.open) element.showModal();
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => cancelButton.current?.focus());

        return () => {
            document.body.style.overflow = previousOverflow;
            if (element.open) element.close();
        };
    }, [open]);

    const dismiss = () => {
        if (!busy) onCancel();
    };

    return <dialog
        ref={dialog}
        className="seller-confirmation-dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={busy}
        onCancel={event => { event.preventDefault(); dismiss(); }}
        onClick={event => {
            if (event.target !== dialog.current) return;
            const bounds = dialog.current.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
        }}
    >
        <div className="seller-confirmation-content">
            <span className="seller-confirmation-icon"><Icon name={icon} size={25} /></span>
            <div>
                <h2 id={titleId}>{title}</h2>
                <p id={descriptionId}>{description}</p>
            </div>
        </div>
        <div className="seller-confirmation-actions">
            <button ref={cancelButton} type="button" className="seller-outline-button" disabled={busy} onClick={dismiss}>{cancelLabel}</button>
            <button type="button" className="seller-danger-button" disabled={busy} onClick={onConfirm}><Icon name={icon} size={17} />{busy ? workingLabel : confirmLabel}</button>
        </div>
    </dialog>;
}
