import { Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '../Components/Storefront/Icon';
import AddressAutocomplete from '../Components/Storefront/AddressAutocomplete';
import { useShop } from '../Components/Storefront/ShopContext';
import { marketHref, money } from '../Components/Storefront/catalog';
import CheckoutReceipt, { downloadCheckoutReceipt } from '../Components/Storefront/CheckoutReceipt';

const steps = ['Delivery details', 'Payment method', 'Confirm order'];

function ProductImage({ item }) {
    const [failed, setFailed] = useState(false);

    return <span className="checkout-product-image">
        {item.photoUrl && !failed
            ? <img src={item.photoUrl} alt={item.name} onError={() => setFailed(true)} />
            : <Icon name="sprout" size={30} />}
    </span>;
}

function ProductRows({ items, quantities }) {
    return <div className="checkout-product-rows">{items.map((item, index) => {
        const quantity = quantities ? quantities[item.id] : item.quantity;
        return <div className="checkout-product-row" key={item.id ?? index}>
            <ProductImage item={item} />
            <span className="checkout-product-copy"><strong>{item.name}</strong><small>{quantity} {item.unit}{item.sellerName ? ` · ${item.sellerName}` : ` · ${money(item.price)} / ${item.unit}`}</small></span>
            <strong className="checkout-product-price">{money(item.price * quantity)}</strong>
        </div>;
    })}</div>;
}

function OrderSnapshot({ items, quantities, goodsTotal }) {
    return <aside className="checkout-summary checkout-panel">
        <h2>Order snapshot</h2>
        <p>{items.length} {items.length === 1 ? 'product' : 'products'} ready for checkout</p>
        <ProductRows items={items} quantities={quantities} />
        <div className="checkout-summary-row"><span>Goods subtotal</span><strong>{money(goodsTotal)}</strong></div>
        <div className="checkout-summary-row"><span>Delivery charge</span><strong>To be confirmed</strong></div>
        <div className="checkout-summary-total"><span>Payable for goods</span><strong>{money(goodsTotal)}</strong></div>
        <p className="checkout-fee-note">The seller will confirm any delivery charge before fulfillment. Pay cash when the order arrives.</p>
    </aside>;
}

function PaymentOptions() {
    return <div className="checkout-payment-options" aria-label="Payment methods">
        <div className="checkout-payment-option is-selected"><span className="checkout-payment-symbol"><Icon name="cash" size={22} /></span><span><strong>Cash on Delivery</strong><small>Pay in cash when your order arrives.</small></span><span className="checkout-payment-selected" aria-label="Selected"><Icon name="check" size={16} /></span></div>
        <button type="button" className="checkout-payment-option is-unavailable" disabled aria-label="GCash, coming soon"><span className="checkout-payment-symbol"><Icon name="wallet" size={22} /></span><span><strong>GCash</strong><small>Coming soon</small></span></button>
        <button type="button" className="checkout-payment-option is-unavailable" disabled aria-label="Maya, coming soon"><span className="checkout-payment-symbol"><Icon name="card" size={22} /></span><span><strong>Maya</strong><small>Coming soon</small></span></button>
    </div>;
}

function OrderSuccess({ order }) {
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState('');
    const placedAt = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.placedAt));

    async function download() {
        setDownloading(true);
        setDownloadError('');
        try {
            await downloadCheckoutReceipt(order);
        } catch {
            setDownloadError('The receipt could not be downloaded. Please try printing it instead.');
        } finally {
            setDownloading(false);
        }
    }

    return <>
        <section className="checkout-confirmation" aria-live="polite">
            <div className="checkout-confirmation-visual">
                <img className="checkout-mascot" src="/images/checkout-pechay-mascot.png" alt="Smiling pechay mascot celebrating your order" />
            </div>
            <div className="checkout-confirmation-content">
                <span className="checkout-kicker">Order placed successfully</span>
                <h1>Thanks for ordering!</h1>
                <p>We’ve sent your order to the seller. They’ll review it and contact you about delivery. No payment has been taken yet.</p>
                <dl className="checkout-confirmation-meta">
                    <div><dt>Order ID</dt><dd className="checkout-reference">{order.reference}</dd></div>
                    <div><dt>Placed</dt><dd>{placedAt}</dd></div>
                    <div><dt>Payment</dt><dd>Cash on Delivery</dd></div>
                </dl>
                <ProductRows items={order.items} />
                <div className="checkout-confirmation-total"><span>Goods subtotal</span><strong>{money(order.goodsTotal)}</strong></div>
                <p className="checkout-fee-note">Delivery charge is not included and must be confirmed by the seller before fulfillment.</p>
                <div className="checkout-confirmation-delivery"><strong>Deliver to {order.recipientName}</strong><span>{order.address}</span><span>{order.phone}</span>{order.contactEmail && <span>{order.contactEmail}</span>}</div>
                <div className="checkout-confirmation-actions">
                    <Link className="store-button" href={marketHref()}>Continue shopping</Link>
                    <button type="button" className="checkout-receipt-icon" onClick={() => window.print()} title="Print receipt" aria-label="Print receipt"><Icon name="printer" size={19} /></button>
                    <button type="button" className="checkout-receipt-icon" onClick={download} disabled={downloading} title={downloading ? 'Preparing PDF' : 'Download receipt'} aria-label={downloading ? 'Preparing PDF' : 'Download receipt'}><Icon name="download" size={19} /></button>
                </div>
                {downloadError && <p className="checkout-error" role="alert">{downloadError}</p>}
            </div>
        </section>
        <CheckoutReceipt order={order} />
    </>;
}

export default function Checkout({ order, successPage = false }) {
    const user = usePage().props.auth?.user;
    const { cart, products, clearPurchased } = useShop();
    const [step, setStep] = useState(1);
    const [localError, setLocalError] = useState('');
    const form = useForm({ checkout_id: '', recipient_name: user?.name || '', contact_email: user?.email || '', phone: user?.mobile_number || '', address: user?.delivery_address || '', notes: '', payment_method: 'cod', items: [] });
    const items = products.filter((product) => cart[product.id] && product.isSellerProduct);
    const previewItems = products.filter((product) => cart[product.id] && !product.isSellerProduct);
    const goodsTotal = items.reduce((sum, product) => sum + product.price * cart[product.id], 0);

    useEffect(() => { window.scrollTo(0, 0); }, [order?.id]);
    useEffect(() => { window.scrollTo(0, 0); }, [step]);

    useEffect(() => {
        if (!order?.id) return;
        try {
            const purchased = JSON.parse(sessionStorage.getItem(`agrifarm-checkout-${order.id}`) || '[]');
            if (purchased.length) clearPurchased(purchased);
            sessionStorage.removeItem(`agrifarm-checkout-${order.id}`);
        } catch { /* The placed-order page remains available if storage is blocked. */ }
    }, [order?.id]);

    function goToStep(nextStep) {
        setStep(nextStep);
    }

    function next(event) {
        event.preventDefault();
        const values = form.data;
        if (values.recipient_name.trim().length < 2 || (values.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contact_email.trim())) || !/^\+?[0-9][0-9\s-]{8,22}$/.test(values.phone.trim()) || values.address.trim().length < 10) {
            setLocalError('Enter your name, a valid email and phone number, and a full delivery address.');
            return;
        }
        setLocalError('');
        goToStep(2);
    }

    function placeOrder() {
        if (form.processing || !items.length) return;
        const checkoutId = form.data.checkout_id || crypto.randomUUID();
        const orderedIds = items.map((item) => item.id);
        const payload = {
            ...form.data,
            checkout_id: checkoutId,
            recipient_name: form.data.recipient_name.trim(),
            contact_email: form.data.contact_email.trim(),
            phone: form.data.phone.trim(),
            address: form.data.address.trim(),
            items: items.map((item) => ({ product_id: Number(item.id.slice(7)), quantity: cart[item.id] })),
        };
        form.transform(() => payload);
        form.post('/checkout', {
            preserveScroll: false,
            onSuccess: () => {
                try { sessionStorage.setItem(`agrifarm-checkout-${checkoutId}`, JSON.stringify(orderedIds)); } catch { /* Cart can be cleared directly. */ }
                clearPurchased(orderedIds);
            },
            onError: (errors) => goToStep(Object.keys(errors).some((key) => ['recipient_name', 'contact_email', 'phone', 'address', 'notes'].includes(key)) ? 1 : 3),
        });
        form.setData('checkout_id', checkoutId);
    }

    if (order) return <div className="store-container checkout-page checkout-success-page"><OrderSuccess order={order} /></div>;
    if (successPage) return <div className="store-container checkout-page"><section className="checkout-state"><h1>Order not found</h1><p>This order may not exist, or it may belong to another account.</p><Link className="store-button" href={marketHref()}>Browse marketplace</Link></section></div>;

    return <div className="store-container checkout-page">
        <div className="checkout-heading"><div><span className="checkout-kicker">AgriFarm marketplace</span><h1>Checkout</h1></div><Link href="/?page=cart" className="checkout-back">Back to cart</Link></div>
        <nav className="checkout-progress" aria-label="Checkout progress"><ol>{steps.map((label, index) => <li key={label} className={step >= index + 1 ? 'is-active' : ''} aria-current={step === index + 1 ? 'step' : undefined}><span>{step > index + 1 ? <Icon name="check" size={16} /> : index + 1}</span><strong>{label}</strong></li>)}</ol></nav>

        {!user ? <section className="checkout-state"><h2>Log in to continue</h2><p>A customer account is needed to place a Cash on Delivery order.</p><Link className="store-button" href="/login">Log in</Link></section>
            : user.role !== 'customer' ? <section className="checkout-state"><h2>Customer checkout only</h2><p>Sign in with a customer account to place an order.</p></section>
                : !items.length ? <section className="checkout-state"><h2>No orderable products in your cart</h2><p>Only products listed by real AgriFarm sellers can be ordered. Sample catalog products remain previews.</p><Link className="store-button" href={marketHref()}>Browse marketplace</Link></section>
                    : <>
                        {previewItems.length > 0 && <p className="checkout-notice" role="status">{previewItems.length} sample {previewItems.length === 1 ? 'product is' : 'products are'} excluded from this order. Your sample items will stay in your cart.</p>}
                        {step === 3 ? <section className="checkout-panel checkout-final-review">
                            <div className="checkout-final-heading"><div><span className="checkout-kicker">Final check</span><h2>Confirm your order</h2><p>Review everything below. Your order is placed only when you select “Place COD order”.</p></div><Icon name="receipt" size={28} /></div>
                            <div className="checkout-final-grid">
                                <div className="checkout-final-section"><div className="checkout-section-heading"><h3>Delivery details</h3><button type="button" onClick={() => goToStep(1)}>Edit</button></div><dl className="checkout-final-details"><div><dt>Full name</dt><dd>{form.data.recipient_name}</dd></div>{form.data.contact_email && <div><dt>Email</dt><dd>{form.data.contact_email}</dd></div>}<div><dt>Contact number</dt><dd>{form.data.phone}</dd></div><div><dt>Address</dt><dd>{form.data.address}</dd></div>{form.data.notes && <div><dt>Delivery notes</dt><dd>{form.data.notes}</dd></div>}</dl></div>
                                <div className="checkout-final-section"><div className="checkout-section-heading"><h3>Payment method</h3><button type="button" onClick={() => goToStep(2)}>Change</button></div><p><strong>Cash on Delivery</strong><br /><span>Pay in cash when your order arrives. No online payment is taken.</span></p></div>
                            </div>
                            <div className="checkout-final-section checkout-final-products"><h3>Products</h3><ProductRows items={items} quantities={cart} /></div>
                            <div className="checkout-final-totals"><div><span>Goods subtotal</span><strong>{money(goodsTotal)}</strong></div><div><span>Delivery charge</span><strong>To be confirmed by seller</strong></div><div className="checkout-final-payable"><span>Payable for goods</span><strong>{money(goodsTotal)}</strong></div></div>
                            <p className="checkout-fee-note">The goods amount is not the final delivered total. The seller must confirm any delivery charge with you before fulfillment.</p>
                            {form.errors.items && <p className="checkout-error" role="alert">{form.errors.items}</p>}
                            <div className="checkout-review-actions"><button type="button" className="checkout-outline-button" onClick={() => goToStep(2)}>Back to payment</button><button type="button" className="store-button" disabled={form.processing} onClick={placeOrder}>{form.processing ? 'Placing order…' : 'Place COD order'}</button></div>
                        </section> : <div className="checkout-layout"><div className="checkout-main">
                            {step === 1 ? <form className="checkout-panel checkout-details" onSubmit={next} noValidate>
                                <h2>Shipping details</h2><p>Saved profile details are filled in for you. You can edit them for this order.</p>
                                <div className="checkout-fields">
                                    <label>Full name<input autoComplete="name" maxLength="120" value={form.data.recipient_name} onChange={(event) => form.setData('recipient_name', event.target.value)} aria-invalid={Boolean(form.errors.recipient_name)} required />{form.errors.recipient_name && <small role="alert">{form.errors.recipient_name}</small>}</label>
                                    <label>Email address<input type="email" autoComplete="email" maxLength="255" value={form.data.contact_email} onChange={(event) => form.setData('contact_email', event.target.value)} aria-invalid={Boolean(form.errors.contact_email)} />{form.errors.contact_email && <small role="alert">{form.errors.contact_email}</small>}</label>
                                    <label>Contact number<input type="tel" autoComplete="tel" inputMode="tel" placeholder="09XX XXX XXXX" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} aria-invalid={Boolean(form.errors.phone)} required />{form.errors.phone && <small role="alert">{form.errors.phone}</small>}</label>
                                    <AddressAutocomplete className="is-wide" value={form.data.address} onChange={address => form.setData('address', address)} error={form.errors.address} required />
                                    <label className="is-wide checkout-notes-field">Delivery notes <span>(optional)</span><textarea maxLength="500" rows="3" placeholder="Gate color, landmark, or preferred handoff instructions" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} /></label>
                                </div>
                                {localError && <p className="checkout-error" role="alert">{localError}</p>}{form.errors.items && <p className="checkout-error" role="alert">{form.errors.items}</p>}
                                <div className="checkout-step-actions"><button type="submit" className="store-button">Continue to payment <Icon name="arrow" size={17} /></button></div>
                            </form> : <section className="checkout-panel checkout-review">
                                <h2>Payment method</h2><p>Choose how you’ll pay for this order.</p>
                                <PaymentOptions />
                                <div className="checkout-review-block"><div><h3>Deliver to</h3><button type="button" onClick={() => goToStep(1)}>Edit details</button></div><strong>{form.data.recipient_name}</strong><p>{form.data.phone}{form.data.contact_email && <><br />{form.data.contact_email}</>}<br />{form.data.address}</p>{form.data.notes && <p>Note: {form.data.notes}</p>}</div>
                                <div className="checkout-review-block"><h3>Products</h3><ProductRows items={items} quantities={cart} /></div>
                                <div className="checkout-review-actions"><button type="button" className="checkout-outline-button" onClick={() => goToStep(1)}>Back to details</button><button type="button" className="store-button" onClick={() => goToStep(3)}>Continue to confirmation</button></div>
                            </section>}
                        </div><OrderSnapshot items={items} quantities={cart} goodsTotal={goodsTotal} /></div>}
                    </>}
    </div>;
}
