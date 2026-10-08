import CollectionPage, { CollectionEmpty } from '../Components/Storefront/CollectionPage';
import { Link, usePage } from '@inertiajs/react';
import { useShop } from '../Components/Storefront/ShopContext';
import OrderCancellationReason from '../Components/OrderCancellationReason';

export default function Notifications() {
    const { notifications = [] } = usePage().props;
    const { filipino } = useShop();
    return <CollectionPage title={filipino ? 'Mga notipikasyon' : 'Notifications'}>
        {notifications.length ? <div className="customer-notifications">
            {notifications.map(notification => <article key={notification.id} className="customer-notification">
                <h2>{filipino ? (notification.data.status === 'cancelled' ? 'Kinansela ang order' : 'Na-update ang order') : notification.data.title}</h2>
                <p>{filipino ? `${notification.data.product_name || ''} · Order ${notification.data.reference || ''}` : notification.data.message}</p>
                <time dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString(filipino ? 'fil-PH' : 'en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                <OrderCancellationReason order={notification.data} filipino={filipino} />
                <Link href="/customer/orders" className="checkout-outline-button">{filipino ? 'Tingnan ang order' : 'View order'}</Link>
            </article>)}
        </div> : <CollectionEmpty icon="bell" title={filipino ? 'Wala pang notipikasyon' : 'No notifications yet'}>{filipino ? 'Lalabas dito ang mga update sa iyong order.' : 'Your order updates will appear here.'}</CollectionEmpty>}
    </CollectionPage>;
}
