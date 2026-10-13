export function SkeletonBlock({ className = '', style }) {
    return <span aria-hidden="true" className={`skeleton-block ${className}`} style={style} />;
}

export function ProductGridSkeleton({ count = 8 }) {
    return <div className="market-product-grid skeleton-product-grid" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => <div className="skeleton-product-card" key={index}>
            <SkeletonBlock className="skeleton-product-photo" />
            <div className="skeleton-product-body">
                <SkeletonBlock className="skeleton-line skeleton-line--wide" />
                <SkeletonBlock className="skeleton-line skeleton-line--short" />
                <SkeletonBlock className="skeleton-price" />
                <SkeletonBlock className="skeleton-line skeleton-line--short" />
                <SkeletonBlock className="skeleton-button" />
            </div>
        </div>)}
    </div>;
}

export default function PageSkeleton({ variant = 'content', compact = false, label = 'Loading page…' }) {
    return <div className={`page-loading-skeleton ${compact ? 'page-loading-skeleton--compact' : ''}`} role="status">
        <span className="sr-only">{label}</span>
        <div aria-hidden="true">
            <div className="skeleton-heading">
                <SkeletonBlock className="skeleton-title" />
                <SkeletonBlock className="skeleton-line skeleton-line--wide" />
            </div>
            {variant === 'products' ? <>
                <SkeletonBlock className="skeleton-search" />
                <div className="skeleton-filters">{[1, 2, 3, 4].map(key => <SkeletonBlock className="skeleton-filter" key={key} />)}</div>
                <ProductGridSkeleton />
            </> : variant === 'form' ? <div className="skeleton-form">
                {[1, 2, 3].map(key => <div className="skeleton-field" key={key}><SkeletonBlock className="skeleton-line skeleton-line--short" /><SkeletonBlock className="skeleton-search" /></div>)}
                <SkeletonBlock className="skeleton-button" />
            </div> : variant === 'dashboard' || variant === 'forecast' ? <>
                <div className="skeleton-stat-grid">{[1, 2, 3].map(key => <div className="skeleton-panel" key={key}>
                    <SkeletonBlock className="skeleton-line skeleton-line--wide" /><SkeletonBlock className="skeleton-price" /><SkeletonBlock className="skeleton-line" />
                </div>)}</div>
                <div className="skeleton-panel skeleton-table">{[1, 2, 3, 4, 5].map(key => <div className="skeleton-table-row" key={key}>
                    <SkeletonBlock className="skeleton-line" /><SkeletonBlock className="skeleton-line" /><SkeletonBlock className="skeleton-line" />
                </div>)}</div>
            </> : <>
                <SkeletonBlock className="skeleton-banner" />
                <div className="skeleton-content-grid">{[1, 2].map(key => <div className="skeleton-panel" key={key}>
                    <SkeletonBlock className="skeleton-title" /><SkeletonBlock className="skeleton-line" /><SkeletonBlock className="skeleton-line" /><SkeletonBlock className="skeleton-line skeleton-line--wide" />
                </div>)}</div>
            </>}
        </div>
    </div>;
}
