import { useMemo, useState } from 'react';
import Icon from '../../Components/Storefront/Icon';
import { categoryLabel, unitLabel } from './SellerLocale';
import { formatMoney } from './DashboardCards';
import '../../../css/seller-analytics.css';

const terminalStatuses = ['delivered', 'cancelled'];
const compactCurrency = new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', notation: 'compact', maximumFractionDigits: 1,
});

function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function addDays(value, days) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
}

function inputDate(value) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseInputDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function orderDate(order) {
    const date = new Date(order.created_at);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getRange(period, from, to, orders) {
    const now = new Date();
    const today = startOfDay(now);
    let start;
    let end;

    if (period === 'week') {
        const mondayOffset = (today.getDay() + 6) % 7;
        start = addDays(today, -mondayOffset);
        end = addDays(start, 7);
    } else if (period === 'year') {
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear() + 1, 0, 1);
    } else if (period === 'custom') {
        start = parseInputDate(from) || today;
        end = addDays(parseInputDate(to) || today, 1);
        if (end <= start) end = addDays(start, 1);
    } else if (period === 'all') {
        const dates = orders.map(orderDate).filter(Boolean);
        start = dates.length ? startOfDay(new Date(Math.min(...dates))) : new Date(today.getFullYear(), today.getMonth(), 1);
        end = addDays(today, 1);
    } else {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    }

    const duration = end.getTime() - start.getTime();
    return {
        start,
        end,
        previousStart: period === 'all' ? null : new Date(start.getTime() - duration),
        previousEnd: period === 'all' ? null : start,
    };
}

function rangeLabel(range, filipino) {
    const formatter = new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
    return `${formatter.format(range.start)} – ${formatter.format(addDays(range.end, -1))}`;
}

function makeTrendPoints(range, period, filipino) {
    const days = Math.max(1, Math.round((range.end - range.start) / 86400000));
    const points = [];

    if (days > 730) {
        let cursor = new Date(range.start.getFullYear(), 0, 1);
        while (cursor < range.end) {
            const next = new Date(cursor.getFullYear() + 1, 0, 1);
            points.push({ label: String(cursor.getFullYear()), start: new Date(cursor), end: next, value: 0, count: 0 });
            cursor = next;
        }
        return points;
    }

    if (period === 'year' || days > 120) {
        let cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
        while (cursor < range.end) {
            const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
            points.push({
                label: new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { month: 'short' }).format(cursor),
                start: new Date(cursor), end: next, value: 0, count: 0,
            });
            cursor = next;
        }
        return points;
    }

    const step = period === 'month' || days > 14 ? 7 : 1;
    for (let offset = 0; offset < days; offset += step) {
        const start = addDays(range.start, offset);
        const end = addDays(range.start, Math.min(offset + step, days));
        points.push({
            label: step === 1
                ? new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { weekday: 'short' }).format(start)
                : `${start.getDate()}–${addDays(end, -1).getDate()}`,
            start, end, value: 0, count: 0,
        });
    }
    return points;
}

function percent(value, total) {
    return total ? Math.round((value / total) * 100) : 0;
}

function EmptyAnalytics({ title, children }) {
    return <div className="analytics-empty"><Icon name="sprout" size={28} /><strong>{title}</strong><p>{children}</p></div>;
}

function CustomerAvatar({ customer, filipino }) {
    const [failedPhoto, setFailedPhoto] = useState(null);
    const initials = customer.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('') || '?';
    const label = customer.isWalkIn
        ? (filipino ? `Avatar ng walk-in na customer na si ${customer.name}` : `${customer.name} walk-in customer avatar`)
        : (filipino ? `Larawan sa profile ni ${customer.name}` : `${customer.name} profile photo`);

    return <span className="analytics-customer-avatar" role="img" aria-label={label} data-source={customer.isWalkIn ? 'walk-in' : 'web'}>
        {customer.avatarUrl && failedPhoto !== customer.avatarUrl
            ? <img src={customer.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedPhoto(customer.avatarUrl)} />
            : <span aria-hidden="true">{initials}</span>}
    </span>;
}

export default function Analytics({ orders = [], products = [], SellerIcon, filipino = false }) {
    const today = useMemo(() => new Date(), []);
    const [period, setPeriod] = useState('month');
    const [from, setFrom] = useState(() => inputDate(new Date(today.getFullYear(), today.getMonth(), 1)));
    const [to, setTo] = useState(() => inputDate(today));
    const [productFilter, setProductFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [chartMode, setChartMode] = useState('value');

    const productById = useMemo(() => new Map(products.map(product => [Number(product.id), product])), [products]);
    const categories = useMemo(() => [...new Set(products.map(product => product.category).filter(Boolean))].sort(), [products]);
    const range = useMemo(() => getRange(period, from, to, orders), [period, from, to, orders]);

    const matchesCatalogFilters = order => {
        const product = productById.get(Number(order.product_id));
        if (productFilter !== 'all' && Number(order.product_id) !== Number(productFilter)) return false;
        if (categoryFilter !== 'all' && product?.category !== categoryFilter) return false;
        return true;
    };
    const catalogOrders = orders.filter(matchesCatalogFilters);
    const filteredOrders = catalogOrders.filter(order => {
        const date = orderDate(order);
        return date && date >= range.start && date < range.end;
    });
    const previousOrders = range.previousStart ? catalogOrders.filter(order => {
        const date = orderDate(order);
        return date && date >= range.previousStart && date < range.previousEnd;
    }) : [];
    const completedOrders = filteredOrders.filter(order => order.status === 'delivered');
    const cancelledOrders = filteredOrders.filter(order => order.status === 'cancelled');
    const completedValue = completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const previousCompletedValue = previousOrders.filter(order => order.status === 'delivered').reduce((sum, order) => sum + Number(order.total || 0), 0);
    const averageValue = completedOrders.length ? completedValue / completedOrders.length : 0;
    const customerKeys = new Set(filteredOrders.map(order => {
        const customerId = order.customer_id || order.customer?.id;
        const name = String(order.customer_name || '').trim() || 'walk-in customer';
        return customerId ? `customer-${customerId}` : `walk-in-${name.toLocaleLowerCase()}`;
    }));
    const deliveredCustomerKeys = new Set(completedOrders.map(order => {
        const customerId = order.customer_id || order.customer?.id;
        const name = String(order.customer_name || '').trim() || 'walk-in customer';
        return customerId ? `customer-${customerId}` : `walk-in-${name.toLocaleLowerCase()}`;
    }));

    const trendPoints = useMemo(() => {
        const points = makeTrendPoints(range, period, filipino);
        completedOrders.forEach(order => {
            const date = orderDate(order);
            const point = points.find(item => date >= item.start && date < item.end);
            if (point) {
                point.value += Number(order.total || 0);
                point.count += 1;
            }
        });
        return points;
    }, [range, period, filipino, completedOrders]);
    const chartMaximum = Math.max(...trendPoints.map(point => chartMode === 'value' ? point.value : point.count), 0);

    const productPerformance = useMemo(() => {
        const performance = new Map();
        completedOrders.forEach(order => {
            const product = productById.get(Number(order.product_id));
            const key = product ? `product-${product.id}` : `archived-${order.product_name}-${order.unit}`;
            const current = performance.get(key) || {
                id: product?.id,
                name: order.product_name,
                category: product?.category || 'Archived listing',
                unit: order.unit,
                quantity: 0,
                orders: 0,
                value: 0,
                stock: product?.stock,
            };
            current.quantity += Number(order.quantity || 0);
            current.orders += 1;
            current.value += Number(order.total || 0);
            performance.set(key, current);
        });
        return [...performance.values()].sort((a, b) => b.value - a.value);
    }, [completedOrders, productById]);

    const categoryPerformance = useMemo(() => {
        const totals = new Map();
        productPerformance.forEach(product => {
            const current = totals.get(product.category) || { category: product.category, value: 0, orders: 0 };
            current.value += product.value;
            current.orders += product.orders;
            totals.set(product.category, current);
        });
        return [...totals.values()].sort((a, b) => b.value - a.value);
    }, [productPerformance]);
    const categoryMaximum = Math.max(...categoryPerformance.map(item => item.value), 0);

    const topCustomers = useMemo(() => {
        const customers = new Map();

        completedOrders.forEach(order => {
            const name = String(order.customer_name || '').trim() || (filipino ? 'Walk-in na customer' : 'Walk-in customer');
            const customerId = order.customer_id || order.customer?.id;
            const key = customerId ? `customer-${customerId}` : `walk-in-${name.toLocaleLowerCase()}`;
            const avatarUrl = order.customer_avatar_url || order.customer?.avatar_url || order.customer?.profile_photo_url || null;
            const productName = String(order.product_name || '').trim() || (filipino ? 'Hindi kilalang produkto' : 'Unknown product');
            const productKey = order.product_id ? `product-${order.product_id}` : productName.toLocaleLowerCase();
            const current = customers.get(key) || {
                key,
                name,
                avatarUrl,
                isWalkIn: !customerId,
                orders: 0,
                value: 0,
                products: new Map(),
            };
            const product = current.products.get(productKey) || { name: productName, orders: 0, quantity: 0 };
            product.orders += 1;
            product.quantity += Number(order.quantity || 0);
            current.products.set(productKey, product);
            if (!current.avatarUrl && avatarUrl) current.avatarUrl = avatarUrl;
            current.orders += 1;
            current.value += Number(order.total || 0);
            customers.set(key, current);
        });

        return [...customers.values()]
            .sort((a, b) => b.value - a.value || b.orders - a.orders || a.name.localeCompare(b.name))
            .slice(0, 5)
            .map(customer => ({
                ...customer,
                frequentProduct: [...customer.products.values()]
                    .sort((a, b) => b.orders - a.orders || b.quantity - a.quantity || a.name.localeCompare(b.name))[0],
            }));
    }, [completedOrders, filipino]);

    const outcomeItems = [
        { key: 'delivered', label: filipino ? 'Naihatid' : 'Delivered', count: completedOrders.length },
        { key: 'cancelled', label: filipino ? 'Kinansela' : 'Cancelled', count: cancelledOrders.length },
        { key: 'progress', label: filipino ? 'Kasalukuyang pinoproseso' : 'In progress', count: filteredOrders.filter(order => !terminalStatuses.includes(order.status)).length },
    ];

    const comparison = completedValue - previousCompletedValue;

    const periodOptions = filipino
        ? [['week', 'Linggo'], ['month', 'Buwan'], ['year', 'Taon'], ['custom', 'Piliin'], ['all', 'Lahat']]
        : [['week', 'Week'], ['month', 'Month'], ['year', 'Year'], ['custom', 'Custom'], ['all', 'All time']];

    return <div className="seller-analytics">
        <header className="analytics-heading">
            <div><h1 className="seller-page-title">{filipino ? 'Pagsusuri' : 'Analytics'}</h1><p>{filipino ? 'Unawain kung ano ang mabenta at kung aling stock ang nangangailangan ng pansin.' : 'Understand what sells and which stock needs attention.'}</p></div>
            <span className="analytics-range"><Icon name="trend" size={17} />{rangeLabel(range, filipino)}</span>
        </header>

        <section className="seller-panel analytics-filters" aria-label={filipino ? 'Mga filter ng pagsusuri' : 'Analytics filters'}>
            <div className="analytics-periods" role="group" aria-label={filipino ? 'Saklaw ng petsa' : 'Date range'}>
                {periodOptions.map(([value, label]) => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}
            </div>
            {period === 'custom' && <div className="analytics-custom-dates">
                <label>{filipino ? 'Mula' : 'From'}<input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
                <label>{filipino ? 'Hanggang' : 'To'}<input type="date" value={to} min={from} max={inputDate(today)} onChange={event => setTo(event.target.value)} /></label>
            </div>}
            <div className="analytics-selects">
                <label>{filipino ? 'Produkto' : 'Product'}<select value={productFilter} onChange={event => setProductFilter(event.target.value)}><option value="all">{filipino ? 'Lahat ng produkto' : 'All products'}</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                <label>{filipino ? 'Kategorya' : 'Category'}<select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">{filipino ? 'Lahat ng kategorya' : 'All categories'}</option>{categories.map(category => <option key={category} value={category}>{categoryLabel(category, filipino)}</option>)}</select></label>
            </div>
        </section>

        <section className="analytics-metrics" aria-label={filipino ? 'Buod ng pagganap' : 'Performance summary'}>
            <article className="analytics-metric analytics-metric--primary"><span><SellerIcon name="trend" /></span><div><h2>{filipino ? 'Halaga ng nakumpletong benta' : 'Completed sales value'}</h2><strong>{formatMoney(completedValue)}</strong><p>{range.previousStart ? (comparison === 0 ? (filipino ? 'Kapareho ng nakaraang panahon' : 'Same as the previous period') : `${formatMoney(Math.abs(comparison))} ${comparison > 0 ? (filipino ? 'mas mataas' : 'higher') : (filipino ? 'mas mababa' : 'lower')} ${filipino ? 'kaysa nakaraan' : 'than before'}`) : (filipino ? `${completedOrders.length} naihatid na order` : `${completedOrders.length} delivered ${completedOrders.length === 1 ? 'order' : 'orders'}`)}</p></div></article>
            <article className="analytics-metric"><span><SellerIcon name="check" /></span><div><h2>{filipino ? 'Mga naihatid na order' : 'Delivered orders'}</h2><strong>{completedOrders.length}</strong><p>{filipino ? `${percent(completedOrders.length, filteredOrders.length)}% ng mga naitalang order` : `${percent(completedOrders.length, filteredOrders.length)}% of recorded orders`}</p></div></article>
            <article className="analytics-metric"><span><SellerIcon name="cart" /></span><div><h2>{filipino ? 'Karaniwang halaga ng order' : 'Average completed order'}</h2><strong>{formatMoney(averageValue)}</strong><p>{filipino ? 'Batay lamang sa mga naihatid na order' : 'Based on delivered orders only'}</p></div></article>
            <article className="analytics-metric"><span><SellerIcon name="people" /></span><div><h2>{filipino ? 'Mga customer' : 'Customers'}</h2><strong>{customerKeys.size}</strong><p>{filipino ? `${deliveredCustomerKeys.size} may naihatid na order` : `${deliveredCustomerKeys.size} ${deliveredCustomerKeys.size === 1 ? 'customer has' : 'customers have'} delivered orders`}</p></div></article>
        </section>

        <div className="analytics-overview-grid">
            <section className="seller-panel analytics-trend">
                <div className="seller-panel-heading"><div><h2><SellerIcon name="chart" />{filipino ? 'Takbo ng nakumpletong benta' : 'Completed sales trend'}</h2><p>{filipino ? 'Mga naihatid na order ayon sa petsang naitala.' : 'Delivered orders grouped by their recorded date.'}</p></div><div className="analytics-chart-toggle" role="group" aria-label={filipino ? 'Sukatan ng graph' : 'Chart measure'}><button type="button" aria-pressed={chartMode === 'value'} onClick={() => setChartMode('value')}>{filipino ? 'Halaga' : 'Value'}</button><button type="button" aria-pressed={chartMode === 'orders'} onClick={() => setChartMode('orders')}>{filipino ? 'Mga order' : 'Orders'}</button></div></div>
                {chartMaximum ? <div className="analytics-bar-chart" role="img" aria-label={filipino ? 'Graph ng nakumpletong benta' : 'Completed sales chart'}>{trendPoints.map(point => {
                    const value = chartMode === 'value' ? point.value : point.count;
                    const label = chartMode === 'value' ? compactCurrency.format(value) : String(value);
                    const fullLabel = chartMode === 'value' ? formatMoney(value) : String(value);
                    return <div className="analytics-bar-column" key={`${point.label}-${point.start}`}><div className="analytics-bar-track"><span className="analytics-bar-value">{value ? label : ''}</span><span className="analytics-bar-fill" style={{ height: value ? `${Math.max(5, (value / chartMaximum) * 100)}%` : 0 }} title={`${point.label}: ${fullLabel}`} /></div><span>{point.label}</span></div>;
                })}</div> : <EmptyAnalytics title={filipino ? 'Walang nakumpletong benta' : 'No completed sales'}>{filipino ? 'Walang naihatid na order na tumutugma sa mga napiling filter.' : 'No delivered orders match the selected filters.'}</EmptyAnalytics>}
            </section>

            <section className="seller-panel analytics-outcomes">
                <div className="seller-panel-heading"><h2><SellerIcon name="cart" />{filipino ? 'Kinalabasan ng mga order' : 'Order outcomes'}</h2></div>
                {filteredOrders.length ? <div className="analytics-outcome-list">{outcomeItems.map(item => <div key={item.key}><div><span>{item.label}</span><strong>{item.count} <small>{percent(item.count, filteredOrders.length)}%</small></strong></div><span className={`analytics-outcome-track analytics-outcome-track--${item.key}`}><i style={{ width: `${percent(item.count, filteredOrders.length)}%` }} /></span></div>)}</div> : <EmptyAnalytics title={filipino ? 'Walang order' : 'No orders found'}>{filipino ? 'Subukan ang ibang petsa o filter ng produkto.' : 'Try another date, product, or category filter.'}</EmptyAnalytics>}
            </section>
        </div>

        <div className="analytics-detail-grid">
            <section className="seller-panel analytics-products">
                <div className="seller-panel-heading"><div><h2><SellerIcon name="trophy" />{filipino ? 'Pagganap ng produkto' : 'Product performance'}</h2><p>{filipino ? 'Niraranggo ayon sa halaga ng nakumpletong benta.' : 'Ranked by completed sales value.'}</p></div></div>
                {productPerformance.length ? <div className="seller-table-wrap"><table><thead><tr><th>{filipino ? 'Produkto' : 'Product'}</th><th>{filipino ? 'Nabenta' : 'Sold'}</th><th>{filipino ? 'Mga order' : 'Orders'}</th><th>{filipino ? 'Halaga' : 'Value'}</th><th>{filipino ? 'Stock ngayon' : 'Current stock'}</th></tr></thead><tbody>{productPerformance.map((product, index) => <tr key={`${product.name}-${product.unit}`}><td><div className="analytics-product-name">{index === 0 && <Icon name="trophy" size={15} />}<span><strong>{product.name}</strong><small>{product.category === 'Archived listing' ? (filipino ? 'Naka-archive na listing' : product.category) : categoryLabel(product.category, filipino)}</small></span></div></td><td>{product.quantity} {unitLabel(product.unit, filipino)}</td><td>{product.orders}</td><td><strong>{formatMoney(product.value)}</strong></td><td>{product.stock === undefined ? '—' : `${product.stock} ${unitLabel(product.unit, filipino)}`}</td></tr>)}</tbody></table></div> : <EmptyAnalytics title={filipino ? 'Wala pang ranggo ng produkto' : 'No product ranking yet'}>{filipino ? 'Lalabas dito ang mga produktong may naihatid na order.' : 'Products with delivered orders will appear here.'}</EmptyAnalytics>}
            </section>

            <section className="seller-panel analytics-categories">
                <div className="seller-panel-heading"><h2><SellerIcon name="box" />{filipino ? 'Benta ayon sa kategorya' : 'Sales by category'}</h2></div>
                {categoryPerformance.length ? <div className="analytics-category-list">{categoryPerformance.map(item => <div key={item.category}><div><strong>{item.category === 'Archived listing' ? (filipino ? 'Naka-archive na listing' : item.category) : categoryLabel(item.category, filipino)}</strong><span>{formatMoney(item.value)}</span></div><span><i style={{ width: `${percent(item.value, categoryMaximum)}%` }} /></span><small>{item.orders} {filipino ? 'naihatid na order' : `delivered ${item.orders === 1 ? 'order' : 'orders'}`}</small></div>)}</div> : <EmptyAnalytics title={filipino ? 'Walang datos ng kategorya' : 'No category data'}>{filipino ? 'Kailangan muna ng naihatid na order para maikumpara ang mga kategorya.' : 'A delivered order is needed before categories can be compared.'}</EmptyAnalytics>}
            </section>
        </div>

        <section className="seller-panel analytics-customers">
            <div className="seller-panel-heading"><div><h2><SellerIcon name="people" />{filipino ? 'Nangungunang mga customer' : 'Top customers'}</h2><p>{filipino ? 'Hanggang limang customer na may pinakamataas na halaga ng nakumpletong benta.' : 'Up to five customers ranked by completed sales value.'}</p></div></div>
            {topCustomers.length ? <div className="analytics-customer-list">
                <div className="analytics-customer-header" aria-hidden="true"><span>{filipino ? 'Ranggo' : 'Rank'}</span><span>{filipino ? 'Customer' : 'Customer'}</span><span>{filipino ? 'Mga naihatid na order' : 'Delivered orders'}</span><span>{filipino ? 'Halaga' : 'Value'}</span><span>{filipino ? 'Madalas bilhing produkto' : 'Frequently bought product'}</span></div>
                {topCustomers.map((customer, index) => <article className="analytics-customer-row" key={customer.key}>
                        <span className={`analytics-customer-rank analytics-customer-rank--${index + 1}`} aria-label={`${filipino ? 'Ranggo' : 'Rank'} ${index + 1}`} title={`${filipino ? 'Ranggo' : 'Rank'} ${index + 1}`}>{index === 0 ? <Icon name="trophy" size={17} /> : index + 1}</span>
                        <div className="analytics-customer-name"><CustomerAvatar customer={customer} filipino={filipino} /><strong>{customer.name}</strong></div>
                        <div className="analytics-customer-stat"><small>{filipino ? 'Mga naihatid na order' : 'Delivered orders'}</small><strong>{customer.orders}</strong></div>
                        <div className="analytics-customer-value"><small>{filipino ? 'Halaga' : 'Value'}</small><strong>{formatMoney(customer.value)}</strong></div>
                        <div className="analytics-customer-product"><small>{filipino ? 'Madalas bilhing produkto' : 'Frequently bought product'}</small><span><Icon name="box" size={17} /></span><div><strong>{customer.frequentProduct.name}</strong><small>{customer.frequentProduct.orders} {filipino ? 'naihatid na order' : `delivered ${customer.frequentProduct.orders === 1 ? 'order' : 'orders'}`}</small></div></div>
                    </article>)}
            </div> : <EmptyAnalytics title={filipino ? 'Wala pang nangungunang customer' : 'No top customers yet'}>{filipino ? 'Lalabas dito ang mga customer kapag may naihatid nang order.' : 'Customers will appear here after an order is delivered.'}</EmptyAnalytics>}
        </section>

        <aside className="analytics-data-note"><Icon name="receipt" size={19} /><p><strong>{filipino ? 'Tungkol sa mga bilang na ito:' : 'About these numbers:'}</strong> {filipino ? 'Ang halaga ng nakumpletong benta ay mula sa mga order na minarkahang naihatid at inayos ayon sa petsang naitala ang order. Hindi nito kinukumpirma ang natanggap na bayad at hindi ito tubo.' : 'Completed sales value comes from orders marked delivered and is grouped by the date each order was recorded. It does not confirm payment received and is not profit.'}</p></aside>
    </div>;
}
