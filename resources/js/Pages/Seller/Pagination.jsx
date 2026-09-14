import Icon from '../../Components/Storefront/Icon';
import '../../../css/seller-pagination.css';

export default function Pagination({ page, pageSize, totalItems, onPageChange, label = 'Pagination', itemLabel = 'items', filipino = false, className = '' }) {
    if (!totalItems) return null;

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const firstItem = ((currentPage - 1) * pageSize) + 1;
    const lastItem = Math.min(currentPage * pageSize, totalItems);

    return <nav className={`seller-pagination ${className}`.trim()} aria-label={label}>
        <p>{filipino ? `Ipinapakita ang ${firstItem}–${lastItem} sa ${totalItems} ${itemLabel}` : `Showing ${firstItem}–${lastItem} of ${totalItems} ${itemLabel}`}</p>
        <div className="seller-pagination__controls">
            <button type="button" className="seller-pagination__previous" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label={filipino ? 'Nakaraang pahina' : 'Previous page'}>
                <Icon name="chevron" size={16} />
                <span>{filipino ? 'Nakaraan' : 'Previous'}</span>
            </button>
            <strong aria-live="polite">{filipino ? `Pahina ${currentPage} sa ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</strong>
            <button type="button" className="seller-pagination__next" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label={filipino ? 'Susunod na pahina' : 'Next page'}>
                <span>{filipino ? 'Susunod' : 'Next'}</span>
                <Icon name="chevron" size={16} />
            </button>
        </div>
    </nav>;
}
