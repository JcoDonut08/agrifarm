import { router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmationDialog from '../../Components/ConfirmationDialog';
import FormStatus from '../../Components/FormStatus';
import Icon from '../../Components/Storefront/Icon';
import SellerFlashStatus from './SellerFlashStatus';
import { localizeMessage, unitLabel } from './SellerLocale';
import Pagination from './Pagination';
import useTablePagination from '../../Components/useTablePagination';
import '../../../css/seller-harvest-records.css';

const UNITS = ['kg', 'bunch', 'piece', 'head', 'pack'];
const UNIT_DEFAULTS = { kg: 'kg', piece: 'piece', pieces: 'piece', bunch: 'bunch', bunches: 'bunch', head: 'head', heads: 'head', pack: 'pack', packs: 'pack' };

function today() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const value = type => parts.find(part => part.type === type).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
}

function initialForm(products) {
    const product = products[0];
    return { product_id: product ? String(product.id) : '', quantity: '', unit: product ? defaultUnit(product.unit) : 'kg', measured_weight_kg: '', harvest_date: today(), notes: '' };
}

function defaultUnit(unit) {
    return UNIT_DEFAULTS[unit] || '';
}

function formatQuantity(value) {
    const quantity = Number(value);
    return Number.isFinite(quantity) ? new Intl.NumberFormat('en-PH', { maximumFractionDigits: 3 }).format(quantity) : '—';
}

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function ProductIdentity({ productId, productName, products, detail = false }) {
    const product = products.get(String(productId));
    const initial = productName.trim().slice(0, 1) || '?';

    return <div className="harvest-product-cell">
        <span className="harvest-product-thumb" aria-hidden="true">
            {product?.photo_url && <img src={product.photo_url} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />}
            <span>{initial}</span>
        </span>
        <div><strong>{productName}</strong>{detail && <small>Harvest entry</small>}</div>
    </div>;
}

export default function HarvestRecords({ products = [], harvestRecords = [], filipino = false }) {
    const { flash } = usePage().props;
    const [filters, setFilters] = useState({ product: '', from: '', to: '', search: '' });
    const [page, setPage] = useState(1);
    const [editorOpen, setEditorOpen] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [form, setForm] = useState(() => initialForm(products));
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const editor = useRef(null);
    const detail = useRef(null);

    useEffect(() => {
        if (!editorOpen) { editor.current?.close(); return; }
        const overflow = document.body.style.overflow;
        editor.current?.showModal();
        document.body.style.overflow = 'hidden';
        editor.current?.querySelector('#harvest-product')?.focus();
        return () => { document.body.style.overflow = overflow; };
    }, [editorOpen]);
    useEffect(() => {
        if (!viewing) { detail.current?.close(); return; }
        detail.current?.showModal();
    }, [viewing]);
    useEffect(() => {
        if (!editorOpen || !Object.values(errors).some(Boolean)) return;
        const invalid = editor.current?.querySelector('[aria-invalid="true"]');
        invalid?.focus();
        invalid?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, [editorOpen, errors]);

    const filteredRecords = useMemo(() => harvestRecords.filter(record => {
        const date = String(record.harvest_date).slice(0, 10);
        const search = filters.search.trim().toLowerCase();
        return (!filters.product || String(record.product_id) === filters.product)
            && (!filters.from || date >= filters.from)
            && (!filters.to || date <= filters.to)
            && (!search || `${record.product_name} ${record.unit} ${record.notes || ''}`.toLowerCase().includes(search));
    }), [harvestRecords, filters]);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
    const visibleRecords = filteredRecords.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    const productsById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);
    const summary = useMemo(() => {
        const groups = new Map();
        filteredRecords.forEach(record => {
            const key = `${record.product_id || record.product_name}::${record.unit}`;
            const current = groups.get(key) || { product_id: record.product_id, product_name: record.product_name, unit: record.unit, quantity: 0, harvest_date: record.harvest_date };
            current.quantity += Number(record.quantity);
            if (String(record.harvest_date) > String(current.harvest_date)) current.harvest_date = record.harvest_date;
            groups.set(key, current);
        });
        return [...groups.values()].sort((a, b) => a.product_name.localeCompare(b.product_name) || a.unit.localeCompare(b.unit));
    }, [filteredRecords]);
    const summaryPages = useTablePagination(summary, JSON.stringify(filters));
    const latestRecord = harvestRecords[0];
    const hasFilters = Object.values(filters).some(Boolean);

    useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

    function updateFilter(key, value) {
        setFilters(current => ({ ...current, [key]: value }));
        setPage(1);
    }
    function openEditor(record = null) {
        setEditingRecord(record);
        setForm(record ? {
            product_id: String(record.product_id || ''),
            quantity: String(Number(record.quantity)),
            unit: record.unit,
            measured_weight_kg: record.measured_weight_kg ?? '',
            harvest_date: String(record.harvest_date).slice(0, 10),
            notes: record.notes || '',
        } : initialForm(products));
        setErrors({});
        setEditorOpen(true);
    }
    function updateForm(key, value) {
        setForm(current => ({ ...current, [key]: value, ...(key === 'unit' && value !== current.unit ? { measured_weight_kg: '' } : {}) }));
        setErrors(current => ({ ...current, [key]: undefined }));
    }
    function chooseProduct(productId) {
        const product = products.find(item => String(item.id) === productId);
        setForm(current => ({ ...current, product_id: productId, unit: product ? defaultUnit(product.unit) : current.unit, measured_weight_kg: '' }));
        setErrors(current => ({ ...current, product_id: undefined }));
    }
    function saveFailed() {
        setErrors(current => ({ ...current, submit: filipino ? 'Hindi ma-save ang tala. Pakisubukan muli.' : 'The record could not be saved. Please try again.' }));
        return false;
    }
    function deleteFailed() {
        setDeleteError(filipino ? 'Hindi mabura ang tala. Pakisubukan muli.' : 'The record could not be deleted. Please try again.');
        return false;
    }
    function submit(event) {
        event.preventDefault();
        if (processing) return;
        const nextErrors = {};
        if (!form.product_id) nextErrors.product_id = 'Choose one of your existing products.';
        if (!form.quantity || !Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0) nextErrors.quantity = 'Enter a harvested quantity greater than zero.';
        if (!form.unit) nextErrors.unit = 'Choose a unit.';
        if (form.unit !== 'kg' && form.measured_weight_kg !== '' && (!Number.isFinite(Number(form.measured_weight_kg)) || Number(form.measured_weight_kg) <= 0)) {
            nextErrors.measured_weight_kg = filipino ? 'Ilagay ang aktuwal na kabuuang timbang na higit sa 0 kg.' : 'Enter the measured total weight greater than 0 kg.';
        }
        if (!form.harvest_date) nextErrors.harvest_date = 'Choose the harvest date.';
        if (form.harvest_date && form.harvest_date > today()) nextErrors.harvest_date = 'Harvest date cannot be in the future.';
        if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
        setErrors({});
        
        setProcessing(true);
        const method = editingRecord ? 'patch' : 'post';
        const url = editingRecord ? `/seller/crop-yields/${editingRecord.id}` : '/seller/crop-yields';
        
        const payload = { ...form, measured_weight_kg: form.unit === 'kg' || form.measured_weight_kg === '' ? null : form.measured_weight_kg, language: filipino ? 'filipino' : 'english' };
        router[method](url, payload, {
            preserveScroll: true,
            onError: setErrors,
            onNetworkError: saveFailed,
            onHttpException: saveFailed,
            onSuccess: () => { setEditorOpen(false); setEditingRecord(null); },
            onFinish: () => setProcessing(false),
        });
    }
    function closeEditor() { if (!processing) { setEditorOpen(false); setEditingRecord(null); } }
    function deleteRecord() {
        if (!deleteTarget || deleting) return;
        setDeleteError('');
        setDeleting(true);
        router.delete(`/seller/crop-yields/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
            onError: deleteFailed,
            onNetworkError: deleteFailed,
            onHttpException: deleteFailed,
            onFinish: () => setDeleting(false),
        });
    }

    return <section className="harvest-records-page" aria-labelledby="harvest-records-title">
        <div className="harvest-page-heading">
            <div><h1 id="harvest-records-title" className="seller-page-title">{filipino ? 'Mga Talaan ng Ani' : 'Harvest Records'}</h1><p>{filipino ? 'Itala at subaybayan ang mga naaning produktong pang-agrikultura.' : 'Record and monitor your harvested agricultural products.'}</p></div>
        </div>
        <SellerFlashStatus flash={flash} filipino={filipino} />

        <div className="seller-stats harvest-stat-grid" aria-label="Harvest record summary">
            <article className="seller-stat seller-stat--sales harvest-stat"><div className="seller-stat-heading"><h2>{filipino ? 'Kabuuang tala ng ani' : 'Total Harvest Records'}</h2><span className="seller-stat-icon"><Icon name="receipt" /></span></div><strong className="seller-stat-value">{harvestRecords.length}</strong><p>{filipino ? 'Aktuwal na tala ng ani' : 'Actual harvest entries'}</p></article>
            <article className="seller-stat seller-stat--sales harvest-stat"><div className="seller-stat-heading"><h2>{filipino ? 'Mga produktong inani' : 'Products Harvested'}</h2><span className="seller-stat-icon"><Icon name="leaf" /></span></div><strong className="seller-stat-value">{new Set(harvestRecords.map(record => record.product_id || record.product_name)).size}</strong><p>{filipino ? 'Magkakaibang produktong may tala' : 'Distinct products recorded'}</p></article>
            <article className="seller-stat seller-stat--sales harvest-stat"><div className="seller-stat-heading"><h2>{filipino ? 'Pinakahuling ani' : 'Latest Harvest'}</h2><span className="seller-stat-icon"><Icon name="sprout" /></span></div><strong className="seller-stat-value harvest-stat-date">{latestRecord ? formatDate(latestRecord.harvest_date) : '—'}</strong><p>{latestRecord ? latestRecord.product_name : (filipino ? 'Wala pang tala' : 'No records yet')}</p></article>
        </div>

        <section className="seller-panel harvest-history-panel" aria-labelledby="harvest-history-title">
            <div className="harvest-panel-heading"><div><h2 id="harvest-history-title"><strong>{filipino ? 'Kasaysayan ng ani' : 'Harvest History'}</strong></h2><p>{filipino ? 'Ang mga tala rito ay hiwalay sa available na stock at mga nabenta.' : 'These records are kept separate from available stock and sales.'}</p></div><button type="button" className="seller-save-button harvest-record-button harvest-history-action" onClick={() => openEditor()}><Icon name="plus" />{filipino ? 'Itala ang ani' : 'Record Harvest'}</button></div>
            <div className="harvest-filters" aria-label="Filter harvest history">
                <label><span>{filipino ? 'Produkto' : 'Product'}</span><select value={filters.product} onChange={event => updateFilter('product', event.target.value)}><option value="">{filipino ? 'Lahat ng produkto' : 'All products'}</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                <label><span>{filipino ? 'Mula' : 'From'}</span><input type="date" value={filters.from} max={filters.to || today()} onChange={event => updateFilter('from', event.target.value)} /></label>
                <label><span>{filipino ? 'Hanggang' : 'To'}</span><input type="date" value={filters.to} min={filters.from || undefined} max={today()} onChange={event => updateFilter('to', event.target.value)} /></label>
                <label className="harvest-search"><span>{filipino ? 'Maghanap' : 'Search'}</span><div><Icon name="search" size={17} /><input type="search" value={filters.search} onChange={event => updateFilter('search', event.target.value)} placeholder={filipino ? 'Produkto, unit, o tala' : 'Product, unit, or notes'} /></div></label>
                {hasFilters && <button type="button" className="harvest-clear-filters" onClick={() => { setFilters({ product: '', from: '', to: '', search: '' }); setPage(1); }}>{filipino ? 'I-clear' : 'Clear'}</button>}
            </div>
            {harvestRecords.length === 0 ? <div className="seller-empty harvest-empty"><span className="harvest-empty-icon"><Icon name="sprout" size={27} /></span><strong>{filipino ? 'Wala pang naitalang ani' : 'No harvest records yet'}</strong><p>{filipino ? 'Gamitin ang Record Harvest sa itaas upang itala ang aktuwal na ani.' : 'Use Record Harvest above to add an actual harvest entry.'}</p>{products.length === 0 && <p className="harvest-empty-note">{filipino ? 'Magdagdag muna ng produkto bago magtala ng ani.' : 'Add a product first before recording a harvest.'}</p>}</div> : filteredRecords.length === 0 ? <div className="seller-empty harvest-empty"><span className="harvest-empty-icon"><Icon name="search" size={24} /></span><strong>{filipino ? 'Walang katugmang tala' : 'No matching records'}</strong><p>{filipino ? 'Baguhin o i-clear ang mga filter upang makita ang ibang tala ng ani.' : 'Adjust or clear the filters to see other harvest records.'}</p><button type="button" className="seller-outline-button harvest-empty-clear" onClick={() => setFilters({ product: '', from: '', to: '', search: '' })}>{filipino ? 'I-clear ang mga filter' : 'Clear filters'}</button></div> : <><div className="seller-table-wrap harvest-table-wrap"><table><thead><tr><th>Date</th><th>Product</th><th>Quantity</th><th>Unit</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleRecords.map(record => <tr key={record.id}><td data-label="Date"><time dateTime={record.harvest_date}>{formatDate(record.harvest_date)}</time></td><td data-label="Product"><ProductIdentity productId={record.product_id} productName={record.product_name} products={productsById} detail /></td><td data-label="Quantity"><strong className="harvest-quantity">{formatQuantity(record.quantity)}</strong></td><td data-label="Unit"><span className="harvest-unit">{record.unit}</span></td><td data-label="Status"><span className="harvest-status"><Icon name="check" size={14} />{filipino ? 'Naitala' : 'Recorded'}</span></td><td data-label="Actions"><div className="harvest-record-actions"><button type="button" className="harvest-view-button" onClick={() => setViewing(record)}><Icon name="eye" size={16} />{filipino ? 'Tingnan' : 'View'}</button><button type="button" className="harvest-action-button" onClick={() => openEditor(record)}><Icon name="edit" size={15} />{filipino ? 'I-edit' : 'Edit'}</button><button type="button" className="harvest-action-button harvest-action-button--danger" onClick={() => setDeleteTarget(record)}><Icon name="trash" size={15} />{filipino ? 'Burahin' : 'Delete'}</button></div></td></tr>)}</tbody></table></div><Pagination page={page} pageSize={rowsPerPage} onPageSizeChange={setRowsPerPage} totalItems={filteredRecords.length} onPageChange={setPage} label="Harvest history pagination" itemLabel="records" filipino={filipino} className="harvest-pagination" /></>}
        </section>

        <section className="seller-panel harvest-summary-panel" aria-labelledby="harvest-summary-title">
            <div className="harvest-panel-heading"><div><h2 id="harvest-summary-title"><strong>{filipino ? 'Buod ng ani' : 'Harvest Summary'}</strong></h2><p>{hasFilters ? (filipino ? 'Batay sa kasalukuyang mga filter.' : 'Based on the current history filters.') : (filipino ? 'Pinagsama lamang ang mga tala na may parehong unit.' : 'Only records with the same unit are combined.')}</p></div></div>
            {summary.length ? <><div className="seller-table-wrap harvest-table-wrap"><table><thead><tr><th>Product</th><th>Total Recorded</th><th>Unit</th><th>Last Harvest</th></tr></thead><tbody>{summaryPages.visibleItems.map(row => <tr key={`${row.product_name}-${row.unit}`}><td data-label="Product"><ProductIdentity productId={row.product_id} productName={row.product_name} products={productsById} /></td><td data-label="Total Recorded"><strong className="harvest-quantity">{formatQuantity(row.quantity)}</strong></td><td data-label="Unit"><span className="harvest-unit">{row.unit}</span></td><td data-label="Last Harvest"><time dateTime={row.harvest_date}>{formatDate(row.harvest_date)}</time></td></tr>)}</tbody></table></div><Pagination page={summaryPages.page} pageSize={summaryPages.pageSize} totalItems={summary.length} onPageChange={summaryPages.setPage} onPageSizeChange={summaryPages.setPageSize} label="Harvest summary pagination" itemLabel={filipino ? "produkto" : "products"} filipino={filipino} /></> : <div className="harvest-summary-empty"><Icon name="leaf" /><p>{filipino ? 'Lalabas dito ang mga kabuuan sa sandaling may tala ng ani.' : 'Totals will appear here once harvest records are available.'}</p></div>}
        </section>

        <dialog ref={editor} className="harvest-dialog" aria-labelledby="record-harvest-title"
            onCancel={event => { event.preventDefault(); closeEditor(); }}
            onClick={event => { if (!processing && event.target === editor.current) closeEditor(); }}>
            <div className="harvest-dialog-heading">
                <div><h2 id="record-harvest-title">{editingRecord ? (filipino ? 'I-edit ang tala ng ani' : 'Edit Harvest Record') : (filipino ? 'Itala ang ani' : 'Record Harvest')}</h2>
                    <p>{editingRecord ? (filipino ? 'I-update ang tala ng aktuwal na ani.' : 'Update this actual harvest entry. Available inventory remains unchanged.') : (filipino ? 'Gumawa ng tala mula sa aktuwal na ani, hindi mula sa available na stock.' : 'Create a record from an actual harvest, not from available inventory.')}</p></div>
                <button type="button" className="seller-icon-button" onClick={closeEditor} disabled={processing} aria-label={filipino ? 'Isara ang form ng ani' : 'Close record harvest form'}><Icon name="close" /></button>
            </div>
            <form onSubmit={submit} noValidate>
                <fieldset disabled={processing}><div className="harvest-form-grid">
                    <label><span>{filipino ? 'Produkto' : 'Product'}</span>
                        <select id="harvest-product" value={form.product_id} onChange={event => chooseProduct(event.target.value)} aria-invalid={Boolean(errors.product_id)} required>
                            <option value="">{filipino ? 'Pumili ng produkto' : 'Select a product'}</option>
                            {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>{errors.product_id && <small role="alert">{localizeMessage(errors.product_id, filipino)}</small>}
                    </label>
                    <label><span>{filipino ? 'Dami' : 'Quantity'}</span>
                        <input type="number" min="0.001" max="999999999.999" step="0.001" inputMode="decimal" value={form.quantity} onChange={event => updateForm('quantity', event.target.value)} placeholder="0" aria-invalid={Boolean(errors.quantity)} required />
                        {errors.quantity && <small role="alert">{localizeMessage(errors.quantity, filipino)}</small>}
                    </label>
                    <label><span>{filipino ? 'Yunit' : 'Unit'}</span>
                        <select value={form.unit} onChange={event => updateForm('unit', event.target.value)} aria-invalid={Boolean(errors.unit)} required>
                            <option value="">{filipino ? 'Pumili ng yunit' : 'Choose a unit'}</option>
                            {[...UNITS, ...(editingRecord && !UNITS.includes(editingRecord.unit) ? [editingRecord.unit] : [])].map(unit => <option key={unit} value={unit}>{unitLabel(unit, filipino)}</option>)}
                        </select>
                        {errors.unit ? <small role="alert">{localizeMessage(errors.unit, filipino)}</small> : <em>{filipino ? 'Gamit ang yunit ng produkto kung mayroon.' : 'Defaults to the product’s selling unit when available.'}</em>}
                    </label>
                    <label><span>{filipino ? 'Petsa ng ani' : 'Harvest Date'}</span>
                        <input type="date" max={today()} value={form.harvest_date} onChange={event => updateForm('harvest_date', event.target.value)} aria-invalid={Boolean(errors.harvest_date)} required />
                        {errors.harvest_date && <small role="alert">{localizeMessage(errors.harvest_date, filipino)}</small>}
                    </label>
                    {form.unit && form.unit !== 'kg' && <label className="harvest-weight">
                        <span>{filipino ? 'Kabuuang timbang ng ani (kg)' : 'Total harvest weight (kg)'} <i>{filipino ? '(opsyonal)' : '(optional)'}</i></span>
                        <input type="number" min="0.001" max="999999999.999" step="0.001" inputMode="decimal" value={form.measured_weight_kg}
                            onChange={event => updateForm('measured_weight_kg', event.target.value)} placeholder={filipino ? 'Hal. 5' : 'e.g. 5'}
                            aria-invalid={Boolean(errors.measured_weight_kg)} aria-describedby="harvest-weight-help" />
                        <em id="harvest-weight-help">{filipino ? 'Timbangin ang buong ani para sa pagtataya.' : 'Weigh the whole harvest for forecasting.'}</em>
                        {errors.measured_weight_kg && <small role="alert">{localizeMessage(errors.measured_weight_kg, filipino)}</small>}
                    </label>}
                    <label className="harvest-notes"><span>{filipino ? 'Mga tala' : 'Notes'} <i>{filipino ? '(opsyonal)' : '(optional)'}</i></span>
                        <textarea rows="4" maxLength="1000" value={form.notes} onChange={event => updateForm('notes', event.target.value)} placeholder={filipino ? 'Karagdagang tala tungkol sa ani' : 'Optional notes about the harvest, condition, or other details'} />
                        {errors.notes && <small role="alert">{localizeMessage(errors.notes, filipino)}</small>}
                    </label>
                </div></fieldset>
                {(errors.submit || errors.request) && <p className="app-field-error" role="alert">{errors.submit || errors.request}</p>}
                <div className="harvest-form-actions">
                    <button type="button" className="seller-outline-button" onClick={closeEditor} disabled={processing}>{filipino ? 'Kanselahin' : 'Cancel'}</button>
                    <button className="seller-save-button" disabled={processing || !products.length}>{processing ? (filipino ? 'Sine-save…' : 'Saving…') : editingRecord ? (filipino ? 'I-save ang pagbabago' : 'Save changes') : (filipino ? 'I-save ang tala ng ani' : 'Save Harvest Record')}</button>
                </div>
            </form>
        </dialog>

        <ConfirmationDialog open={Boolean(deleteTarget)} title={filipino ? 'Burahin ang tala ng ani?' : 'Delete harvest record?'} description={deleteTarget ? (filipino ? `Burahin ang tala ng ${formatQuantity(deleteTarget.quantity)} ${unitLabel(deleteTarget.unit, true)} para sa ${deleteTarget.product_name}? Hindi ito maibabalik.` : `Delete the ${formatQuantity(deleteTarget.quantity)} ${unitLabel(deleteTarget.unit, false)} record for ${deleteTarget.product_name}? This cannot be undone.`) : ''} confirmLabel={filipino ? 'Burahin ang tala' : 'Delete record'} cancelLabel={filipino ? 'Panatilihin ang tala' : 'Keep record'} workingLabel={filipino ? 'Binubura…' : 'Deleting…'} busy={deleting} onConfirm={deleteRecord} onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}>
            {deleteError && <FormStatus tone="error">{deleteError}</FormStatus>}
        </ConfirmationDialog>

        <dialog ref={detail} className="harvest-dialog harvest-detail-dialog" aria-labelledby="harvest-detail-title" onCancel={() => setViewing(null)}>{viewing && <>
            <div className="harvest-dialog-heading"><div><h2 id="harvest-detail-title">{filipino ? 'Tala ng ani' : 'Harvest Record'}</h2><p>{filipino ? 'Detalye ng naitalang ani' : 'Recorded harvest details'}</p></div><button type="button" className="seller-icon-button" onClick={() => setViewing(null)} aria-label={filipino ? 'Isara ang detalye ng ani' : 'Close harvest details'}><Icon name="close" /></button></div>
            <dl>
                <div><dt>{filipino ? 'Produkto' : 'Product'}</dt><dd>{viewing.product_name}</dd></div>
                <div><dt>{filipino ? 'Petsa ng ani' : 'Harvest date'}</dt><dd>{formatDate(viewing.harvest_date)}</dd></div>
                <div><dt>{filipino ? 'Dami' : 'Quantity'}</dt><dd>{formatQuantity(viewing.quantity)} {unitLabel(viewing.unit, filipino)}</dd></div>
                {viewing.unit !== 'kg' && viewing.measured_weight_kg !== null && viewing.measured_weight_kg !== undefined && <div><dt>{filipino ? 'Kabuuang timbang ng ani' : 'Total harvest weight'}</dt><dd>{formatQuantity(viewing.measured_weight_kg)} kg</dd></div>}
                <div><dt>{filipino ? 'Katayuan' : 'Status'}</dt><dd><span className="harvest-status"><Icon name="check" size={14} />{filipino ? 'Naitala' : 'Recorded'}</span></dd></div>
                <div className="harvest-detail-notes"><dt>{filipino ? 'Mga tala' : 'Notes'}</dt><dd>{viewing.notes || (filipino ? 'Walang karagdagang tala.' : 'No notes were added.')}</dd></div>
            </dl>
        </>}</dialog>
    </section>;
}
