import { useState, useMemo, useEffect } from 'react';

import { Search, ChevronDown, CheckCircle2, ShieldAlert, BadgeCheck, Eye, Trash2, X, RefreshCw, MapPin, Store, Tag, Package } from 'lucide-react';

import { router } from '@inertiajs/react';



export default function AdminProducts({ productManagement, filipino }) {

    const { products } = productManagement;

    const [search, setSearch] = useState('');

    const [barangayFilter, setBarangayFilter] = useState('');

    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [confirmModal, setConfirmModal] = useState(null);
    const [successModal, setSuccessModal] = useState(null);

    const [page, setPage] = useState(1);

    const pageSize = 10;



    const uniqueBarangays = useMemo(() => [...new Set(products.map(p => p.barangay))].filter(Boolean).sort(), [products]);

    const uniqueCategories = useMemo(() => [...new Set(products.map(p => p.category))].filter(Boolean).sort(), [products]);



    const filtered = useMemo(() => {

        return products.filter(p => {

            if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.seller_name.toLowerCase().includes(search.toLowerCase())) return false;

            if (barangayFilter && p.barangay !== barangayFilter) return false;

            if (categoryFilter && p.category !== categoryFilter) return false;

            if (statusFilter && p.display_status !== statusFilter) return false;

            return true;

        });

    }, [products, search, barangayFilter, categoryFilter, statusFilter]);



    const paginated = useMemo(() => {

        const start = (page - 1) * pageSize;

        return filtered.slice(start, start + pageSize);

    }, [filtered, page, pageSize]);



    const updateStatus = (product, action) => {
        setConfirmModal({ product, action });
    };

    const confirmAction = () => {
        if (!confirmModal) return;
        const { product, action } = confirmModal;
        router.post(`/admin/products/${product.id}/${action}`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmModal(null);
                setSuccessModal({ action, product });
            }
        });
    };



    const dismissReport = (id) => {

        if (confirm(filipino ? 'Sigurado ka bang gusto mong i-dismiss ang mga report para sa produktong ito?' : 'Are you sure you want to dismiss reports for this product?')) {

            router.post(`/admin/products/${id}/dismiss`, {}, { preserveScroll: true });

        }

    };



    return (

        <section className="admin-sellers-page" aria-label={filipino ? "Direktoryo ng mga Produkto" : "Products Directory"}>

            <div className="admin-page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 className="admin-page-title" style={{ margin: 0 }}>{filipino ? "Mga Produkto" : "Products"}</h1>
                    <p className="admin-page-subtitle" style={{ color: 'var(--store-muted)', marginTop: '4px' }}>
                        {filipino ? "Subaybayan at pamahalaan ang mga produkto sa marketplace." : "Monitor and manage marketplace product listings."}
                    </p>
                </div>
            </div>



            <section className="admin-panel admin-seller-directory">

                <div className="admin-directory-toolbar">

                    <div className="admin-directory-toolbar-left">

                        <div className="admin-search-field">

                            <Search aria-hidden="true" />

                            <input

                                value={search}

                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}

                                placeholder={filipino ? "Maghanap ng produkto o nagbebenta..." : "Search name or seller..."}

                            />

                            {search && (

                                <button

                                    type="button"

                                    className="admin-search-clear"

                                    onClick={() => setSearch("")}

                                >

                                    <X aria-hidden="true" />

                                </button>

                            )}

                        </div>

                        <div className="admin-filter-controls">

                            <label className="admin-filter-select-wrap">

                                <select value={barangayFilter} onChange={(e) => { setBarangayFilter(e.target.value); setPage(1); }}>

                                    <option value="">{filipino ? "Lahat ng barangay" : "All barangays"}</option>

                                    {uniqueBarangays.map((item) => (

                                        <option key={item} value={item}>{item}</option>

                                    ))}

                                </select>

                            </label>

                            <label className="admin-filter-select-wrap">

                                <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>

                                    <option value="">{filipino ? "Lahat ng kategorya" : "All categories"}</option>

                                    {uniqueCategories.map((item) => (

                                        <option key={item} value={item}>{item}</option>

                                    ))}

                                </select>

                            </label>

                            <label className="admin-filter-select-wrap">

                                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>

                                    <option value="">{filipino ? "Lahat ng status" : "All statuses"}</option>

                                    <option value="active">Active</option>

                                    <option value="out_of_stock">Out of stock</option>

                                    <option value="delisted">Delisted</option>

                                </select>

                            </label>

                        </div>

                    </div>

                </div>



                {filtered.length > 0 ? (

                    <div className="admin-seller-table-wrap">

                        <div className="admin-directory-header admin-product-directory-header" aria-hidden="true">

                            <span className="admin-col-avatar" />

                            <span>Product</span>

                            <span>Barangay</span>

                            <span>Seller</span>

                            <span>Inventory</span>

                            <span>Status</span>

                            <span className="admin-col-actions">Actions</span>

                        </div>

                        

                        <div className="admin-seller-list" role="list">

                            {paginated.map((product) => (

                                <article className="admin-seller-row admin-product-row" key={product.id} role="listitem">

                                    <div className="admin-seller-photo" style={{ borderRadius: '6px' }}>

                                        <img src={product.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                                    </div>

                                    <div className="admin-seller-identity">

                                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

                                            {product.name}

                                            

                                        </strong>

                                        <span style={{ marginTop: '2px' }}>{product.category}</span>

                                    </div>

                                    <div className="admin-seller-meta">

                                        <span className="admin-seller-meta-label">Barangay</span>

                                        <span><MapPin aria-hidden="true" />{product.barangay}</span>

                                    </div>

                                    <div className="admin-seller-meta">

                                        <span className="admin-seller-meta-label">Seller</span>

                                        <span><Store aria-hidden="true" />{product.seller_name}</span>

                                    </div>

                                    <div className="admin-seller-meta">

                                        <span className="admin-seller-meta-label">Inventory</span>

                                        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>

                                            <span>&#8369;{product.price}/{product.unit}</span>

                                            <span style={{ color: 'var(--store-muted)', fontSize: '12px' }}><Package size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }}/>{product.stock} in stock</span>

                                        </span>

                                    </div>

                                    <div className="admin-seller-meta">

                                        <span className="admin-seller-meta-label">Status</span>

                                        <span className={`admin-status admin-status--${product.display_status === 'out_of_stock' || product.display_status === 'delisted' ? 'suspended' : product.display_status}`} style={{ width: 'fit-content' }}>

                                            {product.display_status === 'active' && <BadgeCheck aria-hidden="true" />}

                                            {product.display_status === 'out_of_stock' && <ShieldAlert aria-hidden="true" />}

                                            {product.display_status === 'delisted' && <X aria-hidden="true" />}

                                            <span>{product.display_status.replace('_', ' ')}</span>

                                        </span>

                                    </div>

                                    

                                    <div className="admin-seller-actions">
                                        {product.display_status !== 'delisted' ? (
                                            <button type="button" onClick={() => updateStatus(product, 'delist')} className="admin-action-btn admin-action-btn--suspend" title="Hide product">
                                                <Trash2 aria-hidden="true" />
                                                <span>Hide</span>
                                            </button>
                                        ) : (
                                            <button type="button" onClick={() => updateStatus(product, 'relist')} className="admin-action-btn admin-action-btn--reinstate" title="Restore product">
                                                <RefreshCw aria-hidden="true" />
                                                <span>Restore</span>
                                            </button>
                                        )}
                                    </div>
                                </article>

                            ))}

                        </div>



                        <div className="admin-table-pagination" aria-label="Products table pagination">

                            <span className="admin-pagination-info">

                                Showing <strong>{(page - 1) * pageSize + 1}</strong> - <strong>{Math.min(page * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> products

                            </span>

                            <div className="admin-pagination-controls">

                                <button type="button" className="admin-pagination-btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>

                                    <span>&lsaquo; Previous</span>

                                </button>

                                <span className="admin-pagination-current">

                                    Page <strong>{page}</strong> of <strong>{Math.ceil(filtered.length / pageSize) || 1}</strong>

                                </span>

                                <button type="button" className="admin-pagination-btn" disabled={page >= Math.ceil(filtered.length / pageSize)} onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}>

                                    <span>Next &rsaquo;</span>

                                </button>

                            </div>

                        </div>

                    </div>

                ) : (

                    <div className="admin-empty admin-seller-empty">
                        <div className="admin-empty-icon" aria-hidden="true">
                            <Store />
                        </div>

                        <strong>{filipino ? "Walang nahanap na produkto" : "No products found"}</strong>

                        <p>{filipino ? "Walang produkto ang tumutugma sa iyong paghahanap." : "No products match your current filters."}</p>

                        {search || barangayFilter || categoryFilter || statusFilter ? (

                            <button type="button" className="admin-secondary-button" onClick={() => { setSearch(''); setBarangayFilter(''); setCategoryFilter(''); setStatusFilter(''); }}>

                                {filipino ? "I-clear ang mga filter" : "Clear filters"}

                            </button>

                        ) : null}

                    </div>

                )}
            {confirmModal && (
                <Dialog
                    title={filipino ? "Kumpirmahin ang Aksyon" : "Confirm Action"}
                    icon={confirmModal.action === 'delist' ? Trash2 : RefreshCw}
                    variant={confirmModal.action === 'delist' ? 'danger' : 'default'}
                    onClose={() => setConfirmModal(null)}
                    filipino={filipino}
                >
                    <div className={`admin-dialog-alert admin-dialog-alert--${confirmModal.action === 'delist' ? 'danger' : 'default'}`}>
                        {confirmModal.action === 'delist' ? <ShieldAlert aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
                        <div>
                            <strong>{filipino ? "Tandaan" : "Action impact notice"}</strong>
                            <p>
                                {confirmModal.action === 'delist' 
                                    ? (filipino ? `Sigurado ka bang gusto mong itago ang produktong "${confirmModal.product.name}"? Hindi na ito makikita ng mga mamimili sa marketplace.` : `Are you sure you want to hide "${confirmModal.product.name}"? Customers will no longer be able to see or purchase it.`)
                                    : (filipino ? `Sigurado ka bang gusto mong ibalik ang produktong "${confirmModal.product.name}" sa marketplace?` : `Are you sure you want to restore "${confirmModal.product.name}"? It will become visible on the marketplace again.`)}
                            </p>
                        </div>
                    </div>
                    <div className="admin-dialog-actions">
                        <button type="button" className="admin-secondary-button" onClick={() => setConfirmModal(null)}>
                            {filipino ? "Kanselahin" : "Cancel"}
                        </button>
                        <button type="button" className={confirmModal.action === 'delist' ? "admin-danger-button" : "admin-primary-button"} onClick={confirmAction}>
                            {filipino ? "Kumpirmahin" : "Confirm"}
                        </button>
                    </div>
                </Dialog>
            )}

            {successModal && (
                <Dialog
                    title={filipino ? "Tagumpay" : "Success"}
                    icon={CheckCircle2}
                    onClose={() => setSuccessModal(null)}
                    filipino={filipino}
                >
                    <div className="admin-dialog-alert admin-dialog-alert--success">
                        <BadgeCheck aria-hidden="true" />
                        <div>
                            <strong>{filipino ? "Aksyon Tagumpay" : "Action Successful"}</strong>
                            <p>
                                {successModal.action === 'delist' 
                                    ? (filipino ? `Ang produktong "${successModal.product.name}" ay matagumpay na itinago.` : `The product "${successModal.product.name}" has been successfully hidden from the marketplace.`)
                                    : (filipino ? `Ang produktong "${successModal.product.name}" ay matagumpay na ibinalik.` : `The product "${successModal.product.name}" has been successfully restored and is now visible.`)}
                            </p>
                        </div>
                    </div>
                    <div className="admin-dialog-actions">
                        <button type="button" className="admin-secondary-button" onClick={() => setSuccessModal(null)}>
                            {filipino ? "Isara" : "Close"}
                        </button>
                    </div>
                </Dialog>
            )}

            


            </section>

        </section>

    );

}





function Dialog({
    title,
    subtitle,
    icon: Icon,
    children,
    onClose,
    variant = "default",
    filipino = false
}) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="admin-dialog-backdrop"
            role="presentation"
            onMouseDown={onClose}
        >
            <section
                className={`admin-dialog admin-dialog--${variant}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="admin-dialog-header">
                    <div className="admin-dialog-heading">
                        {Icon && (
                            <span
                                className={`admin-dialog-icon admin-dialog-icon--${variant}`}
                                aria-hidden="true"
                            >
                                <Icon />
                            </span>
                        )}
                        <div>
                            <h2 id="admin-dialog-title">{title}</h2>
                            {subtitle && (
                                <p className="admin-dialog-subtitle">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="admin-dialog-close"
                        aria-label={filipino ? "Isara" : "Close dialog"}
                        onClick={onClose}
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>
                <div className="admin-dialog-body">{children}</div>
            </section>
        </div>
    );
}
