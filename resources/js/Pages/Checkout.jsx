import { Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '../Components/Storefront/Icon';
import { useShop } from '../Components/Storefront/ShopContext';
import { marketHref, money } from '../Components/Storefront/catalog';

const steps = ['Delivery details', 'Review order', 'Confirmation'];

export default function Checkout({ order }) {
    const user = usePage().props.auth?.user;
    const { cart, products, clearPurchased } = useShop();
    const [step, setStep] = useState(1);
    const [localError, setLocalError] = useState('');
    const form = useForm({ checkout_id: '', recipient_name: user?.name || '', phone: '', address: '', barangay: '', notes: '', payment_method: 'cod', items: [] });
    const items = products.filter((product) => cart[product.id] && product.isSellerProduct);
    const previewItems = products.filter((product) => cart[product.id] && !product.isSellerProduct);
    const goodsTotal = items.reduce((sum, product) => sum + product.price * cart[product.id], 0);

    useEffect(() => {
        if (!order?.id) return;
        try {
            const purchased = JSON.parse(sessionStorage.getItem(`agrifarm-checkout-${order.id}`) || '[]');
            if (purchased.length) clearPurchased(purchased);
            sessionStorage.removeItem(`agrifarm-checkout-${order.id}`);
        } catch { /* Confirmation remains available if storage is blocked. */ }
    }, [order?.id]);

    function next(event) {
        event.preventDefault();
        const values = form.data;
        if (values.recipient_name.trim().length < 2 || !/^\+?[0-9][0-9\s-]{8,22}$/.test(values.phone.trim()) || values.address.trim().length < 10 || values.barangay.trim().length < 2) {
            setLocalError('Enter your name, a valid phone number, a full address, and a Pasig barangay.');
            return;
        }
        setLocalError('');
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function placeOrder() {
        if (form.processing || !items.length) return;
        const checkoutId = form.data.checkout_id || crypto.randomUUID();
        const orderedIds = items.map((item) => item.id);
        const payload = {
            ...form.data,
            checkout_id: checkoutId,
            recipient_name: form.data.recipient_name.trim(),
            phone: form.data.phone.trim(),
            address: form.data.address.trim(),
            items: items.map((item) => ({ product_id: Number(item.id.slice(7)), quantity: cart[item.id] })),
        };
        form.transform(() => payload);
        form.post('/checkout', {
            preserveScroll: true,
            onSuccess: () => {
                try { sessionStorage.setItem(`agrifarm-checkout-${checkoutId}`, JSON.stringify(orderedIds)); } catch { /* Cart can be cleared directly. */ }
                clearPurchased(orderedIds);
            },
            onError: () => setStep(1),
        });
        form.setData('checkout_id', checkoutId);
    }

    const currentStep = order ? 3 : step;
    return <div className="store-container checkout-page">
        <div className="checkout-heading"><div><span className="checkout-kicker">AgriFarm checkout</span><h1>{order ? 'Order placed' : 'Checkout'}</h1></div>{!order && <Link href="/?page=cart" className="checkout-back">Back to cart</Link>}</div>
        <nav className="checkout-progress" aria-label="Checkout progress"><ol>{steps.map((label, index) => <li key={label} className={currentStep >= index + 1 ? 'is-active' : ''} aria-current={currentStep === index + 1 ? 'step' : undefined}><span>{currentStep > index + 1 ? <Icon name="check" size={16} /> : index + 1}</span><strong>{label}</strong></li>)}</ol></nav>

        {order ? <section className="checkout-success" aria-live="polite"><span className="checkout-success-icon"><Icon name="check" size={30} /></span><h2>Your order has been sent to the seller</h2><p>Reference <strong>{order.id.slice(0, 8).toUpperCase()}</strong> · Pay cash when your order is delivered. Sellers can review your request and contact you using the number you provided.</p><div className="checkout-success-details"><strong>Deliver to {order.recipientName}</strong><span>{order.address}, Barangay {order.barangay}, Pasig City</span><span>{order.phone}</span></div><div className="checkout-lines">{order.items.map((item, index) => <div key={index}><span>{item.name} × {item.quantity}</span><strong>{money(item.price * item.quantity)}</strong></div>)}</div><div className="checkout-total"><span>Goods subtotal</span><strong>{money(order.goodsTotal)}</strong></div><p className="checkout-fee-note">Delivery charges are not included. The seller must confirm any delivery charge with you before fulfillment. No online payment has been taken.</p><Link className="store-button" href={marketHref()}>Continue shopping <Icon name="arrow" size={17} /></Link></section>
            : !user ? <section className="checkout-state"><h2>Log in to continue</h2><p>A customer account is needed to place a Cash on Delivery order.</p><Link className="store-button" href="/login">Log in</Link></section>
                : user.role !== 'customer' ? <section className="checkout-state"><h2>Customer checkout only</h2><p>Sign in with a customer account to place an order.</p></section>
                    : !items.length ? <section className="checkout-state"><h2>No orderable products in your cart</h2><p>Only products listed by real AgriFarm sellers can be ordered. Sample catalog products remain previews.</p><Link className="store-button" href={marketHref()}>Browse marketplace</Link></section>
                        : <div className="checkout-layout"><div className="checkout-main">
                            {previewItems.length > 0 && <p className="checkout-notice" role="status">{previewItems.length} sample {previewItems.length === 1 ? 'product is' : 'products are'} excluded from this order. Your sample items will stay in your cart.</p>}
                            {step === 1 ? <form className="checkout-panel checkout-details" onSubmit={next} noValidate><h2>Delivery details</h2><p>We’ll share these details with the sellers fulfilling your order.</p><div className="checkout-fields"><label>Full name<input autoComplete="name" maxLength="120" value={form.data.recipient_name} onChange={(event) => form.setData('recipient_name', event.target.value)} aria-invalid={Boolean(form.errors.recipient_name)} required />{form.errors.recipient_name && <small role="alert">{form.errors.recipient_name}</small>}</label><label>Mobile number<input type="tel" autoComplete="tel" inputMode="tel" placeholder="09XX XXX XXXX" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} aria-invalid={Boolean(form.errors.phone)} required />{form.errors.phone && <small role="alert">{form.errors.phone}</small>}</label><label className="is-wide">Complete delivery address<input autoComplete="street-address" maxLength="500" placeholder="House number, street, subdivision or landmark" value={form.data.address} onChange={(event) => form.setData('address', event.target.value)} aria-invalid={Boolean(form.errors.address)} required />{form.errors.address && <small role="alert">{form.errors.address}</small>}</label><label>Barangay, Pasig City<input autoComplete="address-level3" maxLength="100" placeholder="Your barangay" value={form.data.barangay} onChange={(event) => form.setData('barangay', event.target.value)} aria-invalid={Boolean(form.errors.barangay)} required />{form.errors.barangay && <small role="alert">{form.errors.barangay}</small>}</label><label className="is-wide">Delivery notes <span>(optional)</span><textarea maxLength="500" rows="3" placeholder="Landmark or delivery instructions" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} /></label></div>{localError && <p className="checkout-error" role="alert">{localError}</p>}{form.errors.items && <p className="checkout-error" role="alert">{form.errors.items}</p>}<button type="submit" className="store-button">Continue to review <Icon name="arrow" size={17} /></button></form>
                                : <section className="checkout-panel checkout-review"><h2>Review your order</h2><div className="checkout-review-block"><div><h3>Deliver to</h3><button type="button" onClick={() => setStep(1)}>Edit</button></div><strong>{form.data.recipient_name}</strong><p>{form.data.phone}<br />{form.data.address}, Barangay {form.data.barangay}, Pasig City</p>{form.data.notes && <p>Note: {form.data.notes}</p>}</div><div className="checkout-review-block"><h3>Payment</h3><p><strong>Cash on Delivery</strong> — Pay in cash when your order arrives. No card or online payment required.</p></div><div className="checkout-review-block"><h3>Products</h3><div className="checkout-lines">{items.map((item) => <div key={item.id}><span>{item.name} · {item.sellerName} × {cart[item.id]} {item.unit}</span><strong>{money(item.price * cart[item.id])}</strong></div>)}</div></div>{form.errors.items && <p className="checkout-error" role="alert">{form.errors.items}</p>}<div className="checkout-review-actions"><button type="button" className="checkout-back" onClick={() => setStep(1)}>Back to details</button><button type="button" className="store-button" disabled={form.processing} onClick={placeOrder}>{form.processing ? 'Placing order…' : 'Place COD order'}</button></div></section>}
                        </div><aside className="checkout-summary checkout-panel"><h2>Order summary</h2><div className="checkout-lines">{items.map((item) => <div key={item.id}><span>{item.name} × {cart[item.id]}</span><strong>{money(item.price * cart[item.id])}</strong></div>)}</div><div className="checkout-total"><span>Goods subtotal</span><strong>{money(goodsTotal)}</strong></div><p className="checkout-fee-note">Delivery charge: not set. Sellers must confirm any charge with you before fulfilling the order. The goods subtotal is not a final delivered total.</p><p className="checkout-payment"><Icon name="check" size={17} />Cash on Delivery only</p></aside></div>}
    </div>;
}
