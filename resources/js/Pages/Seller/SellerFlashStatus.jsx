import { useEffect, useState } from 'react';
import { localizeMessage } from './SellerLocale';

export default function SellerFlashStatus({ flash, filipino = false }) {
    const [visible, setVisible] = useState(Boolean(flash?.status));

    useEffect(() => {
        if (!flash?.status) { setVisible(false); return; }
        setVisible(true);
        const timeout = window.setTimeout(() => setVisible(false), 3000);
        return () => window.clearTimeout(timeout);
    }, [flash?.status, flash?.id]);

    return visible ? <p className="seller-save-status" role="status">{localizeMessage(flash.status, filipino)}</p> : null;
}
