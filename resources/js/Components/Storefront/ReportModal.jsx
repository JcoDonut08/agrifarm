import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useShop } from './ShopContext';

export default function ReportModal({ product, onClose }) {
    const { notify, filipino } = useShop();
    const [data, setData] = useState({
        product_id: product?.id && typeof product.id === 'string' && product.id.startsWith('seller-') ? parseInt(product.id.replace('seller-', ''), 10) : (typeof product?.id === 'number' ? product.id : null),
        product_name: product?.name || '',
        seller_name: product?.sellerName || '',
        barangay: product?.barangay || '',
        type: '',
        description: '',
    });
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const dialog = useRef(null);

    useEffect(() => {
        const element = dialog.current;
        const overflow = document.body.style.overflow;
        element.showModal();
        document.body.style.overflow = 'hidden';
        return () => { element.close(); document.body.style.overflow = overflow; };
    }, []);
    useEffect(() => {
        const invalid = dialog.current?.querySelector('[aria-invalid="true"]');
        invalid?.focus();
    }, [errors]);

    async function submit(e) {
        e.preventDefault();
        if (processing) return;
        const validation = {};
        if (!data.type) validation.type = filipino ? 'Pumili ng dahilan.' : 'Choose a reason.';
        if (!data.description.trim()) validation.description = filipino ? 'Ipaliwanag ang nangyari.' : 'Describe what happened.';
        setErrors(validation);
        if (Object.keys(validation).length) return;
        setProcessing(true);
        setError('');

        try {
            const getXsrfToken = () => {
                const match = document.cookie.match(new RegExp('(^|;\\s*)(XSRF-TOKEN)=([^;]*)'));
                return match ? decodeURIComponent(match[3]) : '';
            };

            const res = await fetch('/customer/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': getXsrfToken()
                },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                if (errData.errors) {
                    setErrors(Object.fromEntries(Object.entries(errData.errors).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages])));
                    return;
                }
                throw new Error('report-failed');
            }

            notify(filipino ? 'Naipadala ang report sa CENRO para sa pagsusuri.' : 'Report sent to CENRO for review.');
            onClose();
        } catch (err) {
            setError(filipino ? 'Hindi maipadala ang report. Pakisubukan muli.' : 'The report could not be sent. Please try again.');
        } finally {
            setProcessing(false);
        }
    }

    return (
        <dialog ref={dialog} className="modal-container report-dialog" aria-labelledby="report-issue-title" aria-busy={processing}
            onCancel={event => { event.preventDefault(); if (!processing) onClose(); }}
            onClick={event => {
                if (processing || event.target !== dialog.current) return;
                const bounds = dialog.current.getBoundingClientRect();
                if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
            }}>
                <header className="modal-header">
                    <h2 id="report-issue-title">{filipino ? 'I-report ang problema' : 'Report an issue'}</h2>
                    <button type="button" className="modal-close" disabled={processing} onClick={onClose} aria-label={filipino ? 'Isara' : 'Close'}>
                        <Icon name="close" size={20} />
                    </button>
                </header>

                <form onSubmit={submit} className="modal-body" noValidate>
                    <p className="report-intro">
                        {filipino ? 'Ilarawan ang problema sa ' : 'Describe the issue with '}<strong>{product?.name || (filipino ? 'seller na ito' : 'this seller')}</strong>.
                        {filipino ? ' Susuriin ng CENRO ang iyong report.' : ' CENRO will review your report.'}
                    </p>

                    {error && <p role="alert" className="app-field-error">{error}</p>}

                    <label className="form-field">
                        <span>{filipino ? 'Dahilan ng report' : 'Reason for reporting'}</span>
                        <select
                            id="report-type" aria-label={filipino ? 'Dahilan ng report' : 'Reason for reporting'} disabled={processing} aria-invalid={Boolean(errors.type)} aria-describedby={errors.type ? 'report-type-error' : undefined}
                            value={data.type}
                            onChange={(e) => { setData({...data, type: e.target.value}); setErrors(current => ({ ...current, type: null })); }}
                            required
                        >
                            <option value="" disabled>{filipino ? 'Pumili ng problema' : 'Select an issue'}</option>
                            <option value="Product quality issue">{filipino ? 'Problema sa kalidad ng produkto' : 'Product quality issue'}</option>
                            <option value="Inaccurate product description">{filipino ? 'Maling paglalarawan ng produkto' : 'Inaccurate product description'}</option>
                            <option value="Unresponsive seller">{filipino ? 'Hindi sumasagot ang seller' : 'Unresponsive seller'}</option>
                            <option value="Inappropriate content">{filipino ? 'Hindi angkop na nilalaman' : 'Inappropriate content'}</option>
                            <option value="Other">{filipino ? 'Ibang dahilan' : 'Other'}</option>
                        </select>
                    </label>
                    {errors.type && <p id="report-type-error" role="alert" className="app-field-error">{errors.type}</p>}

                    <label className="form-field">
                        <span>{filipino ? 'Paglalarawan' : 'Description'}</span>
                        <textarea
                            id="report-description" maxLength={1000} disabled={processing} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'report-description-error' : undefined}
                            value={data.description}
                            onChange={(e) => { setData({...data, description: e.target.value}); setErrors(current => ({ ...current, description: null })); }}
                            placeholder={filipino ? 'Ipaliwanag ang nangyari' : 'Explain what happened'}
                            rows="4"
                            required
                        ></textarea>
                    </label>
                    {errors.description && <p id="report-description-error" role="alert" className="app-field-error">{errors.description}</p>}

                    <div className="form-actions">
                        <button type="button" className="store-button store-button--ghost" disabled={processing} onClick={onClose}>{filipino ? 'Kanselahin' : 'Cancel'}</button>
                        <button type="submit" className="store-button" disabled={processing}>
                            {processing ? (filipino ? 'Ipinapadala…' : 'Sending…') : (filipino ? 'Ipadala ang report' : 'Submit report')}
                        </button>
                    </div>
                </form>
        </dialog>
    );
}
