import { Link, usePage } from '@inertiajs/react';
import CollectionPage, { CollectionEmpty } from '../Components/Storefront/CollectionPage';
import { ProducePhoto } from '../Components/Storefront/ProductCard';
import Icon from '../Components/Storefront/Icon';
import { useShop } from '../Components/Storefront/ShopContext';
import { money, marketHref, stockUnit } from '../Components/Storefront/catalog';

export default function Cart() {
    const customer = usePage().props.auth?.user?.role === 'customer';
    const { cart, count, changeQuantity, saveForLater, products } = useShop();
    const items = products.filter((product) => cart[product.id]);
    const orderable = items.filter((product) => product.isSellerProduct);
    const previewItems = items.length - orderable.length;
    const total = items.reduce((sum, product) => sum + product.price * cart[product.id], 0);
    return <CollectionPage title="Your cart">
        {items.length ? <div className="basket-layout">
            <section className="basket-products" aria-labelledby="basket-items-heading">
                <div className="basket-section-heading"><h2 id="basket-items-heading"><Icon name="cart" size={21} />Your harvest</h2><span>{items.length} {items.length === 1 ? 'product' : 'products'} · {count} units</span></div>
                {items.map((product) => <article className="basket-product" key={product.id}>
                    <ProducePhoto product={product} />
                    <div className="basket-product-copy">
                        <h3>{product.name}</h3>
                        {product.barangay ? <Link className="basket-grower" href={marketHref(product.barangay)}><Icon name="pin" size={14} />{product.barangay}</Link> : <span className="basket-grower"><Icon name="people" size={14} />{product.sellerName}</span>}
                        <p className="basket-unit-price">{money(product.price)} <span>/ {product.unit}</span></p>
                        <p className="basket-stock"><Icon name="check" size={14} />{product.stock} {stockUnit(product.unit, product.stock)} available</p>
                    </div>
                    <button className="basket-remove" onClick={() => changeQuantity(product.id, -cart[product.id])} aria-label={`Remove ${product.name} from cart`} title="Remove item"><Icon name="trash" size={19} /></button>
                    <div className="basket-item-bottom">
                        <button className="basket-save" onClick={() => saveForLater(product.id)} aria-label={`Save ${product.name} for later`}><Icon name="heart" size={17} />Save for later</button>
                        <div className="basket-product-quantity"><span>Quantity</span><div className="quantity-control"><button aria-label={`Decrease ${product.name} quantity`} onClick={() => changeQuantity(product.id, -1)}><Icon name="minus" size={16} /></button><output aria-label={`${product.name} quantity`}>{cart[product.id]}</output><button aria-label={`Increase ${product.name} quantity`} disabled={cart[product.id] >= product.stock} onClick={() => changeQuantity(product.id, 1)}><Icon name="plus" size={16} /></button></div></div>
                        <div className="basket-line-total"><span>Item total</span><strong>{money(product.price * cart[product.id])}</strong></div>
                    </div>
                </article>)}
                <p className="basket-storage-note"><Icon name="leaf" size={18} />Your basket is saved on this device. Adding items does not reserve stock.</p>
            </section>
            <aside className="basket-summary" aria-labelledby="basket-summary-heading">
                <h2 id="basket-summary-heading"><Icon name="receipt" size={21} />Order summary</h2>
                <dl>
                    <div><dt>Produce subtotal</dt><dd>{money(total)}</dd></div>
                    <div><dt>Delivery charge</dt><dd>To be confirmed</dd></div>
                    <div className="basket-subtotal"><dt>Goods subtotal</dt><dd aria-live="polite">{money(total)}</dd></div>
                </dl>
                <p className="basket-summary-note">
                    {orderable.length
                        ? `${previewItems ? `${previewItems} sample ${previewItems === 1 ? 'item stays' : 'items stay'} in your cart and will not be ordered. ` : ''}Seller products can be ordered with Cash on Delivery. Any delivery charge must be confirmed by the seller before fulfillment.`
                        : 'These are sample products. Add a listing from a real AgriFarm seller to place an order.'}
                </p>
                {orderable.length > 0 && (customer
                    ? <Link className="store-button" href="/?page=checkout">Checkout · Cash on Delivery <Icon name="arrow" size={17} /></Link>
                    : <Link className="store-button" href="/login"><Icon name="lock" size={17} />Log in to checkout</Link>)}
                <p className="collection-footnote">No online payment is taken. The delivery charge is not yet included.</p>
            </aside>
        </div> : <CollectionEmpty icon="cart" title="Your basket is waiting">Discover what is growing nearby and add something fresh to your cart.</CollectionEmpty>}
    </CollectionPage>;
}
