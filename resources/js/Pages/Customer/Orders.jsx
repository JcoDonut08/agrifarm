import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import StorefrontLayout from '../../Layouts/StorefrontLayout';
import { ShopProvider } from '../../Components/Storefront/ShopContext';
import Icon from '../../Components/Storefront/Icon';


const OrderProgressBar = ({ status, filipino }) => {
    if (status === 'cancelled') {
        return (
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed var(--store-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e11d48', fontSize: '13px', fontWeight: 600 }}>
                    <Icon name="x-circle" size={16} />
                    {filipino ? 'Kinansela ang order na ito.' : 'This order was cancelled.'}
                </div>
            </div>
        );
    }
    
    const steps = [
        { id: 'pending', labelEn: 'Pending', labelPh: 'Naghihintay' },
        { id: 'preparing', labelEn: 'Preparing', labelPh: 'Inihahanda' },
        { id: 'out_for_delivery', labelEn: 'Out for delivery', labelPh: 'Ipinadadala' },
        { id: 'delivered', labelEn: 'Delivered', labelPh: 'Naihatid' }
    ];
    
    // If status is reservation, treat it as pending for progression
    const normalizedStatus = status === 'reservation' ? 'pending' : status;
    const currentIndex = steps.findIndex(s => s.id === normalizedStatus);
    
    // If status is not in the normal flow (e.g. some edge case), don't show the bar
    if (currentIndex === -1) return null;

    return (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--store-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '9px', left: '35px', right: '35px', height: '2px', background: 'var(--store-border)', zIndex: 0 }} />
                <div style={{ position: 'absolute', top: '9px', left: '35px', width: `calc((100% - 70px) * ${currentIndex / (steps.length - 1)})`, height: '2px', background: 'var(--store-green)', zIndex: 1, transition: 'width 0.3s ease' }} />
                
                {steps.map((step, idx) => {
                    const isActive = idx <= currentIndex;
                    const isCurrent = idx === currentIndex;
                    return (
                        <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2, width: '70px' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isActive ? 'var(--store-green)' : 'var(--store-bg)', border: `2px solid ${isActive ? 'var(--store-green)' : 'var(--store-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>
                                {isActive && <Icon name="check" size={12} style={{ color: 'white' }} />}
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--store-ink)' : 'var(--store-muted)', textAlign: 'center', lineHeight: '1.2' }}>
                                {filipino ? step.labelPh : step.labelEn}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function Orders({ checkouts }) {
    const filipino = typeof window !== 'undefined' && localStorage.getItem('agrifarm-customer-language') === 'filipino';
    const [tab, setTab] = useState('active');

    // Categorize checkouts
    const categorized = checkouts.map(checkout => {
        const hasActive = checkout.items.some(item => !['delivered', 'cancelled'].includes(item.status));
        const allCancelled = checkout.items.length > 0 && checkout.items.every(item => item.status === 'cancelled');
        
        let bucket = 'active'; // pending / active
        if (!hasActive) {
            bucket = allCancelled ? 'cancelled' : 'delivered';
        }
        
        return { ...checkout, bucket };
    });

    const activeOrders = categorized.filter(c => c.bucket === 'active');
    const deliveredOrders = categorized.filter(c => c.bucket === 'delivered');
    const cancelledOrders = categorized.filter(c => c.bucket === 'cancelled');
    
    const displayOrders = tab === 'active' ? activeOrders : tab === 'delivered' ? deliveredOrders : cancelledOrders;

    

    return (
        <ShopProvider products={[]} persist={false}>
            <StorefrontLayout>
                <Head title={filipino ? 'Aking Mga Order' : 'My Orders'} />
                <div className="store-container customer-profile-page">
                    <header className="customer-profile-heading" style={{ paddingBottom: '16px' }}>
                        <h1>{filipino ? 'Aking Mga Order' : 'My Orders'}</h1>
                    </header>
                    <div className="customer-profile-panel">
                        <div className="customer-profile-content" style={{ maxWidth: '100%' }}>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', borderBottom: '1px solid var(--store-border)', paddingBottom: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                <button type="button" onClick={() => setTab('active')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '8px', fontWeight: 650, fontSize: '14px', transition: 'all 0.2s', background: tab === 'active' ? 'var(--store-green)' : 'var(--store-bg)', color: tab === 'active' ? '#fff' : 'var(--store-muted)', border: `1px solid ${tab === 'active' ? 'var(--store-green)' : 'var(--store-border)'}`, cursor: 'pointer', boxShadow: tab === 'active' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', whiteSpace: 'nowrap' }}>
                                    <Icon name="receipt" size={18} />{filipino ? 'Pending' : 'Pending'}
                                </button>
                                <button type="button" onClick={() => setTab('delivered')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '8px', fontWeight: 650, fontSize: '14px', transition: 'all 0.2s', background: tab === 'delivered' ? 'var(--store-green)' : 'var(--store-bg)', color: tab === 'delivered' ? '#fff' : 'var(--store-muted)', border: `1px solid ${tab === 'delivered' ? 'var(--store-green)' : 'var(--store-border)'}`, cursor: 'pointer', boxShadow: tab === 'delivered' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', whiteSpace: 'nowrap' }}>
                                    <Icon name="check" size={18} />{filipino ? 'Naihatid' : 'Delivered'}
                                </button>
                                <button type="button" onClick={() => setTab('cancelled')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '8px', fontWeight: 650, fontSize: '14px', transition: 'all 0.2s', background: tab === 'cancelled' ? 'var(--store-green)' : 'var(--store-bg)', color: tab === 'cancelled' ? '#fff' : 'var(--store-muted)', border: `1px solid ${tab === 'cancelled' ? 'var(--store-green)' : 'var(--store-border)'}`, cursor: 'pointer', boxShadow: tab === 'cancelled' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', whiteSpace: 'nowrap' }}>
                                    <Icon name="close" size={18} />{filipino ? 'Nakansela' : 'Cancelled'}
                                </button>
                            </div>

                            <div className="customer-orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {displayOrders.length === 0 ? (
                                    <div className="collection-empty" style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--store-soft)', borderRadius: '12px' }}>
                                        <Icon name="receipt" size={48} style={{ margin: '0 auto 16px', color: 'var(--store-muted)' }} />
                                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--store-ink)' }}>{tab === 'active' ? (filipino ? 'Walang pending na order' : 'No pending orders') : tab === 'delivered' ? (filipino ? 'Walang naihatid na order' : 'No delivered orders') : (filipino ? 'Walang nakanselang order' : 'No cancelled orders')}</h2>
                                        <p style={{ color: 'var(--store-muted)', marginTop: '8px', fontSize: '14px' }}>
                                            {tab === 'active' ? (filipino ? 'Wala kang pending na order sa ngayon.' : 'You have no pending orders right now.') : tab === 'delivered' ? (filipino ? 'Dito lalabas ang mga naihatid na order.' : 'Delivered orders will appear here.') : (filipino ? 'Dito lalabas ang mga nakanselang order.' : 'Cancelled orders will appear here.')}
                                        </p>
                                        {tab === 'active' && (
                                            <Link href="/" className="store-button" style={{ marginTop: '24px', display: 'inline-flex' }}>{filipino ? 'Tingnan ang Pamilihan' : 'Browse Marketplace'}</Link>
                                        )}
                                    </div>
                                ) : (
                                    displayOrders.map(checkout => (
                                        <div key={checkout.id} className="checkout-payment-option" style={{ display: 'block', padding: '0', overflow: 'hidden', cursor: 'default' }}>
                                            {/* Order Header */}
                                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--store-border)', background: 'var(--store-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <strong style={{ fontSize: '14px', color: 'var(--store-ink)' }}>Order #{checkout.reference}</strong>
                                                    <span style={{ fontSize: '12px', color: 'var(--store-muted)' }}>{filipino ? 'Inilagay noong' : 'Placed on'} {checkout.date}</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontSize: '12px', color: 'var(--store-muted)', display: 'block', marginBottom: '2px' }}>Total Amount</span>
                                                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--store-ink)' }}>
                                                        ₱{checkout.total.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Order Items */}
                                            <div style={{ padding: '20px' }}>
                                                {checkout.items.map((item, index) => {
                                                    
                                                    return (
                                                        <div key={item.id} style={{ marginBottom: index !== checkout.items.length - 1 ? '16px' : '0', paddingBottom: index !== checkout.items.length - 1 ? '16px' : '0', borderBottom: index !== checkout.items.length - 1 ? '1px solid var(--store-border)' : 'none' }}>
                                                              <div style={{ display: 'flex', gap: '16px' }}>
                                                            {/* Product Image */}
                                                            <Link href={`/?page=product&product=${item.product_id}`} style={{ width: '80px', height: '80px', background: 'var(--store-bg)', border: '1px solid var(--store-border)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, display: 'block', transition: 'border-color 0.2s' }}>
                                                                {item.photoUrl ? (
                                                                    <img src={item.photoUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--store-muted)' }}>
                                                                        <Icon name="leaf" size={28} />
                                                                    </div>
                                                                )}
                                                            </Link>
                                                            
                                                            {/* Item Details */}
                                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                                    <div>
                                                                        <Link href={`/?page=product&product=${item.product_id}`} style={{ display: 'block', fontSize: '15px', fontWeight: 650, margin: '0 0 4px 0', color: 'var(--store-ink)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--store-green-dark)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--store-ink)'}>
                                                                            {item.name}
                                                                        </Link>
                                                                        <p style={{ fontSize: '13px', color: 'var(--store-muted)', margin: '0 0 4px 0' }}>
                                                                            {item.quantity} × {item.unit} • Sold by {item.seller_name}
                                                                        </p>
                                                                        <span style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: 'var(--store-ink)' }}>
                                                                            ₱{item.price.toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                                        <span className={`badge-${item.status}`} style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                            {item.status}
                                                                        </span>
                                                                        {item.status === 'delivered' && (
                                                                            <Link href={`/?page=product&product=${item.product_id}`} className="order-action-link" style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                                                <Icon name="edit" size={14} /> Write Review
                                                                            </Link>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                              </div>
                                                              </div>
                                                                <OrderProgressBar status={item.status} filipino={filipino} />
                                                          </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {/* Order Footer */}
                                            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--store-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'color-mix(in srgb, var(--store-bg) 50%, var(--store-soft))' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--store-muted)' }}>
                                                    Payment Method: <strong style={{ color: 'var(--store-ink)' }}>{checkout.payment_method}</strong>
                                                </span>
                                                {checkout.isCompleted ? (
                                                    <Link href="/" className="checkout-outline-button order-action-btn" style={{ minHeight: '36px', padding: '6px 14px', fontSize: '12px' }}>Buy Again</Link>
                                                ) : (
                                                    <span style={{ fontSize: '12px', color: 'var(--store-muted)' }}>We'll notify you when items update.</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </StorefrontLayout>
        </ShopProvider>
    );
}
