import { useMemo, useState, useEffect } from 'react';
import { Search, ChevronDown, ShoppingBag, Eye, X, Store, CheckCircle2, Clock, Truck, FileQuestion, XCircle, Package } from 'lucide-react';
import Pagination from '../Seller/Pagination';

export default function AdminOrders({ orderManagement, filipino }) {
    const { orders } = orderManagement;

    const [search, setSearch] = useState('');
    const [barangayFilter, setBarangayFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    const [viewOrder, setViewOrder] = useState(null);

    const uniqueBarangays = useMemo(() => [...new Set(orders.map(o => o.barangay))].filter(Boolean).sort(), [orders]);

    const filtered = useMemo(() => {
        return orders.filter(o => {
            const query = search.toLowerCase();
            if (search && !o.id.toLowerCase().includes(query) && !o.customer_name.toLowerCase().includes(query)) return false;
            if (barangayFilter && o.barangay !== barangayFilter) return false;
            if (statusFilter && o.status !== statusFilter) return false;
            return true;
        });
    }, [orders, search, barangayFilter, statusFilter]);

    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);
    useEffect(() => {
        const lastPage = Math.max(1, Math.ceil(filtered.length / pageSize));
        if (page > lastPage) setPage(lastPage);
    }, [filtered.length, page, pageSize]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [search, barangayFilter, statusFilter]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'delivered': return <CheckCircle2 aria-hidden="true" />;
            case 'completed': return <CheckCircle2 aria-hidden="true" />;
            case 'shipped': return <Truck aria-hidden="true" />;
            case 'pending': return <Clock aria-hidden="true" />;
            case 'processing': return <Package aria-hidden="true" />;
            case 'cancelled': return <XCircle aria-hidden="true" />;
            case 'empty': return <FileQuestion aria-hidden="true" />;
            default: return <Clock aria-hidden="true" />;
        }
    };

    return (
        <section className="admin-sellers-page" aria-label={filipino ? "Direktoryo ng mga Order" : "Orders Directory"}>
            <div className="admin-page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 className="admin-page-title" style={{ margin: 0 }}>{filipino ? "Mga Order" : "Orders"}</h1>
                    <p className="admin-page-subtitle" style={{ color: 'var(--store-muted)', marginTop: '4px' }}>
                        {filipino ? "Subaybayan ang lahat ng transaksyon sa marketplace." : "Monitor all marketplace transactions across barangays."}
                    </p>
                </div>
            </div>

            <section className="admin-panel admin-seller-directory">
                <div className="admin-directory-toolbar">
                    <div className="admin-directory-toolbar-left">
                        <div className="admin-search-field">
                            <Search aria-hidden="true" />
                            <input
                                type="search"
                                placeholder={filipino ? "Maghanap ng order o mamimili..." : "Search order or customer..."}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label={filipino ? "Maghanap ng order" : "Search orders"}
                            />
                            {search && (
                                <button type="button" className="admin-search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                                    <X aria-hidden="true" />
                                </button>
                            )}
                        </div>
                        <div className="admin-filter-controls">
                            <label className="admin-filter-select-wrap">
                                <span className="sr-only">Filter by barangay</span>
                                <select value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)}>
                                    <option value="">{filipino ? "Lahat ng barangay" : "All barangays"}</option>
                                    {uniqueBarangays.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </label>
                            <label className="admin-filter-select-wrap">
                                <span className="sr-only">Filter by status</span>
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="">{filipino ? "Lahat ng status" : "All statuses"}</option>
                                    <option value="pending">{filipino ? "Nakabinbin" : "Pending"}</option>
                                    <option value="processing">{filipino ? "Pinoproseso" : "Processing"}</option>
                                    <option value="delivered">{filipino ? "Naihatid na" : "Delivered"}</option>
                                    <option value="completed">{filipino ? "Tapos na (may kinansela)" : "Completed (partly cancelled)"}</option>
                                    <option value="cancelled">{filipino ? "Kinansela" : "Cancelled"}</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </div>

                {filtered.length > 0 ? (
                    <div className="admin-seller-table-wrap">
                        <div className="admin-directory-header admin-order-directory-header" aria-hidden="true">
                            <span>{filipino ? "ORDER ID" : "ORDER ID"}</span>
                            <span>{filipino ? "MAMIMILI" : "CUSTOMER"}</span>
                            <span>{filipino ? "BARANGAY" : "BARANGAY"}</span>
                            <span>{filipino ? "KABUUAN" : "TOTAL"}</span>
                            <span>{filipino ? "STATUS" : "STATUS"}</span>
                            <span className="admin-col-actions">{filipino ? "MGA AKSYON" : "ACTIONS"}</span>
                        </div>

                        <div className="admin-seller-list" role="list">
                            {paginated.map(order => (
                                <article className="admin-seller-row admin-order-row" key={order.id} role="listitem">
                                    <div className="admin-seller-identity">
                                        <div className="admin-seller-info">
                                            <strong style={{ fontFamily: 'monospace' }}>{order.id}</strong>
                                            <span style={{ color: 'var(--store-muted)', fontSize: '12px' }}>{order.created_at}</span>
                                        </div>
                                    </div>
                                    <div className="admin-seller-meta">
                                        <span className="admin-seller-meta-label">Customer</span>
                                        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                                            <strong>{order.customer_name}</strong>
                                            <span style={{ color: 'var(--store-muted)', fontSize: '12px' }}>{order.customer_email || order.customer_phone}</span>
                                        </span>
                                    </div>
                                    <div className="admin-seller-meta">
                                        <span className="admin-seller-meta-label">Barangay</span>
                                        <span>{order.barangay || <span style={{ color: "var(--store-muted)" }}>—</span>}</span>
                                    </div>
                                    <div className="admin-seller-meta">
                                        <span className="admin-seller-meta-label">Total</span>
                                        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                                            <span>{formatCurrency(order.total_amount)}</span>
                                            <span style={{ color: 'var(--store-muted)', fontSize: '12px' }}>{order.payment_method}</span>
                                        </span>
                                    </div>
                                    <div className="admin-seller-meta">
                                        <span className="admin-seller-meta-label">Status</span>
                                        
                                        {(() => {
                                            let variant = 'default';
                                            if (['delivered', 'completed', 'shipped'].includes(order.status)) variant = 'active';
                                            if (order.status === 'cancelled' || order.status === 'empty') variant = 'suspended';
                                            if (order.status === 'pending' || order.status === 'processing') variant = 'warning';
                                            return (
                                                <span className={`admin-status admin-status--${variant}`} style={{ width: 'fit-content' }}>
                                                    {getStatusIcon(order.status)}
                                                    <span style={{ textTransform: 'capitalize' }}>{order.status === 'completed' ? (filipino ? 'Tapos na (may kinansela)' : 'Completed (partly cancelled)') : order.status}</span>
                                                </span>
                                            );
                                        })()}

                                    </div>
                                    <div className="admin-seller-actions">
                                        <button type="button" onClick={() => setViewOrder(order)} className="admin-action-btn" title="View details">
                                            <Eye aria-hidden="true" />
                                            <span>{filipino ? "Tingnan" : "View"}</span>
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} filipino={filipino} label="Orders table pagination" itemLabel={filipino ? "tala" : "orders"} />
                    </div>
                ) : (
                    <div className="admin-empty admin-seller-empty">
                        <div className="admin-empty-icon" aria-hidden="true">
                            <ShoppingBag />
                        </div>
                        <strong>{filipino ? "Walang nahanap na order" : "No orders found"}</strong>
                        <p>{filipino ? "Walang order ang tumutugma sa iyong paghahanap." : "No orders match your current filters."}</p>
                        {(search || barangayFilter || statusFilter) && (
                            <button type="button" className="admin-secondary-button" onClick={() => { setSearch(''); setBarangayFilter(''); setStatusFilter(''); }}>
                                {filipino ? "I-clear ang mga filter" : "Clear filters"}
                            </button>
                        )}
                    </div>
                )}
            </section>

            {viewOrder && (
                <Dialog
                    title={filipino ? "Mga Detalye ng Order" : "Order Details"}
                    subtitle={`#${viewOrder.id}`}
                    icon={ShoppingBag}
                    onClose={() => setViewOrder(null)}
                    filipino={filipino}
                >
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--admin-border)', marginBottom: '24px' }}>
                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--store-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{filipino ? "MAMIMILI" : "CUSTOMER"}</h4>
                                <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '2px', color: 'var(--admin-text)' }}>{viewOrder.customer_name}</div>
                                <div style={{ color: 'var(--store-muted)', fontSize: '13px', marginBottom: '2px' }}>{viewOrder.customer_email}</div>
                                <div style={{ color: 'var(--store-muted)', fontSize: '13px' }}>{viewOrder.customer_phone}</div>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--store-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{filipino ? "IMPORMASYON SA PAGHAHATID" : "DELIVERY INFO"}</h4>
                                <div style={{ color: 'var(--admin-text)', fontSize: '13px', marginBottom: '2px' }}>{viewOrder.address}</div>
                                <div style={{ color: 'var(--store-muted)', fontSize: '13px' }}>Brgy. {viewOrder.barangay}</div>
                            </div>
                        </div>

                        <div>
                            <h3 className="admin-divider-bottom" style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--admin-text)', paddingBottom: '12px' }}>{filipino ? "Mga Item sa Order" : "Order Items"}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {viewOrder.items.map((item, index) => (
                                    <div key={item.id} className={index < viewOrder.items.length - 1 ? 'admin-divider-bottom' : ''} style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: '16px', alignItems: 'center', paddingBottom: index < viewOrder.items.length - 1 ? '16px' : '0' }}>
                                        <div className="admin-seller-photo" style={{ borderRadius: '6px', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {item.photo_url ? (
                                                <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Package aria-hidden="true" style={{ opacity: 0.2 }} />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: 'var(--admin-text)' }}>{item.product_name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--store-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Store size={12}/> {item.seller_name}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '13px', color: 'var(--admin-text)', marginBottom: '2px' }}>
                                                {formatNumber(item.quantity)} {item.unit} &times; {formatCurrency(item.price)}
                                            </div>
                                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--admin-text)', marginBottom: '4px' }}>
                                                {formatCurrency(item.total)}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--store-muted)', textTransform: 'capitalize' }}>
                                                Status: <strong style={{ color: 'var(--admin-text)' }}>{item.status}</strong>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="admin-dialog-actions">
                            <button type="button" className="admin-danger-button" onClick={() => setViewOrder(null)}>
                                {filipino ? "Isara" : "Close"}
                            </button>
                        </div>
                    </div>
                </Dialog>
            )}
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
                                <p className="admin-dialog-subtitle" style={{ fontFamily: 'monospace' }}>
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

function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

function formatNumber(value) {
    return new Intl.NumberFormat("en-PH").format(Number(value) || 0);
}
