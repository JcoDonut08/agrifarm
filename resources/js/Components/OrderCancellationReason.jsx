import '../../css/order-cancellation.css';

export const cancellationReasons = [
    { value: 'reserved_elsewhere', english: 'Already allocated to another customer', filipino: 'May naunang customer' },
    { value: 'out_of_stock', english: 'Out of stock', filipino: 'Ubos na ang stock' },
    { value: 'harvest_unavailable', english: 'Harvest unavailable', filipino: 'Walang available na ani' },
    { value: 'other', english: 'Other reason', filipino: 'Ibang dahilan' },
];

export default function OrderCancellationReason({ order, filipino = false }) {
    if (order.status !== 'cancelled') return null;
    const reason = cancellationReasons.find(option => option.value === order.cancellation_reason);
    return <div className="order-cancellation-reason">
        <strong>{filipino ? 'Dahilan ng pagkansela' : 'Reason for cancellation'}</strong>
        <p>{reason ? reason[filipino ? 'filipino' : 'english'] : (filipino ? 'Walang naitalang dahilan.' : 'No reason recorded.')}</p>
        {order.cancellation_note && <p className="order-cancellation-note">{order.cancellation_note}</p>}
    </div>;
}
