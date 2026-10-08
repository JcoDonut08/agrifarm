import { useEffect, useState } from 'react';

// Slice the displayed records only. Totals and downloads use the original data.
export default function useTablePagination(items, resetKey = '') {
    const [requestedPage, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const page = Math.min(requestedPage, totalPages);

    useEffect(() => { setPage(1); }, [resetKey]);
    useEffect(() => {
        if (requestedPage > totalPages) setPage(totalPages);
    }, [requestedPage, totalPages]);

    return {
        page, pageSize, setPage, setPageSize,
        visibleItems: items.slice((page - 1) * pageSize, page * pageSize),
    };
}
