import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import FormField from '../../Components/FormField';
import Icon from '../../Components/Storefront/Icon';
import SellerFlashStatus from './SellerFlashStatus';
import Pagination from './Pagination';
import { categoryLabel, localizeMessage, unitLabel } from './SellerLocale';
import ConfirmationDialog from './ConfirmationDialog';
import '../../../css/seller-products.css';

const initial = { name: '', category: '', description: '', price: '', unit: 'kg', stock: '', threshold: '5' };
const PRODUCTS_PER_PAGE = 8;
export default function Products({ filipino = false }) {
    const { auth, products = [], flash } = usePage().props;
    const [editing, setEditing] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [data, setData] = useState(initial);
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [deleting, setDeleting] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    const [managementError, setManagementError] = useState('');
    const fileInput = useRef(null);
    const form = useRef(null);
    const modal = useRef(null);
    const selectAllInput = useRef(null);
    const allSelected = products.length > 0 && selectedIds.length === products.length;
    const totalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
    const visibleProducts = products.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);
    useEffect(() => {
        if (!editing) { modal.current?.close(); return; }
        const previousOverflow = document.body.style.overflow;
        modal.current.showModal();
        document.body.style.overflow = 'hidden';
        modal.current.querySelector('#product-name')?.focus();
        return () => { document.body.style.overflow = previousOverflow; };
    }, [editing]);
    useEffect(() => {
        if (!photo) { setPreview(editingProduct?.photo_url || null); return; }
        const url = URL.createObjectURL(photo);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photo, editingProduct]);
    useEffect(() => {
        setSelectedIds(current => current.filter(id => products.some(product => product.id === id)));
    }, [products]);
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);
    useEffect(() => {
        if (selectAllInput.current) selectAllInput.current.indeterminate = selectedIds.length > 0 && !allSelected;
    }, [allSelected, selectedIds.length]);

    function openCreate() {
        setEditingProduct(null);
        setData(initial);
        setPhoto(null);
        setErrors({});
        setEditing(true);
        if (fileInput.current) fileInput.current.value = '';
    }
    function openEdit(product) {
        setEditingProduct(product);
        setData({ name: product.name, category: product.category, description: product.description || '', price: String(product.price), unit: product.unit, stock: String(product.stock), threshold: String(product.threshold) });
        setPhoto(null);
        setErrors({});
        setEditing(true);
        if (fileInput.current) fileInput.current.value = '';
    }
    function closeEditor() {
        if (!processing) setEditing(false);
    }
    function update(key, value) {
        setData(current => ({ ...current, [key]: value }));
        setErrors(current => ({ ...current, [key]: undefined }));

    }
    function choosePhoto(file) {

        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setErrors(current => ({ ...current, photo: filipino ? 'Pumili ng JPG, PNG, o WebP na larawang mas maliit sa 5 MB.' : 'Choose a JPG, PNG or WebP image smaller than 5 MB.' }));
            return;
        }
        setPhoto(file);
        setErrors(current => ({ ...current, photo: undefined }));
    }
    function review(event) {
        event.preventDefault();
        const next = {};
        if (!data.name.trim()) next.name = filipino ? 'Ilagay ang pangalan ng produkto.' : 'Enter a product name.';
        if (!data.category) next.category = filipino ? 'Pumili ng kategorya.' : 'Choose a category.';
        if (!editingProduct && !photo) next.photo = filipino ? 'Magdagdag ng larawan ng produkto.' : 'Add a product photo.';
        if (!data.price || !Number.isFinite(Number(data.price)) || Number(data.price) <= 0) next.price = filipino ? 'Maglagay ng presyong mas mataas sa zero.' : 'Enter a price greater than zero.';
        if (data.stock === '' || !Number.isInteger(Number(data.stock)) || Number(data.stock) < 0) next.stock = filipino ? 'Maglagay ng buong bilang ng mga available na unit.' : 'Enter a whole number of available units.';
        if (data.threshold === '' || !Number.isInteger(Number(data.threshold)) || Number(data.threshold) < 0) next.threshold = filipino ? 'Maglagay ng buong bilang ng mga unit.' : 'Enter a whole number of units.';
        setErrors(next);
        if (!Object.keys(next).length && !processing) {
            setProcessing(true);
            const endpoint = editingProduct ? `/seller/products/${editingProduct.id}` : '/seller/products';
            const payload = editingProduct ? { ...data, photo, _method: 'patch' } : { ...data, photo };
            router.post(endpoint, payload, {
                forceFormData: true,
                preserveScroll: true,
                onError: serverErrors => {
                    setErrors(serverErrors);
                    requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
                },
                onSuccess: () => {
                    if (!editingProduct) setCurrentPage(1);
                    setEditing(false);
                    setEditingProduct(null);
                    setData(initial);
                    setPhoto(null);
                    setErrors({});
                    if (fileInput.current) fileInput.current.value = '';
                },
                onFinish: () => setProcessing(false),
            });
        }
        if (Object.keys(next).length) requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
    }
    function toggleProduct(productId) {
        setSelectedIds(current => current.includes(productId) ? current.filter(id => id !== productId) : [...current, productId]);
    }
    function toggleAll() {
        setSelectedIds(allSelected ? [] : products.map(product => product.id));
    }
    function deleteProduct(product) {
        setConfirmation({ type: 'single', product });
    }
    function performProductDelete(product) {
        setDeleting(product.id);
        setManagementError('');
        router.delete(`/seller/products/${product.id}`, {
            preserveScroll: true,
            onError: () => setManagementError(filipino ? 'Hindi nabura ang produkto.' : 'The product could not be deleted.'),
            onFinish: () => { setDeleting(null); setConfirmation(null); },
        });
    }
    function deleteSelected() {
        if (!selectedIds.length) return;
        setConfirmation({ type: 'bulk', ids: [...selectedIds], count: selectedIds.length });
    }
    function performSelectedDelete(ids) {
        setDeleting('bulk');
        setManagementError('');
        router.delete('/seller/products', {
            data: { product_ids: ids },
            preserveScroll: true,
            onError: serverErrors => setManagementError(filipino ? localizeMessage(serverErrors.product_ids, true) || 'Hindi nabura ang mga napiling produkto.' : serverErrors.product_ids || 'The selected products could not be deleted.'),
            onSuccess: () => setSelectedIds([]),
            onFinish: () => { setDeleting(null); setConfirmation(null); },
        });
    }
    function confirmDeletion() {
        if (confirmation?.type === 'single') performProductDelete(confirmation.product);
        if (confirmation?.type === 'bulk') performSelectedDelete(confirmation.ids);
    }
    const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value));
    return <>
        <div className="product-page-heading"><div><h1 className="seller-page-title">{filipino ? 'Mga Produkto' : 'Products'}</h1><p>{filipino ? 'Pamahalaan ang mga ani at available na stock ng inyong barangay.' : 'Manage your barangay’s produce and availability.'}</p></div><button className="seller-save-button product-button" onClick={openCreate}><Icon name="plus" />{filipino ? 'Magdagdag ng produkto' : 'Add product'}</button></div>
        <SellerFlashStatus flash={flash} filipino={filipino} />
        {products.length ? <>
            <div className="product-list-summary"><div><strong>{products.length} {filipino ? 'produkto' : (products.length === 1 ? 'product' : 'products')}</strong><span>{filipino ? 'sa kasalukuyang imbentaryo' : 'in your current inventory'}</span></div><div className="product-stock-summary"><span className="product-inventory-chip product-inventory-chip--in"><strong>{products.filter(product => product.stock > 0).length}</strong> {filipino ? 'may stock' : 'in stock'}</span><span className="product-inventory-chip product-inventory-chip--out"><strong>{products.filter(product => product.stock === 0).length}</strong> {filipino ? 'ubos ang stock' : 'out of stock'}</span></div></div>
            <section className="product-bulk-bar" aria-label={filipino ? 'Mga aksyon para sa maraming produkto' : 'Bulk product actions'}>
                <label className="product-select-all"><input ref={selectAllInput} type="checkbox" checked={allSelected} onChange={toggleAll} /><span><strong>{filipino ? 'Piliin lahat ng produkto' : 'Select all products'}</strong><small>{filipino ? 'Pumili ng maraming produkto para sabay-sabay silang burahin.' : 'Choose multiple products to remove them together.'}</small></span></label>
                <div className="product-bulk-actions"><span aria-live="polite">{selectedIds.length} {filipino ? 'ang napili' : 'selected'}</span><button type="button" disabled={!selectedIds.length || Boolean(deleting)} onClick={deleteSelected}><Icon name="trash" size={17} />{filipino ? 'Burahin ang napili' : 'Delete selected'}</button></div>
            </section>
            {managementError && <p className="product-management-error" role="alert">{managementError}</p>}
            <div className="seller-product-list">{visibleProducts.map(product => {
                const stockState = product.stock === 0 ? 'out' : product.stock <= product.threshold ? 'low' : 'in';
                const stockLabel = filipino ? (stockState === 'out' ? 'Ubos na ang stock' : stockState === 'low' ? 'Kaunti na ang stock' : 'May stock') : (stockState === 'out' ? 'Out of stock' : stockState === 'low' ? 'Low stock' : 'In stock');
                const selected = selectedIds.includes(product.id);
                return <article className={`seller-product-card ${selected ? 'is-selected' : ''}`} key={product.id}>
                    <div className="seller-product-image"><img src={product.photo_url} alt={product.name} /><label className="product-card-select"><input type="checkbox" checked={selected} onChange={() => toggleProduct(product.id)} aria-label={filipino ? `Piliin ang ${product.name}` : `Select ${product.name}`} /><span>{filipino ? 'Piliin' : 'Select'}</span></label><span className={`product-stock-badge product-stock-badge--${stockState}`}>{stockLabel}</span></div>
                    <div className="seller-product-body"><span className="product-preview-category">{categoryLabel(product.category, filipino)}</span><h2>{product.name}</h2><p className={`seller-product-description ${product.description ? '' : 'is-empty'}`}>{product.description || (filipino ? 'Walang ibinigay na paglalarawan.' : 'No description provided.')}</p><div className="seller-product-footer"><div><strong>{money(product.price)}</strong><span>{filipino ? `bawat ${unitLabel(product.unit, true)}` : `per ${product.unit}`}</span></div><p><strong>{product.stock}</strong> {filipino ? `${unitLabel(product.unit, true)} ang available` : `${product.unit} available`}</p></div><div className="product-card-actions" aria-label={filipino ? `Mga aksyon para sa ${product.name}` : `Actions for ${product.name}`}><button type="button" className="product-card-action" aria-label={filipino ? `I-edit ang ${product.name}` : `Edit ${product.name}`} data-tooltip={filipino ? 'I-edit ang produkto' : 'Edit product'} disabled={Boolean(deleting)} onClick={() => openEdit(product)}><Icon name="edit" size={17} /></button><button type="button" className="product-card-action product-card-action--danger" aria-label={filipino ? `Burahin ang ${product.name}` : `Delete ${product.name}`} data-tooltip={filipino ? 'Burahin ang produkto' : 'Delete product'} disabled={Boolean(deleting)} onClick={() => deleteProduct(product)}><Icon name="trash" size={17} /></button></div></div>
                </article>;
            })}</div>
            <Pagination
                page={currentPage}
                pageSize={PRODUCTS_PER_PAGE}
                totalItems={products.length}
                onPageChange={setCurrentPage}
                label={filipino ? 'Paglipat ng pahina ng mga produkto' : 'Products pagination'}
                itemLabel={filipino ? 'produkto' : (products.length === 1 ? 'product' : 'products')}
                filipino={filipino}
                className="product-pagination"
            />
        </> : <section className="seller-panel"><div className="seller-empty"><Icon name="sprout" size={36} /><strong>{filipino ? 'Dito magsisimula ang susunod ninyong ani' : 'Your next harvest starts here'}</strong><p>{filipino ? 'Idagdag ang larawan, presyo, at available na stock ng inyong unang produkto.' : 'Add your first product’s photo, price and available stock.'}</p><button className="seller-save-button product-empty-action" onClick={openCreate}><Icon name="plus" />{filipino ? 'Idagdag ang unang produkto' : 'Add your first product'}</button></div></section>}
        <ConfirmationDialog
            open={Boolean(confirmation)}
            title={filipino ? (confirmation?.type === 'bulk' ? 'Burahin ang mga napiling produkto?' : 'Burahin ang produkto?') : (confirmation?.type === 'bulk' ? 'Delete selected products?' : 'Delete product?')}
            description={confirmation?.type === 'bulk'
                ? (filipino ? `Sigurado ka bang buburahin ang ${confirmation.count} napiling produkto? Hindi na maibabalik ang mga ito.` : `Are you sure you want to delete ${confirmation.count} selected ${confirmation.count === 1 ? 'product' : 'products'}? This action cannot be undone.`)
                : (filipino ? `Sigurado ka bang buburahin ang “${confirmation?.product?.name || ''}”? Hindi na ito maibabalik.` : `Are you sure you want to delete “${confirmation?.product?.name || ''}”? This action cannot be undone.`)}
            cancelLabel={filipino ? 'Huwag burahin' : (confirmation?.type === 'bulk' ? 'Keep products' : 'Keep product')}
            confirmLabel={filipino ? (confirmation?.type === 'bulk' ? 'Burahin ang mga produkto' : 'Burahin ang produkto') : (confirmation?.type === 'bulk' ? 'Delete products' : 'Delete product')}
            workingLabel={filipino ? 'Binubura…' : 'Deleting…'}
            busy={Boolean(deleting)}
            onCancel={() => setConfirmation(null)}
            onConfirm={confirmDeletion}
        />
        <dialog ref={modal} className="product-modal" aria-labelledby="add-product-title" aria-describedby="add-product-description" onCancel={event => { event.preventDefault(); closeEditor(); }} onClick={event => {
            if (processing || event.target !== modal.current) return;
            const bounds = modal.current.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeEditor();
        }}>
        <div className="product-modal-heading"><div><h2 id="add-product-title">{filipino ? (editingProduct ? 'I-edit ang produkto' : 'Magdagdag ng produkto') : (editingProduct ? 'Edit product' : 'Add product')}</h2><p id="add-product-description">{filipino ? (editingProduct ? 'I-update ang listing at detalye ng imbentaryo nito.' : 'Gumawa ng bagong listing para sa inyong komunidad.') : (editingProduct ? 'Update this listing and its inventory details.' : 'Prepare a fresh listing for your community.')}</p></div><button type="button" className="seller-icon-button" disabled={processing} aria-label={filipino ? (editingProduct ? 'Isara ang pag-edit ng produkto' : 'Isara ang pagdagdag ng produkto') : (editingProduct ? 'Close edit product' : 'Close add product')} onClick={closeEditor}><Icon name="close" /></button></div>
        <form ref={form} onSubmit={review} noValidate className="product-form-grid">
            <fieldset disabled={processing} className="product-form-main">
                <section className="seller-panel product-section"><div className="product-section-title"><Icon name="leaf" /><div><h2>{filipino ? 'Detalye ng produkto' : 'Product details'}</h2><p>{filipino ? 'Tulungan ang mga customer na makilala ang inyong ani.' : 'Help customers get to know your harvest.'}</p></div></div>
                    <div className="seller-settings-fields">
                        <FormField id="product-name" label={filipino ? 'Pangalan ng produkto' : 'Product name'} placeholder={filipino ? 'hal. Sariwang Pechay' : 'e.g. Fresh Pechay'} value={data.name} onChange={event => update('name', event.target.value)} error={localizeMessage(errors.name, filipino)} maxLength={120} required />
                        <div><label htmlFor="product-category">{filipino ? 'Kategorya' : 'Category'}</label><select id="product-category" value={data.category} onChange={event => update('category', event.target.value)} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'category-error' : undefined} required><option value="">{filipino ? 'Pumili ng kategorya' : 'Select a category'}</option>{['Vegetables', 'Fruits', 'Herbs', 'Beans'].map(item => <option value={item} key={item}>{categoryLabel(item, filipino)}</option>)}</select>{errors.category && <p id="category-error" className="product-error">{localizeMessage(errors.category, filipino)}</p>}</div>
                        <div><label htmlFor="product-description">{filipino ? 'Paglalarawan' : 'Description'} <span className="product-optional">({filipino ? 'opsyonal' : 'optional'})</span></label><textarea id="product-description" rows={4} maxLength={1000} placeholder={filipino ? 'Ilarawan ang pagiging sariwa, paraan ng pagtatanim, o wastong pag-iimbak…' : 'Describe freshness, growing methods, or storage tips…'} value={data.description} onChange={event => update('description', event.target.value)} /><p className="product-counter">{data.description.length}/1,000</p></div>
                    </div>
                </section>
                <section className="seller-panel product-section"><div className="product-section-title"><Icon name="tag" /><div><h2>{filipino ? 'Presyo at imbentaryo' : 'Price & inventory'}</h2><p>{filipino ? 'Itakda ang presyo ng bawat unit na ibebenta.' : 'Set the price for one selling unit.'}</p></div></div><div className="seller-settings-fields product-fields-grid">
                    <FormField id="product-price" label={filipino ? 'Presyo (PHP)' : 'Price (PHP)'} type="number" min="0.01" step="0.01" placeholder="0.00" inputMode="decimal" value={data.price} onChange={event => update('price', event.target.value)} error={localizeMessage(errors.price, filipino)} required />
                    <div><label htmlFor="product-unit">{filipino ? 'Unit ng bentahan' : 'Selling unit'}</label><select id="product-unit" value={data.unit} onChange={event => update('unit', event.target.value)}>{['kg', 'bunch', 'piece', 'head', 'pack'].map(unit => <option value={unit} key={unit}>{unitLabel(unit, filipino)}</option>)}</select></div>
                    <FormField id="product-stock" label={filipino ? 'Available na stock' : 'Available stock'} type="number" min="0" step="1" placeholder="0" value={data.stock} onChange={event => update('stock', event.target.value)} error={localizeMessage(errors.stock, filipino)} hint={filipino ? `Bilang ng available na ${unitLabel(data.unit, true)}.` : `Number of ${data.unit} units available.`} required />
                    <FormField id="product-threshold" label={filipino ? 'Paalala kapag kaunti na ang stock' : 'Low-stock reminder'} type="number" min="0" step="1" value={data.threshold} onChange={event => update('threshold', event.target.value)} error={localizeMessage(errors.threshold, filipino)} hint={filipino ? 'Antas ng stock na mamarkahang kailangang dagdagan.' : 'Stock level to flag for replenishment.'} required />
                </div></section>
                <section className="seller-panel product-section"><div className="product-section-title"><Icon name="sprout" /><div><h2>{filipino ? 'Larawan ng produkto' : 'Product photo'}</h2><p>{filipino ? 'Mas madaling pumili ang customer kapag malinaw ang larawan.' : 'A clear photo helps customers choose.'}</p></div></div>
                    <div className={`product-upload ${preview ? 'has-photo' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); choosePhoto(event.dataTransfer.files[0]); }}>
                        {preview ? <img src={preview} alt={filipino ? 'Napiling produkto' : 'Selected product'} /> : <Icon name="leaf" size={38} />}
                        <div><label htmlFor="product-photo">{filipino ? (preview ? 'Palitan ang larawan' : 'Pumili ng larawan o i-drop ito rito') : (preview ? 'Change photo' : 'Choose a photo or drop it here')}</label><p>JPG, PNG o WebP · {filipino ? 'Hanggang 5 MB' : 'Up to 5 MB'}</p><input ref={fileInput} id="product-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => choosePhoto(event.target.files?.[0])} aria-invalid={Boolean(errors.photo)} aria-describedby={errors.photo ? 'photo-error' : undefined} /></div>
                    </div>{errors.photo && <p className="product-error" id="photo-error" role="alert">{localizeMessage(errors.photo, filipino)}</p>}{photo && <button type="button" className="product-remove" onClick={() => { setPhoto(null); fileInput.current.value = ''; }}>{filipino ? 'Alisin ang larawan' : 'Remove photo'}</button>}
                </section>
            </fieldset>
            <aside className="product-preview-column"><section className="seller-panel product-preview"><h2>{filipino ? 'Preview ng listing' : 'Listing preview'}</h2><p>{filipino ? 'Ganito makikita ang inyong produkto.' : 'How your product will appear.'}</p><div className="product-preview-image">{preview ? <img src={preview} alt={filipino ? 'Preview ng listing ng produkto' : 'Product listing preview'} /> : <><Icon name="sprout" size={48} /><span>{filipino ? 'Larawan ng inyong produkto' : 'Your product photo'}</span></>}</div><span className="product-preview-category">{data.category ? categoryLabel(data.category, filipino) : (filipino ? 'Kategorya ng produkto' : 'Product category')}</span><h3>{data.name.trim() || (filipino ? 'Pangalan ng inyong produkto' : 'Your product name')}</h3><p className="product-seller"><Icon name="pin" size={14} />{auth.user.name}</p><div className="product-preview-price"><strong>{Number(data.price) > 0 && Number.isFinite(Number(data.price)) ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(data.price)) : '₱0.00'}</strong><span>/ {unitLabel(data.unit, filipino)}</span></div><p>{data.stock === '' ? (filipino ? 'Hindi pa itinakda ang stock' : 'Stock not set') : (filipino ? `${data.stock} ${unitLabel(data.unit, true)} ang available` : `${data.stock} ${data.unit} available`)}</p>{data.description && <p className="product-preview-description">{data.description}</p>}</section><div className="product-photo-tip"><Icon name="leaf" /><p>{filipino ? 'Gumamit ng natural na liwanag at ipakita ang mismong produktong ibebenta.' : 'Use natural light and show the actual produce you plan to sell.'}</p></div></aside>
            <div className="product-form-footer"><div><strong>{filipino ? (processing ? (editingProduct ? 'Sine-save ang mga pagbabago…' : 'Idinaragdag ang produkto…') : (editingProduct ? 'Handa nang i-save ang mga pagbabago?' : 'Handa nang idagdag ang produkto?')) : (processing ? (editingProduct ? 'Saving changes…' : 'Adding product…') : (editingProduct ? 'Ready to save your changes?' : 'Ready to add your product?'))}</strong><p>{filipino ? (editingProduct ? 'Maa-update ang listing sa buong seller workspace.' : 'Mase-save ang produkto sa imbentaryo ng inyong barangay.') : (editingProduct ? 'The listing will update across your seller workspace.' : 'Your product will be saved to your barangay’s inventory.')}</p>{Object.keys(errors).length > 0 && <p role="alert" className="product-error">{Object.values(errors).filter(Boolean).map(error => localizeMessage(error, filipino)).join(' ')}</p>}</div><div className="product-footer-buttons"><button type="button" disabled={processing} className="seller-outline-button" onClick={closeEditor}>{filipino ? 'Kanselahin' : 'Cancel'}</button><button className="seller-save-button" disabled={processing}>{filipino ? (processing ? 'Sine-save…' : (editingProduct ? 'I-save ang mga pagbabago' : 'Idagdag ang produkto')) : (processing ? 'Saving…' : (editingProduct ? 'Save changes' : 'Add product'))}</button></div></div>
        </form>
        </dialog>
    </>;
}
