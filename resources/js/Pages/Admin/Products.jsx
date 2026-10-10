import { useState, useMemo, useEffect } from 'react';
import Pagination from '../Seller/Pagination';

import { Search, ChevronDown, ShieldAlert, BadgeCheck, X, Eye, Trash2, RefreshCw, MapPin, Store, Tag, Package } from 'lucide-react';

import { router } from '@inertiajs/react';
import ConfirmationDialog from '../../Components/ConfirmationDialog';
import FormStatus from '../../Components/FormStatus';



export default function AdminProducts({ productManagement, filipino }) {

    const { products } = productManagement;

    const [search, setSearch] = useState('');

    const [barangayFilter, setBarangayFilter] = useState('');

    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [confirmModal, setConfirmModal] = useState(null);
    const [notice, setNotice] = useState(null);
    const [actionError, setActionError] = useState('');
    const [updating, setUpdating] = useState(false);
    const [dismissTarget, setDismissTarget] = useState(null);
    const [dismissing, setDismissing] = useState(false);

    const [page, setPage] = useState(1);

    const [pageSize, setPageSize] = useState(5);



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
    useEffect(() => {
        const lastPage = Math.max(1, Math.ceil(filtered.length / pageSize));
        if (page > lastPage) setPage(lastPage);
    }, [filtered.length, page, pageSize]);



    const updateStatus = (product, action) => {
        if (updating) return;
        setActionError('');
        if (action === 'delist') setConfirmModal({ product, action });
        else performAction(product, action);
    };

    const confirmAction = () => {
        if (!confirmModal) return;
        const { product, action } = confirmModal;
        performAction(product, action);
    };

    const performAction = (product, action) => {
        if (updating) return;
        setUpdating(true);
        const failed = () => { setActionError(filipino ? 'Hindi ma-update ang produkto. Pakisubukan muli.' : 'The product could not be updated. Please try again.'); return false; };
        router.post(`/admin/products/${product.id}/${action}`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmModal(null);
                setNotice({ id: Date.now(), message: action === 'delist'
                    ? (filipino ? 'Itinago ang produkto sa marketplace.' : 'Product hidden from the marketplace.')
                    : (filipino ? 'Ibinalik ang produkto sa marketplace.' : 'Product restored to the marketplace.') });
            },
            onError: failed,
            onNetworkError: failed,
            onHttpException: failed,
            onFinish: () => setUpdating(false),
        });
    };



    const dismissReport = (id) => {
        setActionError('');
        setDismissTarget(id);

    };



    return (

        <section className="admin-sellers-page" aria-label={filipino ? "Direktoryo ng mga Produkto" : "Products Directory"}>
            <FormStatus dismissible messageId={notice?.id} dismissLabel={filipino ? 'Isara ang mensahe' : 'Dismiss message'}>{notice?.message}</FormStatus>
            {actionError && !confirmModal && <FormStatus tone="error">{actionError}</FormStatus>}

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
                                        {product.reports.length > 0 && <button type="button" disabled={dismissing} onClick={() => dismissReport(product.id)} className="admin-action-btn">
                                            <ShieldAlert aria-hidden="true" />
                                            <span>{filipino ? 'Suriin ang mga report' : 'Review reports'} ({product.reports.length})</span>
                                        </button>}
                                        {product.display_status !== 'delisted' ? (
                                            <button type="button" disabled={updating} onClick={() => updateStatus(product, 'delist')} className="admin-action-btn admin-action-btn--suspend" title={filipino ? 'Itago ang produkto' : 'Hide product'}>
                                                <Trash2 aria-hidden="true" />
                                                <span>{filipino ? 'Itago' : 'Hide'}</span>
                                            </button>
                                        ) : (
                                            <button type="button" disabled={updating} onClick={() => updateStatus(product, 'relist')} className="admin-action-btn admin-action-btn--reinstate" title={filipino ? 'Ibalik ang produkto' : 'Restore product'}>
                                                <RefreshCw aria-hidden="true" />
                                                <span>{filipino ? 'Ibalik' : 'Restore'}</span>
                                            </button>
                                        )}
                                    </div>
                                </article>

                            ))}

                        </div>



                        <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} filipino={filipino} label="Products table pagination" itemLabel={filipino ? "tala" : "products"} />

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
            <ConfirmationDialog open={Boolean(confirmModal)} title={filipino ? 'Itago ang produkto?' : 'Hide product?'}
                description={filipino ? `Hindi makikita o mabibili ng mga customer ang “${confirmModal?.product.name || ''}”. Maaari mo itong ibalik sa ibang pagkakataon.` : `Customers will no longer see or purchase “${confirmModal?.product.name || ''}”. You can restore it later.`}
                confirmLabel={filipino ? 'Itago ang produkto' : 'Hide product'} cancelLabel={filipino ? 'Kanselahin' : 'Cancel'} workingLabel={filipino ? 'Itinatago…' : 'Hiding…'} busy={updating}
                onCancel={() => setConfirmModal(null)} onConfirm={confirmAction}>
                {actionError && <FormStatus tone="error">{actionError}</FormStatus>}
            </ConfirmationDialog>

            


                <ConfirmationDialog open={dismissTarget !== null} title={filipino ? 'I-dismiss ang mga report?' : 'Dismiss reports?'}
                    description={filipino ? 'Suriin ang mga report bago i-dismiss. Mananatili ang kasaysayan ng mga report.' : 'Review these reports before dismissing them. Their history will be retained.'}
                    confirmLabel={filipino ? 'I-dismiss ang mga report' : 'Dismiss reports'} cancelLabel={filipino ? 'Kanselahin' : 'Cancel'} workingLabel={filipino ? 'Dini-dismiss…' : 'Dismissing…'} busy={dismissing}
                    onCancel={() => setDismissTarget(null)} onConfirm={() => {
                        if (dismissTarget === null || dismissing) return;
                        const failed = () => { setActionError(filipino ? 'Hindi ma-dismiss ang mga report. Subukan muli.' : 'Could not dismiss the reports. Please try again.'); return false; };
                        router.post(`/admin/products/${dismissTarget}/dismiss`, {}, {
                            preserveScroll: true,
                            onStart: () => setDismissing(true),
                            onSuccess: () => { setDismissTarget(null); setNotice({ id: Date.now(), message: filipino ? 'Na-dismiss ang mga nakabinbing report.' : 'Pending reports dismissed.' }); },
                            onError: failed, onNetworkError: failed, onHttpException: failed,
                            onFinish: () => setDismissing(false),
                        });
                    }}>
                    {products.find(product => product.id === dismissTarget)?.reports.map(report => <div key={report.id}>
                        <p><strong>{report.reason}</strong> · {report.reporter_name} · {report.date}</p>
                        <p>{report.description}</p>
                    </div>)}
                    {actionError && <FormStatus tone="error">{actionError}</FormStatus>}
                </ConfirmationDialog>
            </section>

        </section>

    );

}
