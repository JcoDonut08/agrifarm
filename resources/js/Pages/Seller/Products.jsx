import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import FormField from '../../Components/FormField';
import Icon from '../../Components/Storefront/Icon';
import '../../../css/seller-products.css';

const initial = { name: '', category: '', description: '', price: '', unit: 'kg', stock: '', threshold: '5' };
export default function Products() {
    const { auth, products = [], flash } = usePage().props;
    const [editing, setEditing] = useState(false);
    const [data, setData] = useState(initial);
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const fileInput = useRef(null);
    const form = useRef(null);
    const modal = useRef(null);
    useEffect(() => {
        if (!editing) { modal.current?.close(); return; }
        const previousOverflow = document.body.style.overflow;
        modal.current.showModal();
        document.body.style.overflow = 'hidden';
        modal.current.querySelector('#product-name')?.focus();
        return () => { document.body.style.overflow = previousOverflow; };
    }, [editing]);
    useEffect(() => {
        if (!photo) { setPreview(null); return; }
        const url = URL.createObjectURL(photo);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photo]);
    function update(key, value) {
        setData(current => ({ ...current, [key]: value }));
        setErrors(current => ({ ...current, [key]: undefined }));

    }
    function choosePhoto(file) {

        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setErrors(current => ({ ...current, photo: 'Choose a JPG, PNG or WebP image smaller than 5 MB.' }));
            return;
        }
        setPhoto(file);
        setErrors(current => ({ ...current, photo: undefined }));
    }
    function review(event) {
        event.preventDefault();
        const next = {};
        if (!data.name.trim()) next.name = 'Enter a product name.';
        if (!data.category) next.category = 'Choose a category.';
        if (!photo) next.photo = 'Add a product photo.';
        if (!data.price || !Number.isFinite(Number(data.price)) || Number(data.price) <= 0) next.price = 'Enter a price greater than zero.';
        if (data.stock === '' || !Number.isInteger(Number(data.stock)) || Number(data.stock) < 0) next.stock = 'Enter a whole number of available units.';
        if (data.threshold === '' || !Number.isInteger(Number(data.threshold)) || Number(data.threshold) < 0) next.threshold = 'Enter a whole number of units.';
        setErrors(next);
        if (!Object.keys(next).length && !processing) {
            setProcessing(true);
            router.post('/seller/products', { ...data, photo }, {
                forceFormData: true,
                preserveScroll: true,
                onError: serverErrors => {
                    setErrors(serverErrors);
                    requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
                },
                onSuccess: () => {
                    setEditing(false);
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
    return <>
        <div className="product-page-heading"><div><h1 className="seller-page-title">Products</h1><p>Manage your barangay’s produce and availability.</p></div><button className="seller-save-button product-button" onClick={() => setEditing(true)}><Icon name="plus" />Add product</button></div>
        {flash?.status && <p className="seller-save-status" role="status">{flash.status}</p>}
        {products.length ? <div className="seller-product-list">{products.map(product => <article className="seller-panel seller-product-item" key={product.id}>
            <img src={product.photo_url} alt={product.name} />
            <div><span className="product-preview-category">{product.category}</span><h2>{product.name}</h2><p>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(product.price))} / {product.unit}</p><p>{product.stock} {product.unit} available{product.stock === 0 ? ' · Out of stock' : product.stock <= product.threshold ? ' · Low stock' : ''}</p></div>
        </article>)}</div> : <section className="seller-panel"><div className="seller-empty"><Icon name="sprout" size={36} /><strong>Your next harvest starts here</strong><p>Add your first product’s photo, price and available stock.</p></div></section>}
        <dialog ref={modal} className="product-modal" aria-labelledby="add-product-title" aria-describedby="add-product-description" onCancel={event => { event.preventDefault(); if (!processing) setEditing(false); }} onClick={event => {
            if (processing || event.target !== modal.current) return;
            const bounds = modal.current.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setEditing(false);
        }}>
        <div className="product-modal-heading"><div><h2 id="add-product-title">Add product</h2><p id="add-product-description">Prepare a fresh listing for your community.</p></div><button type="button" className="seller-icon-button" disabled={processing} aria-label="Close add product" onClick={() => setEditing(false)}><Icon name="close" /></button></div>
        <form ref={form} onSubmit={review} noValidate className="product-form-grid">
            <fieldset disabled={processing} className="product-form-main">
                <section className="seller-panel product-section"><div className="product-section-title"><Icon name="leaf" /><div><h2>Product details</h2><p>Help customers get to know your harvest.</p></div></div>
                    <div className="seller-settings-fields">
                        <FormField id="product-name" label="Product name" placeholder="e.g. Fresh Pechay" value={data.name} onChange={event => update('name', event.target.value)} error={errors.name} maxLength={120} required />
                        <div><label htmlFor="product-category">Category</label><select id="product-category" value={data.category} onChange={event => update('category', event.target.value)} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'category-error' : undefined} required><option value="">Select a category</option>{['Vegetables', 'Fruits', 'Herbs', 'Beans'].map(item => <option key={item}>{item}</option>)}</select>{errors.category && <p id="category-error" className="product-error">{errors.category}</p>}</div>
                        <div><label htmlFor="product-description">Description <span className="product-optional">(optional)</span></label><textarea id="product-description" rows={4} maxLength={1000} placeholder="Describe freshness, growing methods, or storage tips…" value={data.description} onChange={event => update('description', event.target.value)} /><p className="product-counter">{data.description.length}/1,000</p></div>
                    </div>
                </section>
                <section className="seller-panel product-section"><div className="product-section-title"><Icon name="tag" /><div><h2>Price & inventory</h2><p>Set the price for one selling unit.</p></div></div><div className="seller-settings-fields product-fields-grid">
                    <FormField id="product-price" label="Price (PHP)" type="number" min="0.01" step="0.01" placeholder="0.00" inputMode="decimal" value={data.price} onChange={event => update('price', event.target.value)} error={errors.price} required />
                    <div><label htmlFor="product-unit">Selling unit</label><select id="product-unit" value={data.unit} onChange={event => update('unit', event.target.value)}>{['kg', 'bunch', 'piece', 'head', 'pack'].map(unit => <option key={unit}>{unit}</option>)}</select></div>
                    <FormField id="product-stock" label="Available stock" type="number" min="0" step="1" placeholder="0" value={data.stock} onChange={event => update('stock', event.target.value)} error={errors.stock} hint={`Number of ${data.unit} units available.`} required />
                    <FormField id="product-threshold" label="Low-stock reminder" type="number" min="0" step="1" value={data.threshold} onChange={event => update('threshold', event.target.value)} error={errors.threshold} hint="Stock level to flag for replenishment." required />
                </div></section>
                <section className="seller-panel product-section"><div className="product-section-title"><Icon name="sprout" /><div><h2>Product photo</h2><p>A clear photo helps customers choose.</p></div></div>
                    <div className={`product-upload ${preview ? 'has-photo' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); choosePhoto(event.dataTransfer.files[0]); }}>
                        {preview ? <img src={preview} alt="Selected product" /> : <Icon name="leaf" size={38} />}
                        <div><label htmlFor="product-photo">{preview ? 'Change photo' : 'Choose a photo or drop it here'}</label><p>JPG, PNG or WebP · Up to 5 MB</p><input ref={fileInput} id="product-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => choosePhoto(event.target.files?.[0])} aria-invalid={Boolean(errors.photo)} aria-describedby={errors.photo ? 'photo-error' : undefined} /></div>
                    </div>{errors.photo && <p className="product-error" id="photo-error" role="alert">{errors.photo}</p>}{photo && <button type="button" className="product-remove" onClick={() => { setPhoto(null); fileInput.current.value = ''; }}>Remove photo</button>}
                </section>
            </fieldset>
            <aside className="product-preview-column"><section className="seller-panel product-preview"><h2>Listing preview</h2><p>How your product will appear.</p><div className="product-preview-image">{preview ? <img src={preview} alt="Product listing preview" /> : <><Icon name="sprout" size={48} /><span>Your product photo</span></>}</div><span className="product-preview-category">{data.category || 'Product category'}</span><h3>{data.name.trim() || 'Your product name'}</h3><p className="product-seller"><Icon name="pin" size={14} />{auth.user.name}</p><div className="product-preview-price"><strong>{Number(data.price) > 0 && Number.isFinite(Number(data.price)) ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(data.price)) : '₱0.00'}</strong><span>/ {data.unit}</span></div><p>{data.stock === '' ? 'Stock not set' : `${data.stock} ${data.unit} available`}</p>{data.description && <p className="product-preview-description">{data.description}</p>}</section><div className="product-photo-tip"><Icon name="leaf" /><p>Use natural light and show the actual produce you plan to sell.</p></div></aside>
            <div className="product-form-footer"><div><strong>{processing ? 'Adding product…' : 'Ready to add your product?'}</strong><p>Your product will be saved to your barangay’s inventory.</p>{Object.keys(errors).length > 0 && <p role="alert" className="product-error">{Object.values(errors).filter(Boolean).join(' ')}</p>}</div><div className="product-footer-buttons"><button type="button" disabled={processing} className="seller-outline-button" onClick={() => setEditing(false)}>Cancel</button><button className="seller-save-button" disabled={processing}>{processing ? 'Adding…' : 'Add product'}</button></div></div>
        </form>
        </dialog>
    </>;
}
