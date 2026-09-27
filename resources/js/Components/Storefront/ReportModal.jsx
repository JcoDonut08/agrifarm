import { useState } from 'react';
import Icon from './Icon';

export default function ReportModal({ product, onClose }) {
    const [data, setData] = useState({
        product_name: product?.name || '',
        seller_name: product?.sellerName || '',
        barangay: product?.barangay || '',
        type: '',
        description: '',
    });
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    async function submit(e) {
        e.preventDefault();
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
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to submit report');
            }

            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    }

    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity" onMouseDown={onClose}>
                <div className="bg-[var(--store-bg)] border border-[var(--store-border)] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl transform scale-100 transition-all text-center animate-modal-pop" onMouseDown={(e) => e.stopPropagation()}>
                    
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[var(--store-soft)] mb-6 border border-[#4caf50]/40">
                        <svg className="h-8 w-8 text-[var(--store-green)] checkmark-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="checkmark-path" />
                        </svg>
                    </div>
                    
                    <h3 className="text-xl font-bold text-[var(--store-ink)] mb-2">Success!</h3>
                    <p className="text-[var(--store-muted)] mb-8 font-medium">
                        Your report has been forwarded to CENRO for review.
                    </p>
                    
                    <button 
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 px-4 bg-[var(--store-green)] hover:bg-[var(--store-green-dark)] text-white rounded-lg font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-backdrop" onMouseDown={onClose}>
            <div className="modal-container" onMouseDown={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>Report Issue</h2>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                        <Icon name="x" size={20} />
                    </button>
                </header>

                <form onSubmit={submit} className="modal-body">
                    <p className="report-intro">
                        Please provide details about the issue you encountered with <strong>{product?.name || 'this seller'}</strong>.
                        Your report will be forwarded directly to the CENRO admin for review.
                    </p>

                    {error && <div className="form-error" style={{ marginBottom: '16px', color: '#a14436', background: '#fbe7e5', padding: '10px', borderRadius: '6px' }}>{error}</div>}

                    <label className="form-field">
                        <span>Reason for reporting</span>
                        <select
                            value={data.type}
                            onChange={(e) => setData({...data, type: e.target.value})}
                            required
                        >
                            <option value="" disabled>Select an issue...</option>
                            <option value="Product quality issue">Product quality issue</option>
                            <option value="Inaccurate product description">Inaccurate product description</option>
                            <option value="Unresponsive seller">Unresponsive seller</option>
                            <option value="Inappropriate content">Inappropriate content</option>
                            <option value="Other">Other</option>
                        </select>
                    </label>

                    <label className="form-field">
                        <span>Description</span>
                        <textarea
                            value={data.description}
                            onChange={(e) => setData({...data, description: e.target.value})}
                            placeholder="Please explain what happened in detail..."
                            rows="4"
                            required
                        ></textarea>
                    </label>

                    <div className="form-actions">
                        <button type="button" className="store-button store-button--ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="store-button" disabled={processing}>
                            {processing ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}