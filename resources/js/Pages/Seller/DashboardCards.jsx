import { useMemo, useState } from 'react';
import Icon from '../../Components/Storefront/Icon';
import { unitLabel } from './SellerLocale';

const currency = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
});

const compactCurrency = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    notation: 'compact',
    maximumFractionDigits: 1,
});

const statusLabels = {
    pending: 'Pending',
    reservation: 'Reserved',
    preparing: 'Preparing',
    out_for_delivery: 'Out for delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

const filipinoStatusLabels = {
    pending: 'Naghihintay',
    reservation: 'Nakareserba',
    preparing: 'Inihahanda',
    out_for_delivery: 'Para sa paghahatid',
    delivered: 'Naihatid',
    cancelled: 'Kinansela',
};

function salesDate(order) {
    return new Date(order.updated_at || order.created_at);
}

function manilaDateParts(value = new Date()) {
    const parts = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }).formatToParts(value);
    const number = type => Number(parts.find(part => part.type === type)?.value);

    return { year: number('year'), month: number('month') - 1, day: number('day') };
}

function manilaBoundary(year, month, day, hour = 0) {
    return new Date(Date.UTC(year, month, day, hour - 8));
}

function makeSalesPoints(period, filipino, now = new Date()) {
    const { year, month, day } = manilaDateParts(now);

    if (period === 'today') {
        return ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM'].map((label, index) => ({
            label,
            start: manilaBoundary(year, month, day, index * 4),
            end: manilaBoundary(year, month, day, (index + 1) * 4),
            value: 0,
        }));
    }

    if (period === 'month') {
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        return Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, index) => {
            const firstDay = index * 7 + 1;
            const lastDay = Math.min(firstDay + 6, daysInMonth);
            return {
                label: `${firstDay}\u2013${lastDay}`,
                start: manilaBoundary(year, month, firstDay),
                end: manilaBoundary(year, month, lastDay + 1),
                value: 0,
            };
        });
    }

    if (period === 'year') {
        const monthLabels = filipino
            ? ['Ene', 'Peb', 'Mar', 'Abr', 'May', 'Hun', 'Hul', 'Ago', 'Set', 'Okt', 'Nob', 'Dis']
            : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthLabels.map((label, index) => ({
            label,
            start: manilaBoundary(year, index, 1),
            end: manilaBoundary(year, index + 1, 1),
            value: 0,
        }));
    }

    const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
    const mondayOffset = (weekday + 6) % 7;

    const dayLabels = filipino ? ['Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab', 'Lin'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return dayLabels.map((label, index) => {
        const start = manilaBoundary(year, month, day - mondayOffset + index);
        const end = manilaBoundary(year, month, day - mondayOffset + index + 1);
        return { label, start, end, value: 0 };
    });
}

function scaleMaximum(value) {
    if (value <= 0) return 0;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    const rounded = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return rounded * magnitude;
}

export function getDashboardMetrics(orders, products) {
    const completedOrders = orders.filter(order => order.status === 'delivered');

    return {
        totalSales: completedOrders.reduce((total, order) => total + Number(order.total || 0), 0),
        completedOrders: completedOrders.length,
        pendingOrders: orders.filter(order => ['pending', 'reservation'].includes(order.status)).length,
        activeProducts: products.filter(product => Number(product.stock) > 0).length,
        lowStockProducts: products.filter(product => Number(product.stock) <= Number(product.threshold)).length,
    };
}

export function formatMoney(value) {
    return currency.format(Number(value || 0));
}

export function SalesOverview({ orders = [], SellerIcon, filipino = false }) {
    const [period, setPeriod] = useState('week');
    const points = useMemo(() => {
        const nextPoints = makeSalesPoints(period, filipino);

        orders.filter(order => order.status === 'delivered').forEach(order => {
            const date = salesDate(order);
            const point = nextPoints.find(item => date >= item.start && date < item.end);
            if (point) point.value += Number(order.total || 0);
        });

        return nextPoints;
    }, [orders, period, filipino]);
    const total = points.reduce((sum, point) => sum + point.value, 0);
    const maximum = Math.max(...points.map(point => point.value), 0);
    const chartMaximum = scaleMaximum(maximum);
    const scaleTicks = [1, .75, .5, .25, 0].map(position => chartMaximum * position);
    const periodLabel = {
        today: 'today',
        week: 'this week',
        month: 'this month',
        year: 'this year',
    }[period];
    const filipinoPeriodLabel = { today: 'ngayong araw', week: 'ngayong linggo', month: 'ngayong buwan', year: 'ngayong taon' }[period];
    const periodOptions = filipino
        ? [['today', 'Ngayon'], ['week', 'Linggo'], ['month', 'Buwan'], ['year', 'Taon']]
        : [['today', 'Today'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']];

    return <section className="seller-panel seller-sales">
        <div className="seller-panel-heading">
            <h2><SellerIcon name="trend" />{filipino ? 'Buod ng benta' : 'Sales overview'}</h2>
            <div className="seller-sales-periods" role="group" aria-label={filipino ? 'Panahon ng benta' : 'Sales period'}>
                {periodOptions.map(([value, label]) => <button
                    key={value}
                    type="button"
                    aria-pressed={period === value}
                    onClick={() => setPeriod(value)}
                >{label}</button>)}
            </div>
        </div>
        <strong className="seller-sales-total">{formatMoney(total)}</strong>
        <p>{filipino ? `Mga nakumpletong benta ${filipinoPeriodLabel}` : `Completed sales ${periodLabel}`}</p>
        <div className={`seller-chart ${total > 0 ? 'has-sales' : ''}`}>
            <div className="seller-chart-grid" aria-hidden="true">
                {scaleTicks.map((tick, index) => <span key={index} style={{ top: `${index * 25}%` }}>{chartMaximum > 0 ? compactCurrency.format(tick) : index === 4 ? formatMoney(0) : ''}</span>)}
            </div>
            {total > 0 ? <div className="seller-chart-bars" role="img" aria-label={filipino ? `${formatMoney(total)} na nakumpletong benta ${filipinoPeriodLabel}` : `${formatMoney(total)} in completed sales ${periodLabel}`}>
                {points.map(point => <div className="seller-chart-column" key={point.label} style={{ '--bar-height': point.value > 0 ? `${(point.value / chartMaximum) * 100}%` : '0%' }}>
                    <span className="seller-chart-value">{point.value > 0 ? compactCurrency.format(point.value) : ''}</span>
                    <span className="seller-chart-bar" title={`${point.label}: ${formatMoney(point.value)}`} />
                </div>)}
            </div> : <div className="seller-chart-message">
                <strong>{filipino ? `Walang benta ${filipinoPeriodLabel}` : `No sales ${periodLabel}`}</strong>
                <span>{filipino ? 'Lalabas dito ang mga nakumpletong order.' : 'Completed orders will appear here.'}</span>
            </div>}
            <div className="seller-chart-labels">{points.map(point => <span key={point.label}>{point.label}</span>)}</div>
        </div>
    </section>;
}

function orderNumber(order) {
    return `#WALK-${String(order.id).padStart(5, '0')}`;
}

export function RecentOrders({ orders = [], products = [], navigate, SellerIcon, EmptyState, filipino = false }) {
    const recentOrders = orders.slice(0, 5);
    const productById = useMemo(() => new Map(products.map(product => [Number(product.id), product])), [products]);

    return <section className="seller-panel seller-recent-orders">
        <div className="seller-panel-heading">
            <h2><SellerIcon name="cart" />{filipino ? 'Mga kamakailang order' : 'Recent orders'}</h2>
            <button type="button" className="seller-text-link" onClick={() => navigate('Orders')}>{filipino ? 'Tingnan lahat ng order' : 'View all orders'} <Icon name="arrow" size={17} /></button>
        </div>
        <div className="seller-table-wrap">
            <table>
                <thead><tr><th>Order</th><th>{filipino ? 'Produkto' : 'Product'}</th><th>{filipino ? 'Kabuuan' : 'Total'}</th><th>Status</th></tr></thead>
                <tbody>{recentOrders.length ? recentOrders.map(order => {
                    const product = productById.get(Number(order.product_id));
                    return <tr className="seller-recent-order-row" key={order.id}>
                    <td><button type="button" className="seller-order-link" onClick={() => navigate('Orders')} aria-label={filipino ? `Tingnan ang ${orderNumber(order)}` : `View ${orderNumber(order)}`}>{orderNumber(order)}</button></td>
                    <td><div className="seller-recent-product"><span className="seller-recent-product-image" aria-hidden="true">{product?.photo_url ? <img src={product.photo_url} alt="" /> : <Icon name="sprout" size={18} />}</span><span className="seller-recent-product-copy"><strong>{order.product_name}</strong><small>{order.quantity} {unitLabel(order.unit, filipino)}</small></span></div></td>
                    <td>{formatMoney(order.total)}</td>
                    <td><span className={`seller-order-status seller-order-status--${order.status}`}>{(filipino ? filipinoStatusLabels : statusLabels)[order.status] || order.status}</span></td>
                </tr>}) : <tr><td colSpan="4"><EmptyState icon="cart" title={filipino ? 'Wala pang order' : 'No orders yet'}>{filipino ? 'Lalabas dito ang mga bagong order para sa inyong barangay.' : 'New orders for your barangay will appear here.'}</EmptyState></td></tr>}</tbody>
            </table>
        </div>
    </section>;
}

export function InventoryWatch({ products = [], navigate, SellerIcon, EmptyState, filipino = false }) {
    const lowStockProducts = products.filter(product => Number(product.stock) <= Number(product.threshold)).slice(0, 4);

    return <section className="seller-panel seller-inventory">
        <div className="seller-panel-heading"><h2><SellerIcon name="box" />{filipino ? 'Bantay sa imbentaryo' : 'Inventory watch'}</h2></div>
        <div className="seller-inventory-items">{lowStockProducts.length ? lowStockProducts.map(product => <div className="seller-inventory-item" key={product.id}>
            <img src={product.photo_url} alt="" />
            <div><strong>{product.name}</strong><p>{filipino ? `${product.stock} ${unitLabel(product.unit, true)} na lang` : `${product.stock} ${product.unit} left`}</p></div>
            <span className={Number(product.stock) === 0 ? 'is-out' : ''}>{filipino ? (Number(product.stock) === 0 ? 'Ubos na ang stock' : 'Kaunti na ang stock') : (Number(product.stock) === 0 ? 'Out of stock' : 'Low stock')}</span>
        </div>) : <EmptyState icon="box" title={filipino ? (products.length ? 'Sapat ang stock' : 'Wala pang imbentaryong susubaybayan') : (products.length ? 'Stock levels are healthy' : 'No inventory to track')}>{filipino ? (products.length ? 'Walang produktong kailangang dagdagan ang stock ngayon.' : 'Lalabas dito ang mga produktong kaunti na ang stock kapag may mga listing na ang tindahan.') : (products.length ? 'No products need replenishment right now.' : 'Low-stock products will appear here once your store has listings.')}</EmptyState>}</div>
        <button type="button" className="seller-outline-button" onClick={() => navigate('Products')}>{filipino ? 'Pamahalaan ang mga produkto' : 'Manage products'}</button>
    </section>;
}
