import CollectionPage from '../Components/Storefront/CollectionPage';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { CalendarCheck, Check, Clock3, Package, Truck, X } from 'lucide-react';
import { useShop } from '../Components/Storefront/ShopContext';
import Icon from '../Components/Storefront/Icon';
import OrderCancellationReason from '../Components/OrderCancellationReason';

function dayKey(value) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

function statusInfo(status, filipino) {
    const statuses = {
        cancelled: [X, 'Item cancelled', 'Kinansela ang item'],
        preparing: [Package, 'Being prepared', 'Inihahanda na'],
        out_for_delivery: [Truck, 'Out for delivery', 'Para sa paghahatid'],
        delivered: [Check, 'Delivered', 'Naihatid na'],
        reservation: [CalendarCheck, 'Item reserved', 'Nakareserba ang item'],
        pending: [Clock3, 'Order received', 'Natanggap ang order'],
    };
    const [StatusIcon, english, translated] = statuses[status] || [Package, 'Order update', 'Update sa order'];
    return { StatusIcon, title: filipino ? translated : english };
}

function notificationMessage(data, filipino) {
    const order = filipino
        ? `Ang order mo${data.product_name ? ` na ${data.product_name}` : ''}`
        : `Your order${data.product_name ? ` for ${data.product_name}` : ''}`;
    const messages = {
        cancelled: [`${order} was cancelled.`, `${order} ay kinansela.`],
        preparing: [`${order} is being prepared.`, `${order} ay inihahanda na.`],
        out_for_delivery: [`${order} is on its way.`, `${order} ay nasa biyahe na.`],
        delivered: [`${order} was marked as delivered.`, `${order} ay minarkahang naihatid na.`],
        reservation: [`${order} has been reserved.`, `${order} ay nakareserba na.`],
        pending: [`${order} has been received.`, `${order} ay natanggap na.`],
    };
    return messages[data.status]?.[filipino ? 1 : 0] || data.message || (filipino ? 'May bagong update sa iyong order.' : 'There is an update to your order.');
}

function SellerProfile({ name, photo }) {
    const [failedPhoto, setFailedPhoto] = useState(null);
    const initials = name?.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    return <span className="notification-seller-profile" aria-hidden="true">
        {photo && failedPhoto !== photo
            ? <img src={photo} alt="" loading="lazy" decoding="async" onError={() => setFailedPhoto(photo)} />
            : <span className="notification-seller-initials">{initials || <Icon name="people" size={24} />}</span>}
    </span>;
}

export default function Notifications() {
    const { notifications = [] } = usePage().props;
    const { filipino } = useShop();
    const [filter, setFilter] = useState('all');
    const text = (english, translated) => filipino ? translated : english;
    const cancelledCount = notifications.filter(notification => notification.data.status === 'cancelled').length;
    const visible = filter === 'cancelled' ? notifications.filter(notification => notification.data.status === 'cancelled') : notifications;
    const today = dayKey(new Date());
    const yesterday = dayKey(new Date(Date.now() - 86400000));
    const groups = [
        { key: 'today', title: text('Today', 'Ngayong araw'), items: [] },
        { key: 'yesterday', title: text('Yesterday', 'Kahapon'), items: [] },
        { key: 'earlier', title: text('Earlier', 'Mga naunang update'), items: [] },
    ];
    visible.forEach(notification => {
        const key = dayKey(new Date(notification.created_at));
        groups[key === today ? 0 : key === yesterday ? 1 : 2].items.push(notification);
    });

    return <CollectionPage title={text('Notifications', 'Mga notipikasyon')} className="notification-page">
        <p className="notification-intro">{text('Order updates and messages from your sellers.', 'Mga update sa order at mensahe mula sa mga nagbebenta.')}</p>
        <div className="notifications-toolbar">
            <div className="notifications-filters" role="group" aria-label={text('Filter notifications', 'Salain ang mga notipikasyon')}>
                <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{text('All', 'Lahat')}<span>{notifications.length}</span></button>
                <button type="button" aria-pressed={filter === 'cancelled'} onClick={() => setFilter('cancelled')}>{text('Cancelled', 'Kinansela')}<span>{cancelledCount}</span></button>
            </div>
            <Link href="/customer/orders" className="notifications-orders-link">{text('My orders', 'Mga order')}<Icon name="arrow" size={16} /></Link>
        </div>
        {visible.length ? <div className="customer-notifications">
            {groups.filter(group => group.items.length).map(group => <section key={group.key} className="notification-group" aria-labelledby={`notification-${group.key}`}>
                <h2 id={`notification-${group.key}`}>{group.title}</h2>
                <ul className="notification-feed">
                    {group.items.map(notification => {
                        const data = notification.data;
                        const { StatusIcon, title } = statusInfo(data.status, filipino);
                        const timestamp = new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(notification.created_at));
                        const fullDate = new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { timeZone: 'Asia/Manila', dateStyle: 'full', timeStyle: 'short' }).format(new Date(notification.created_at));
                        return <li key={notification.id} className={`customer-notification${data.status === 'cancelled' ? ' is-cancelled' : ''}`}>
                            <SellerProfile name={data.seller_name} photo={data.seller_avatar_url} />
                            <div className="notification-body">
                                <div className="notification-heading">
                                    <h3>{data.seller_name || text('Seller update', 'Update mula sa nagbebenta')}</h3>
                                    <span className="notification-status-icon" title={title} aria-hidden="true"><StatusIcon size={16} strokeWidth={1.8} /></span>
                                </div>
                                <p className="notification-description">{notificationMessage(data, filipino)}</p>
                                <div className="notification-meta"><time dateTime={notification.created_at} title={fullDate}>{timestamp}</time>{data.reference && <span className="notification-reference">{data.reference}</span>}</div>
                                <Link href="/customer/orders" className="notification-order-link" aria-label={text(`View order${data.product_name ? ` for ${data.product_name}` : ''}: ${title}`, `Tingnan ang order${data.product_name ? ` para sa ${data.product_name}` : ''}: ${title}`)}>
                                    {text('View order', 'Tingnan ang order')}<Icon name="arrow" size={15} />
                                </Link>
                                {data.status === 'cancelled' && <details className="notification-cancellation-details">
                                    <summary>{text('Cancellation details', 'Detalye ng pagkansela')}<Icon name="chevron" size={16} /></summary>
                                    <OrderCancellationReason order={data} filipino={filipino} />
                                </details>}
                            </div>
                        </li>;
                    })}
                </ul>
            </section>)}
        </div> : <div className="notification-empty" role="status">
            <span><Icon name="bell" size={28} /></span>
            <h2>{notifications.length ? text('No cancelled items', 'Walang kinanselang item') : text('You’re all caught up', 'Wala pang bagong update')}</h2>
            <p>{notifications.length ? text('Cancellation updates will appear here.', 'Dito lalabas ang mga update sa pagkansela.') : text('Your order updates will appear here when a seller changes an item’s status.', 'Dito lalabas ang mga update kapag binago ng nagbebenta ang status ng isang item.')}</p>
            {notifications.length > 0 && <button type="button" onClick={() => setFilter('all')}>{text('Show all notifications', 'Ipakita ang lahat ng notipikasyon')}</button>}
        </div>}
    </CollectionPage>;
}
