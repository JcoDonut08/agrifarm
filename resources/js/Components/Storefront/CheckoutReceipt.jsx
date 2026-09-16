import { createPortal } from 'react-dom';
import Icon from './Icon';
import { money } from './catalog';

const dateLabel = value => new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const pdfSafe = value => String(value ?? '').replaceAll('₱', 'PHP ').replace(/[–—]/g, '-').replace(/[’]/g, "'");

export async function downloadCheckoutReceipt(order) {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const left = 20;
    const right = pageWidth - left;
    let y = 20;

    function line(label, value, emphasis = false) {
        if (y > pageHeight - 28) { pdf.addPage(); y = 22; }
        pdf.setFont('helvetica', emphasis ? 'bold' : 'normal');
        pdf.setFontSize(emphasis ? 11 : 9);
        const wrapped = pdf.splitTextToSize(pdfSafe(label), 105);
        pdf.text(wrapped, left, y);
        pdf.text(pdfSafe(value), right, y, { align: 'right' });
        y += Math.max(8, wrapped.length * 5);
    }

    pdf.setFillColor(15, 120, 62);
    pdf.rect(0, 0, pageWidth, 7, 'F');
    pdf.setTextColor(9, 86, 45);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(21);
    pdf.text('AgriFarm', left, y);
    y += 9;
    pdf.setTextColor(19, 47, 36);
    pdf.setFontSize(13);
    pdf.text('CASH ON DELIVERY ORDER SLIP', left, y);
    y += 10;
    pdf.setDrawColor(204, 216, 207);
    pdf.line(left, y, right, y);
    y += 8;
    line('Order ID', order.reference, true);
    line('Placed', dateLabel(order.placedAt));
    line('Status', 'Awaiting seller review');
    line('Payment', 'Cash on Delivery - not yet paid');
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('DELIVER TO', left, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    for (const part of [order.recipientName, order.phone, order.address, order.notes ? `Note: ${order.notes}` : null].filter(Boolean)) {
        const wrapped = pdf.splitTextToSize(pdfSafe(part), right - left);
        pdf.text(wrapped, left, y);
        y += wrapped.length * 5;
    }
    y += 7;
    pdf.line(left, y, right, y);
    y += 9;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('ORDER ITEMS', left, y);
    y += 9;
    for (const item of order.items) {
        line(`${item.name}  x${item.quantity} ${item.unit}`, money(item.price * item.quantity), true);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(83, 99, 90);
        pdf.text(`${pdfSafe(money(item.price))} per ${pdfSafe(item.unit)}`, left, y - 3);
        pdf.setTextColor(19, 47, 36);
        y += 4;
    }
    if (y > pageHeight - 45) { pdf.addPage(); y = 22; }
    pdf.line(left, y, right, y);
    y += 10;
    line('GOODS SUBTOTAL', money(order.goodsTotal), true);
    y += 3;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(83, 99, 90);
    const note = pdf.splitTextToSize('Delivery charge is not included. The seller must confirm any charge before fulfillment. This is an order slip, not proof of payment.', right - left);
    pdf.text(note, left, y);
    y += note.length * 5 + 8;
    pdf.setTextColor(9, 86, 45);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Thank you for supporting your local barangay farm.', left, y);
    pdf.save(`${order.reference}-receipt.pdf`);
}

export default function CheckoutReceipt({ order }) {
    if (typeof document === 'undefined') return null;

    return createPortal(<section className="checkout-print-receipt" aria-hidden="true">
        <header className="receipt-brand"><Icon name="sprout" size={27} /><strong>AgriFarm</strong><span>Pasig City marketplace</span></header>
        <div className="receipt-heading"><h1>CASH ON DELIVERY ORDER SLIP</h1><strong>{order.reference}</strong></div>
        <dl className="receipt-meta">
            <div><dt>Date</dt><dd>{dateLabel(order.placedAt)}</dd></div>
            <div><dt>Customer</dt><dd>{order.recipientName}</dd></div>
            <div><dt>Phone</dt><dd>{order.phone}</dd></div>
            <div><dt>Address</dt><dd>{order.address}</dd></div>
            <div><dt>Payment</dt><dd>Cash on Delivery</dd></div>
            <div><dt>Status</dt><dd>Awaiting seller review</dd></div>
        </dl>
        <table className="receipt-items"><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>{order.items.map((item, index) => <tr key={index}><td><strong>{item.name}</strong><span>{money(item.price)} / {item.unit}</span></td><td>{item.quantity}</td><td>{money(item.price * item.quantity)}</td></tr>)}</tbody></table>
        <dl className="receipt-totals"><div><dt>GOODS SUBTOTAL</dt><dd>{money(order.goodsTotal)}</dd></div></dl>
        <p>Delivery charge is not included. Confirm with the seller before fulfillment. This is not proof of payment.</p>
        <footer><strong>Thank you!</strong><span>Thank you for supporting your local barangay farm.</span><small>Keep this slip for your order reference.</small></footer>
    </section>, document.body);
}
