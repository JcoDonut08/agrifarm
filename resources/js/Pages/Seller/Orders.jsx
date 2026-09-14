import { router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../Components/Storefront/Icon';
import SellerFlashStatus from './SellerFlashStatus';
import Pagination from './Pagination';
import { localizeMessage, unitLabel } from './SellerLocale';
import ConfirmationDialog from './ConfirmationDialog';
import '../../../css/seller-orders.css';

const statuses = [
    { label: 'Pending orders', shortLabel: 'Pending', filipinoLabel: 'Mga order na naghihintay', filipinoShort: 'Naghihintay', icon: 'clock', tone: 'pending', value: 'pending' },
    { label: 'Reservations', shortLabel: 'Reservations', filipinoLabel: 'Mga reserbasyon', filipinoShort: 'Nakareserba', icon: 'calendar', tone: 'reservations', value: 'reservation' },
    { label: 'Preparing', shortLabel: 'Preparing', filipinoLabel: 'Mga inihahandang order', filipinoShort: 'Inihahanda', icon: 'receipt', tone: 'preparing', value: 'preparing' },
    { label: 'Out for delivery', shortLabel: 'Out for delivery', filipinoLabel: 'Para sa paghahatid', filipinoShort: 'Ipinadadala', icon: 'truck', tone: 'delivery', value: 'out_for_delivery' },
    { label: 'Delivered orders', shortLabel: 'Delivered', filipinoLabel: 'Mga naihatid na order', filipinoShort: 'Naihatid', icon: 'confirm', tone: 'delivered', value: 'delivered' },
    { label: 'Cancelled orders', shortLabel: 'Cancelled', filipinoLabel: 'Mga kinanselang order', filipinoShort: 'Kinansela', icon: 'close', tone: 'cancelled', value: 'cancelled' },
];

function OrderIcon({ name, size = 22 }) {
    const paths = {
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6" /></>,
        truck: <><path d="M3 6h11v11H3Z M14 10h4l3 3v4h-7Z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
        eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
        printer: <><path d="M7 8V3h10v5M7 17H5a3 3 0 0 1-3-3v-3a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-2" /><path d="M7 14h10v7H7Z" /><circle cx="18" cy="11" r=".7" fill="currentColor" /></>,
        confirm: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    };

    return paths[name]
        ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
        : <Icon name={name} size={size} />;
}

function TooltipIcon({ icon, label, tone = 'neutral', onClick, disabled = false }) {
    return <button
        type="button"
        className={`order-action order-action--${tone}`}
        aria-label={label}
        data-tooltip={label}
        disabled={disabled}
        onClick={onClick}
    ><OrderIcon name={icon} size={18} /></button>;
}

function ProductThumbnail({ photoUrl, className = '' }) {
    return <span className={`order-product-thumb ${className}`.trim()} aria-hidden="true">
        {photoUrl
            ? <img src={photoUrl} alt="" />
            : <Icon name="sprout" size={20} />}
    </span>;
}

const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value));
const dateTime = (value, filipino) => new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const receiptDateTime = (value, filipino) => new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true,
}).format(new Date(value));
const orderNumber = order => `#WALK-${String(order.id).padStart(5, '0')}`;
const ORDERS_PER_PAGE = 10;

export default function Orders({ products = [], orders = [], filipino = false }) {
    const { auth, flash } = usePage().props;
    const [filter, setFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [adding, setAdding] = useState(false);
    const [viewingOrder, setViewingOrder] = useState(null);
    const [receiptOrder, setReceiptOrder] = useState(null);
    const [processingOrderId, setProcessingOrderId] = useState(null);
    const [cancellingOrder, setCancellingOrder] = useState(null);
    const [actionError, setActionError] = useState('');
    const [data, setData] = useState({ customer_name: '', product_id: '', quantity: '1' });
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const addModal = useRef(null);
    const detailModal = useRef(null);
    const availableProducts = products.filter(product => product.stock > 0);
    const selectedProduct = products.find(product => String(product.id) === data.product_id);
    const productById = useMemo(() => new Map(products.map(product => [Number(product.id), product])), [products]);
    const filteredOrders = filter === 'all' ? orders : orders.filter(order => order.status === filter);
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
    const visibleOrders = filteredOrders.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);
    const counts = useMemo(() => Object.fromEntries(statuses.map(status => [status.value, orders.filter(order => order.status === status.value).length])), [orders]);
    const filteredStatus = statuses.find(status => status.value === filter);
    const emptyTitle = filipino
        ? (filter === 'all' ? 'Wala pang order' : filter === 'reservation' ? 'Wala pang reserbasyon' : `Wala pang order na ${filteredStatus?.filipinoShort.toLowerCase()}`)
        : (filter === 'all' ? 'No orders yet' : filter === 'reservation' ? 'No reservations yet' : `No ${filteredStatus?.shortLabel.toLowerCase()} orders yet`);
    const emptyMessage = filipino
        ? (filter === 'all' ? 'Lalabas dito ang mga bagong order ng customer kapag naitala na ang mga ito.' : filter === 'reservation' ? 'Lalabas dito ang mga reserbasyon ng customer kapag naitala na ang mga ito.' : `Lalabas dito ang mga order na minarkahang “${filteredStatus?.filipinoShort}.”`)
        : (filter === 'all' ? 'New customer orders will appear here as soon as they are placed.' : filter === 'reservation' ? 'Customer reservations will appear here as soon as they are placed.' : `Orders marked ${filteredStatus?.shortLabel.toLowerCase()} will appear here.`);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    useEffect(() => {
        if (!adding) { addModal.current?.close(); return; }
        const previousOverflow = document.body.style.overflow;
        addModal.current.showModal();
        document.body.style.overflow = 'hidden';
        addModal.current.querySelector('#walk-in-customer')?.focus();
        return () => { document.body.style.overflow = previousOverflow; };
    }, [adding]);

    useEffect(() => {
        if (!viewingOrder) { detailModal.current?.close(); return; }
        const previousOverflow = document.body.style.overflow;
        detailModal.current.showModal();
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previousOverflow; };
    }, [viewingOrder]);

    useEffect(() => {
        if (!receiptOrder) return;
        const clearReceipt = () => setReceiptOrder(null);
        const timer = window.setTimeout(() => window.print(), 80);
        window.addEventListener('afterprint', clearReceipt, { once: true });
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('afterprint', clearReceipt);
        };
    }, [receiptOrder]);

    function update(key, value) {
        setData(current => ({ ...current, [key]: value }));
        setErrors(current => ({ ...current, [key]: undefined }));
    }

    function submit(event) {
        event.preventDefault();
        const next = {};
        if (!data.product_id) next.product_id = filipino ? 'Pumili ng produkto.' : 'Choose a product.';
        if (!Number.isInteger(Number(data.quantity)) || Number(data.quantity) < 1) next.quantity = filipino ? 'Maglagay ng dami na hindi bababa sa isa.' : 'Enter a quantity of at least one.';
        if (selectedProduct && Number(data.quantity) > selectedProduct.stock) next.quantity = filipino ? `${selectedProduct.stock} ${unitLabel(selectedProduct.unit, true)} na lang ang available.` : `Only ${selectedProduct.stock} ${selectedProduct.unit} available.`;
        setErrors(next);
        if (Object.keys(next).length || processing) return;

        setProcessing(true);
        router.post('/seller/orders/walk-in', data, {
            preserveScroll: true,
            onError: serverErrors => setErrors(serverErrors),
            onSuccess: () => {
                setAdding(false);
                setData({ customer_name: '', product_id: '', quantity: '1' });
                setErrors({});
                setFilter('all');
                setCurrentPage(1);
            },
            onFinish: () => setProcessing(false),
        });
    }

    function changeStatus(order, nextStatus) {
        if (nextStatus === 'cancelled') {
            setCancellingOrder(order);
            return;
        }

        performStatusChange(order, nextStatus);
    }

    function performStatusChange(order, nextStatus) {
        setActionError('');
        setProcessingOrderId(order.id);
        router.patch(`/seller/orders/${order.id}/status`, { status: nextStatus }, {
            preserveScroll: true,
            onError: serverErrors => setActionError(filipino ? localizeMessage(serverErrors.status, true) || 'Hindi na-update ang order.' : serverErrors.status || 'The order could not be updated.'),
            onFinish: () => { setProcessingOrderId(null); setCancellingOrder(null); },
        });
    }

    function actionsFor(order) {
        const actions = [];
        if (['pending', 'reservation'].includes(order.status)) actions.push({ key: 'accept', label: filipino ? 'Tanggapin ang order' : 'Accept order', icon: 'check', tone: 'positive', status: 'preparing' });
        if (order.status === 'preparing') actions.push({ key: 'delivery', label: filipino ? 'Itakda para sa paghahatid' : 'Mark for delivery', icon: 'truck', tone: 'delivery', status: 'out_for_delivery' });
        if (order.status === 'out_for_delivery') actions.push({ key: 'confirm', label: filipino ? 'Kumpirmahin ang paghahatid' : 'Confirm delivery', icon: 'confirm', tone: 'positive', status: 'delivered' });
        actions.push({ key: 'view', label: filipino ? 'Tingnan ang order' : 'View order', icon: 'eye', tone: 'neutral' });
        actions.push({ key: 'print', label: filipino ? 'I-print ang resibo' : 'Print receipt', icon: 'printer', tone: 'neutral' });
        if (['pending', 'reservation', 'preparing'].includes(order.status)) actions.push({ key: 'cancel', label: filipino ? 'Kanselahin ang order' : 'Cancel order', icon: 'close', tone: 'danger', status: 'cancelled' });
        return actions;
    }

    function runAction(order, action) {
        if (action.key === 'view') setViewingOrder(order);
        else if (action.key === 'print') setReceiptOrder(order);
        else changeStatus(order, action.status);
    }

    return <div className="orders-page">
        <div className="orders-page-heading">
            <div><h1 className="seller-page-title">{filipino ? 'Mga Order' : 'Orders'}</h1><p>{filipino ? 'Suriin at asikasuhin ang mga order sa tindahan ng inyong barangay.' : 'Review and fulfill orders placed with your barangay store.'}</p></div>
        </div>

        <SellerFlashStatus flash={flash} filipino={filipino} />

        <div className="order-summary" aria-label={filipino ? 'Buod ng status ng mga order' : 'Order status summary'}>
            {statuses.map(status => <article className={`order-summary-card order-summary-card--${status.tone}`} key={status.label}>
                <div><h2>{filipino ? status.filipinoLabel : status.label}</h2><strong>{counts[status.value]}</strong></div>
                <span className="order-summary-icon"><OrderIcon name={status.icon} /></span>
            </article>)}
        </div>

        <section className="seller-panel orders-panel">
            <div className="orders-panel-heading">
                <div><h2>{filipino ? 'Mga order ng customer' : 'Customer orders'}</h2><p>{filipino ? `${orders.length} order ang ipinapakita` : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} shown`}</p></div>
                <button type="button" className="seller-save-button walk-in-order-button" onClick={() => setAdding(true)}><Icon name="plus" size={18} />{filipino ? 'Magdagdag ng walk-in order' : 'Add walk-in order'}</button>
            </div>

            <div className="order-filters" aria-label={filipino ? 'Salain ang mga order ayon sa status' : 'Filter orders by status'}>
                {[{ value: 'all', shortLabel: 'All', filipinoShort: 'Lahat' }, ...statuses].map(status => {
                    const count = status.value === 'all' ? orders.length : counts[status.value];
                    return <button type="button" key={status.value} className={filter === status.value ? 'is-active' : ''} aria-pressed={filter === status.value} onClick={() => { setFilter(status.value); setCurrentPage(1); }}>{filipino ? status.filipinoShort : status.shortLabel}<span>{count}</span></button>;
                })}
            </div>

            {actionError && <p className="orders-action-error" role="alert">{actionError}</p>}

            <div className="orders-table-wrap">
                <table className="orders-table">
                    <thead><tr><th>{filipino ? 'ID ng order' : 'Order ID'}</th><th>{filipino ? 'Mamimili' : 'Customer'}</th><th>{filipino ? 'Produkto' : 'Products'}</th><th>{filipino ? 'Dami' : 'Quantity'}</th><th>{filipino ? 'Kabuuan' : 'Total'}</th><th>{filipino ? 'Petsa ng order' : 'Date ordered'}</th><th>Status</th><th>{filipino ? 'Mga aksyon' : 'Actions'}</th></tr></thead>
                    <tbody>{filteredOrders.length ? visibleOrders.map(order => {
                        const status = statuses.find(item => item.value === order.status) || statuses[0];
                        const product = productById.get(Number(order.product_id));
                        return <tr className="order-row" key={order.id}>
                            <td><strong>{orderNumber(order)}</strong></td>
                            <td>{order.customer_name}</td>
                            <td><div className="order-product"><ProductThumbnail photoUrl={product?.photo_url} /><div className="order-product-copy"><strong>{order.product_name}</strong><span>{filipino ? `${money(order.unit_price)} bawat ${unitLabel(order.unit, true)}` : `${money(order.unit_price)} per ${order.unit}`}</span></div></div></td>
                            <td>{order.quantity} {unitLabel(order.unit, filipino)}</td>
                            <td><strong>{money(order.total)}</strong></td>
                            <td>{dateTime(order.created_at, filipino)}</td>
                            <td><span tabIndex="0" className={`order-status-icon order-status-icon--${status.tone}`} aria-label={filipino ? status.filipinoShort : status.shortLabel} data-tooltip={filipino ? status.filipinoShort : status.shortLabel}><OrderIcon name={status.icon} size={18} /></span></td>
                            <td><div className="order-actions">{actionsFor(order).map(action => <TooltipIcon key={action.key} icon={action.icon} label={action.label} tone={action.tone} disabled={processingOrderId === order.id} onClick={() => runAction(order, action)} />)}</div></td>
                        </tr>;
                    }) : <tr><td colSpan="8"><div className="orders-empty"><span><Icon name="receipt" size={28} /></span><strong>{emptyTitle}</strong><p>{emptyMessage}</p></div></td></tr>}</tbody>
                </table>
            </div>
            <Pagination
                page={currentPage}
                pageSize={ORDERS_PER_PAGE}
                totalItems={filteredOrders.length}
                onPageChange={setCurrentPage}
                label={filipino ? 'Paglipat ng pahina ng mga order' : 'Orders pagination'}
                itemLabel={filipino ? 'order' : (filteredOrders.length === 1 ? 'order' : 'orders')}
                filipino={filipino}
            />
        </section>

        <ConfirmationDialog
            open={Boolean(cancellingOrder)}
            title={filipino ? 'Kanselahin ang order?' : 'Cancel order?'}
            description={filipino
                ? `Sigurado ka bang kakanselahin ang ${cancellingOrder ? orderNumber(cancellingOrder) : ''}? Ibabalik sa imbentaryo ang nakalaang stock.`
                : `Are you sure you want to cancel ${cancellingOrder ? orderNumber(cancellingOrder) : ''}? Its reserved stock will be returned to inventory.`}
            cancelLabel={filipino ? 'Panatilihin ang order' : 'Keep order'}
            confirmLabel={filipino ? 'Kanselahin ang order' : 'Cancel order'}
            workingLabel={filipino ? 'Kinakansela…' : 'Cancelling…'}
            busy={Boolean(processingOrderId)}
            icon="close"
            onCancel={() => setCancellingOrder(null)}
            onConfirm={() => performStatusChange(cancellingOrder, 'cancelled')}
        />

        <dialog ref={addModal} className="walk-in-modal" aria-labelledby="walk-in-title" onCancel={event => { event.preventDefault(); if (!processing) setAdding(false); }}>
            <div className="walk-in-modal-heading"><div><h2 id="walk-in-title">{filipino ? 'Magdagdag ng walk-in order' : 'Add walk-in order'}</h2><p>{filipino ? 'Itala ang order na direktang ginawa sa tindahan ng inyong barangay.' : 'Record an order placed directly at your barangay store.'}</p></div><button type="button" className="seller-icon-button" aria-label={filipino ? 'Isara ang pagdagdag ng walk-in order' : 'Close walk-in order'} disabled={processing} onClick={() => setAdding(false)}><Icon name="close" /></button></div>
            <form onSubmit={submit} noValidate>
                <fieldset disabled={processing}>
                    <div className="walk-in-field"><label htmlFor="walk-in-customer">{filipino ? 'Pangalan ng mamimili' : 'Customer name'} <span>({filipino ? 'opsyonal' : 'optional'})</span></label><input id="walk-in-customer" maxLength="120" placeholder={filipino ? 'Walk-in na mamimili' : 'Walk-in customer'} value={data.customer_name} onChange={event => update('customer_name', event.target.value)} /></div>
                    <div className="walk-in-field"><label htmlFor="walk-in-product">{filipino ? 'Produkto' : 'Product'}</label><select id="walk-in-product" value={data.product_id} onChange={event => update('product_id', event.target.value)} aria-invalid={Boolean(errors.product_id)}><option value="">{filipino ? 'Pumili ng produkto' : 'Select a product'}</option>{availableProducts.map(product => <option value={product.id} key={product.id}>{product.name} · {product.stock} {unitLabel(product.unit, filipino)} {filipino ? 'ang available' : 'available'}</option>)}</select>{errors.product_id && <p role="alert">{localizeMessage(errors.product_id, filipino)}</p>}</div>
                    <div className="walk-in-field"><label htmlFor="walk-in-quantity">{filipino ? 'Dami' : 'Quantity'}</label><input id="walk-in-quantity" type="number" min="1" max={selectedProduct?.stock || 1000000} step="1" value={data.quantity} onChange={event => update('quantity', event.target.value)} aria-invalid={Boolean(errors.quantity)} />{errors.quantity && <p role="alert">{localizeMessage(errors.quantity, filipino)}</p>}</div>
                    {selectedProduct && <div className="walk-in-total"><span>{filipino ? 'Kabuuang halaga ng order' : 'Order total'}</span><strong>{money(Number(selectedProduct.price) * (Number(data.quantity) || 0))}</strong></div>}
                    {!availableProducts.length && <p className="walk-in-unavailable">{filipino ? 'Magdagdag muna ng produktong may stock bago magtala ng walk-in order.' : 'Add an in-stock product before recording a walk-in order.'}</p>}
                </fieldset>
                <div className="walk-in-modal-actions"><button type="button" className="seller-outline-button" disabled={processing} onClick={() => setAdding(false)}>{filipino ? 'Kanselahin' : 'Cancel'}</button><button className="seller-save-button" disabled={processing || !availableProducts.length}>{filipino ? (processing ? 'Idinaragdag ang order…' : 'Idagdag ang order') : (processing ? 'Adding order…' : 'Add order')}</button></div>
            </form>
        </dialog>

        <dialog ref={detailModal} className="walk-in-modal order-detail-modal" aria-labelledby="order-detail-title" onCancel={event => { event.preventDefault(); setViewingOrder(null); }}>
            {viewingOrder && <>
                <div className="walk-in-modal-heading"><div><h2 id="order-detail-title">{filipino ? 'Detalye ng order' : 'Order details'}</h2><p>{orderNumber(viewingOrder)}</p></div><button type="button" className="seller-icon-button" aria-label={filipino ? 'Isara ang detalye ng order' : 'Close order details'} onClick={() => setViewingOrder(null)}><Icon name="close" /></button></div>
                <div className="order-detail-body">
                    <div className="order-detail-status"><span className={`order-status-icon order-status-icon--${statuses.find(status => status.value === viewingOrder.status)?.tone || 'pending'}`}><OrderIcon name={statuses.find(status => status.value === viewingOrder.status)?.icon || 'clock'} size={18} /></span><div><span>Status</span><strong>{filipino ? (statuses.find(status => status.value === viewingOrder.status)?.filipinoShort || 'Naghihintay') : (statuses.find(status => status.value === viewingOrder.status)?.shortLabel || 'Pending')}</strong></div></div>
                    <div className="order-detail-product"><ProductThumbnail photoUrl={productById.get(Number(viewingOrder.product_id))?.photo_url} className="order-product-thumb--large" /><div><span>{filipino ? 'Produkto' : 'Product'}</span><strong>{viewingOrder.product_name}</strong><small>{filipino ? `${money(viewingOrder.unit_price)} bawat ${unitLabel(viewingOrder.unit, true)}` : `${money(viewingOrder.unit_price)} per ${viewingOrder.unit}`}</small></div></div>
                    <dl className="order-detail-grid">
                        <div><dt>{filipino ? 'Mamimili' : 'Customer'}</dt><dd>{viewingOrder.customer_name}</dd></div>
                        <div><dt>{filipino ? 'Petsa ng order' : 'Date ordered'}</dt><dd>{dateTime(viewingOrder.created_at, filipino)}</dd></div>
                        <div><dt>{filipino ? 'Uri ng order' : 'Order type'}</dt><dd>Walk-in order</dd></div>
                        <div><dt>{filipino ? 'Dami' : 'Quantity'}</dt><dd>{viewingOrder.quantity} {unitLabel(viewingOrder.unit, filipino)}</dd></div>
                        <div><dt>{filipino ? 'Presyo bawat unit' : 'Unit price'}</dt><dd>{money(viewingOrder.unit_price)}</dd></div>
                        <div><dt>{filipino ? 'Kabuuan' : 'Total'}</dt><dd>{money(viewingOrder.total)}</dd></div>
                    </dl>
                </div>
                <div className="walk-in-modal-actions"><button type="button" className="seller-outline-button" onClick={() => setViewingOrder(null)}>{filipino ? 'Isara' : 'Close'}</button><button type="button" className="seller-save-button order-print-button" onClick={() => setReceiptOrder(viewingOrder)}><OrderIcon name="printer" size={18} />{filipino ? 'I-print ang resibo' : 'Print receipt'}</button></div>
            </>}
        </dialog>

        {receiptOrder && typeof document !== 'undefined' && createPortal(<section className="order-receipt" aria-hidden="true">
            <header className="receipt-brand">
                <Icon name="sprout" size={27} />
                <strong>AgriFarm</strong>
                <span>{auth?.user?.name || (filipino ? 'Tindahan ng barangay' : 'Barangay store')}</span>
                <small>{filipino ? 'Katuwang na barangay · Pasig City' : 'Partner barangay · Pasig City'}</small>
            </header>
            <div className="receipt-heading"><h1>{filipino ? 'RESIBO NG ORDER' : 'ORDER RECEIPT'}</h1><strong>{orderNumber(receiptOrder)}</strong></div>
            <dl className="receipt-meta">
                <div><dt>{filipino ? 'Petsa' : 'Date'}</dt><dd>{receiptDateTime(receiptOrder.created_at, filipino)}</dd></div>
                <div><dt>{filipino ? 'Mamimili' : 'Customer'}</dt><dd>{receiptOrder.customer_name}</dd></div>
                <div><dt>{filipino ? 'Uri ng order' : 'Order type'}</dt><dd>Walk-in</dd></div>
                <div><dt>Status</dt><dd>{filipino ? (statuses.find(status => status.value === receiptOrder.status)?.filipinoShort || 'Naghihintay') : (statuses.find(status => status.value === receiptOrder.status)?.shortLabel || 'Pending')}</dd></div>
            </dl>
            <table className="receipt-items">
                <thead><tr><th>{filipino ? 'Produkto' : 'Item'}</th><th>{filipino ? 'Dami' : 'Qty'}</th><th>{filipino ? 'Halaga' : 'Amount'}</th></tr></thead>
                <tbody><tr><td><strong>{receiptOrder.product_name}</strong><span>{money(receiptOrder.unit_price)} / {unitLabel(receiptOrder.unit, filipino)}</span></td><td>{receiptOrder.quantity}</td><td>{money(receiptOrder.total)}</td></tr></tbody>
            </table>
            <dl className="receipt-totals">
                <div><dt>{filipino ? 'Bahaging kabuuan' : 'Subtotal'}</dt><dd>{money(receiptOrder.total)}</dd></div>
                <div><dt>{filipino ? 'KABUUAN' : 'TOTAL'}</dt><dd>{money(receiptOrder.total)}</dd></div>
            </dl>
            <footer><strong>{filipino ? 'Maraming salamat!' : 'Thank you!'}</strong><span>{filipino ? 'Salamat sa pagsuporta sa sakahan ng inyong barangay.' : 'Thank you for supporting your local barangay farm.'}</span><small>{filipino ? 'Itago ang resibong ito bilang sanggunian sa inyong order.' : 'Keep this receipt for your order reference.'}</small></footer>
        </section>, document.body)}
    </div>;
}
