import { usePage } from '@inertiajs/react';
import PageSkeleton from './PageSkeleton';
import usePageLoading from './usePageLoading';

export default function PageLoadingBoundary({ children, workspace = false, variant }) {
    const { url } = usePage();
    const current = new URL(url, window.location.origin);
    const visit = usePageLoading(next => {
        if (next.only.length === 1 && next.only[0] === 'weather') return false;
        const destination = next.url;
        // Marketplace filters keep their controls visible and load just the product grid.
        return !(current.pathname === '/' && current.searchParams.get('page') === 'marketplace'
            && destination.pathname === '/' && destination.searchParams.get('page') === 'marketplace');
    });
    const destination = visit?.url;
    const page = destination?.searchParams.get('page');
    const skeletonVariant = variant || (destination?.pathname.startsWith('/seller/') || destination?.pathname.startsWith('/admin/') ? 'dashboard'
        : ['marketplace', 'favorites'].includes(page) ? 'products'
        : destination?.pathname.startsWith('/customer') || /login|register|password/.test(destination?.pathname || '') ? 'form' : 'content');

    return <div className="page-loading-boundary" aria-busy={Boolean(visit)}>
        {visit && <PageSkeleton variant={skeletonVariant} compact={workspace} />}
        <div className="page-loading-content" hidden={Boolean(visit)}>{children}</div>
    </div>;
}
