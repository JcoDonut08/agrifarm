import { useEffect, useMemo, useState } from 'react';
import Icon from '../../Components/Storefront/Icon';
import { formatMoney } from './DashboardCards';
import { unitLabel } from './SellerLocale';
import Pagination from './Pagination';
import '../../../css/seller-reports.css';

const DAY = 86400000;
const REPORT_ROWS_PER_PAGE = 8;

function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
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

function dateRange(from, to) {
    const today = startOfDay(new Date());
    const start = parseInputDate(from) || new Date(today.getFullYear(), today.getMonth(), 1);
    const selectedEnd = parseInputDate(to) || today;
    return { start, end: new Date(Math.max(start.getTime() + DAY, selectedEnd.getTime() + DAY)) };
}

function customerKey(order) {
    const id = order.customer_id || order.customer?.id;
    const name = String(order.customer_name || '').trim() || 'Walk-in customer';
    return id ? `customer-${id}` : `walk-in-${name.toLocaleLowerCase()}`;
}

function safeCell(value) {
    const text = String(value ?? '');
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value) {
    return `"${safeCell(value).replaceAll('"', '""')}"`;
}

function downloadBlob(contents, type, filename) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function createExcelReport({ report, metadata, filename, note }) {
    const excelModule = await import('exceljs');
    const ExcelJS = excelModule.default || excelModule;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AgriFarm';
    workbook.created = new Date();
    workbook.subject = report.title;

    const sheetName = report.title.replace(/[\\/*?:\[\]]/g, '').slice(0, 31) || 'Report';
    const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 6 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    const columnCount = report.headers.length;

    worksheet.mergeCells(1, 1, 1, columnCount);
    worksheet.getCell('A1').value = `AgriFarm — ${report.title}`;
    worksheet.getCell('A1').font = { name: 'Aptos Display', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176A43' } };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(1).height = 31;

    worksheet.mergeCells(2, 1, 2, columnCount);
    worksheet.getCell('A2').value = `${metadata.storeTitle}: ${metadata.storeName}`;
    worksheet.getCell('A2').font = { name: 'Aptos', size: 11, bold: true, color: { argb: 'FF284C37' } };
    worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF3E8' } };
    worksheet.getRow(2).height = 22;

    worksheet.getCell('A3').value = metadata.periodTitle;
    worksheet.getCell('B3').value = metadata.periodLabel;
    worksheet.getCell('A4').value = metadata.generatedTitle;
    worksheet.getCell('B4').value = metadata.generatedLabel;
    ['A3', 'A4'].forEach(address => {
        worksheet.getCell(address).font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FF176A43' } };
    });
    ['B3', 'B4'].forEach(address => {
        worksheet.getCell(address).font = { name: 'Aptos', size: 10, color: { argb: 'FF304B3A' } };
    });

    worksheet.addTable({
        name: 'AgriFarmReportTable',
        ref: 'A6',
        headerRow: true,
        totalsRow: false,
        style: { theme: 'TableStyleMedium4', showRowStripes: true, showFirstColumn: false, showLastColumn: false },
        columns: report.headers.map(header => ({ name: safeCell(header), filterButton: true })),
        rows: report.rows.map(row => row.map(safeCell)),
    });

    worksheet.getRow(6).height = 24;
    worksheet.getRow(6).alignment = { vertical: 'middle' };
    report.headers.forEach((header, columnIndex) => {
        const values = report.rows.map(row => safeCell(row[columnIndex]));
        const widest = Math.max(String(header).length, ...values.map(value => value.length));
        worksheet.getColumn(columnIndex + 1).width = Math.min(34, Math.max(13, widest + 3));
    });
    for (let rowIndex = 7; rowIndex <= 6 + report.rows.length; rowIndex += 1) {
        worksheet.getRow(rowIndex).height = 21;
        worksheet.getRow(rowIndex).alignment = { vertical: 'middle' };
    }

    const noteRow = 8 + Math.max(report.rows.length, 1);
    worksheet.mergeCells(noteRow, 1, noteRow, columnCount);
    worksheet.getCell(noteRow, 1).value = note;
    worksheet.getCell(noteRow, 1).font = { name: 'Aptos', size: 9, italic: true, color: { argb: 'FF68796F' } };
    worksheet.getCell(noteRow, 1).alignment = { wrapText: true, vertical: 'top' };
    worksheet.getRow(noteRow).height = 28;
    worksheet.headerFooter.oddFooter = '&LAgriFarm seller report&C&F&RPage &P of &N';

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename);
}

function pdfText(value) {
    return String(value ?? '').replaceAll('₱', 'PHP ').replace(/[–—]/g, '-').replace(/[’]/g, "'");
}

async function createPdfReport({ report, storeName, periodLabel, generatedLabel, summaries, note, filename }) {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const usableWidth = pageWidth - (margin * 2);
    const columnWidths = report.headers.length === 6
        ? [28, 28, 42, 68, 40, 50]
        : report.headers.length === 5 ? [62, 50, 42, 58, 54] : [85, 58, 58, 65];

    const drawBrandHeader = (continuation = false) => {
        pdf.setFillColor(23, 106, 67);
        pdf.rect(0, 0, pageWidth, 8, 'F');
        pdf.setTextColor(22, 93, 59);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.text('AgriFarm', margin, 21);
        pdf.setTextColor(35, 56, 43);
        pdf.setFontSize(14);
        pdf.text(pdfText(report.title), pageWidth - margin, 19, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(101, 117, 107);
        pdf.text(continuation ? `${pdfText(storeName)} - continued` : pdfText(storeName), margin, 27);
        pdf.text('AGRIFARM SELLER REPORT', pageWidth - margin, 25, { align: 'right' });
        pdf.setDrawColor(28, 107, 69);
        pdf.setLineWidth(.7);
        pdf.line(margin, 31, pageWidth - margin, 31);
    };

    const drawTableHeader = (y) => {
        let x = margin;
        pdf.setFillColor(30, 104, 69);
        pdf.rect(margin, y, columnWidths.reduce((sum, width) => sum + width, 0), 9, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        report.headers.forEach((header, index) => {
            pdf.text(pdfText(header).toUpperCase(), x + 2.5, y + 5.7, { maxWidth: columnWidths[index] - 5 });
            x += columnWidths[index];
        });
        return y + 9;
    };

    drawBrandHeader();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(105, 120, 111);
    pdf.text('REPORTING PERIOD', margin, 39);
    pdf.text('GENERATED ON', 106, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(35, 56, 43);
    pdf.text(pdfText(periodLabel), margin, 44);
    pdf.text(pdfText(generatedLabel), 106, 44);

    const summaryGap = 5;
    const summaryWidth = (usableWidth - (summaryGap * 2)) / 3;
    summaries.forEach((summary, index) => {
        const x = margin + (index * (summaryWidth + summaryGap));
        pdf.setFillColor(244, 248, 241);
        pdf.setDrawColor(220, 229, 218);
        pdf.roundedRect(x, 50, summaryWidth, 17, 2, 2, 'FD');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(101, 117, 107);
        pdf.text(pdfText(summary.label).toUpperCase(), x + 4, 56);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(23, 106, 67);
        pdf.text(pdfText(summary.value), x + 4, 63);
    });

    let y = drawTableHeader(74);
    pdf.setFontSize(7.5);
    const tableRows = report.rows.length ? report.rows : [['No report data available.']];
    tableRows.forEach((row, rowIndex) => {
        const cells = row.map((value, index) => pdf.splitTextToSize(pdfText(value), (columnWidths[index] || usableWidth) - 5));
        const rowHeight = Math.max(8, Math.max(...cells.map(lines => lines.length)) * 3.6 + 3);
        if (y + rowHeight > pageHeight - 16) {
            pdf.addPage();
            drawBrandHeader(true);
            y = drawTableHeader(37);
        }
        if (rowIndex % 2 === 1) {
            pdf.setFillColor(248, 250, 247);
            pdf.rect(margin, y, columnWidths.reduce((sum, width) => sum + width, 0), rowHeight, 'F');
        }
        pdf.setDrawColor(228, 233, 226);
        pdf.line(margin, y + rowHeight, margin + columnWidths.reduce((sum, width) => sum + width, 0), y + rowHeight);
        let x = margin;
        cells.forEach((lines, index) => {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7.5);
            pdf.setTextColor(52, 73, 59);
            pdf.text(lines, x + 2.5, y + 5, { lineHeightFactor: 1.15 });
            x += columnWidths[index] || usableWidth;
        });
        y += rowHeight;
    });

    const pages = pdf.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
        pdf.setPage(page);
        pdf.setDrawColor(225, 231, 223);
        pdf.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(108, 124, 114);
        pdf.text(pdfText(note), margin, pageHeight - 6, { maxWidth: usableWidth - 25 });
        pdf.text(`${page} / ${pages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    }

    downloadBlob(pdf.output('blob'), 'application/pdf', filename);
}

const reportChoices = {
    sales: { icon: 'trend', title: 'Sales summary', filipinoTitle: 'Buod ng benta', description: 'Delivered orders, customers, quantities, and sales value.', filipinoDescription: 'Mga naihatid na order, customer, dami, at halaga ng benta.' },
    products: { icon: 'trophy', title: 'Product performance', filipinoTitle: 'Pagganap ng produkto', description: 'Compare units sold, order count, value, and current stock.', filipinoDescription: 'Ihambing ang nabenta, mga order, halaga, at kasalukuyang stock.' },
    customers: { icon: 'people', title: 'Customer insights', filipinoTitle: 'Pagsusuri ng customer', description: 'See unique buyers, repeat customers, and customer value.', filipinoDescription: 'Tingnan ang natatanging mamimili, umuulit na customer, at halaga.' },
};

export default function Reports({ orders = [], products = [], storeName = 'Seller', SellerIcon, filipino = false }) {
    const today = useMemo(() => new Date(), []);
    const [reportType, setReportType] = useState(null);
    const [formats, setFormats] = useState({ sales: 'pdf', products: 'pdf', customers: 'pdf' });
    const [isExporting, setIsExporting] = useState(false);
    const [previewPage, setPreviewPage] = useState(1);
    const [from, setFrom] = useState(() => inputDate(new Date(today.getFullYear(), today.getMonth(), 1)));
    const [to, setTo] = useState(() => inputDate(today));

    const range = useMemo(() => dateRange(from, to), [from, to]);
    const filteredOrders = useMemo(() => orders.filter(order => {
        const date = new Date(order.created_at);
        return !Number.isNaN(date.getTime()) && date >= range.start && date < range.end;
    }), [orders, range]);
    const deliveredOrders = filteredOrders.filter(order => order.status === 'delivered');
    const totalSales = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const uniqueCustomers = new Set(filteredOrders.map(customerKey)).size;
    const deliveredCustomers = new Set(deliveredOrders.map(customerKey)).size;

    const productRows = useMemo(() => {
        const byId = new Map(products.map(product => [Number(product.id), product]));
        const rows = new Map();
        deliveredOrders.forEach(order => {
            const product = byId.get(Number(order.product_id));
            const key = product ? `product-${product.id}` : `archived-${order.product_name}-${order.unit}`;
            const current = rows.get(key) || { name: order.product_name, unit: order.unit, quantity: 0, orders: 0, value: 0, stock: product?.stock };
            current.quantity += Number(order.quantity || 0);
            current.orders += 1;
            current.value += Number(order.total || 0);
            rows.set(key, current);
        });
        return [...rows.values()].sort((a, b) => b.value - a.value);
    }, [deliveredOrders, products]);

    const customerRows = useMemo(() => {
        const rows = new Map();
        deliveredOrders.forEach(order => {
            const key = customerKey(order);
            const current = rows.get(key) || { name: String(order.customer_name || '').trim() || (filipino ? 'Walk-in na customer' : 'Walk-in customer'), orders: 0, items: 0, value: 0 };
            current.orders += 1;
            current.items += Number(order.quantity || 0);
            current.value += Number(order.total || 0);
            rows.set(key, current);
        });
        return [...rows.values()].sort((a, b) => b.value - a.value || b.orders - a.orders);
    }, [deliveredOrders, filipino]);

    const report = useMemo(() => {
        if (reportType === 'products') return {
            title: filipino ? 'Pagganap ng produkto' : 'Product performance',
            headers: filipino ? ['Produkto', 'Nabenta', 'Mga order', 'Halaga', 'Stock ngayon'] : ['Product', 'Units sold', 'Orders', 'Sales value', 'Current stock'],
            rows: productRows.map(product => [product.name, `${product.quantity} ${unitLabel(product.unit, filipino)}`, product.orders, formatMoney(product.value), product.stock === undefined ? '—' : `${product.stock} ${unitLabel(product.unit, filipino)}`]),
        };
        if (reportType === 'customers') return {
            title: filipino ? 'Pagsusuri ng customer' : 'Customer insights',
            headers: filipino ? ['Customer', 'Mga naihatid na order', 'Mga item', 'Halaga'] : ['Customer', 'Delivered orders', 'Items purchased', 'Sales value'],
            rows: customerRows.map(customer => [customer.name, customer.orders, customer.items, formatMoney(customer.value)]),
        };
        return {
            title: filipino ? 'Buod ng benta' : 'Sales summary',
            headers: filipino ? ['Petsa', 'Order', 'Customer', 'Produkto', 'Dami', 'Halaga'] : ['Date', 'Order', 'Customer', 'Product', 'Quantity', 'Sales value'],
            rows: deliveredOrders.map(order => [new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { dateStyle: 'medium' }).format(new Date(order.created_at)), order.order_number || `#${order.id}`, order.customer_name || (filipino ? 'Walk-in na customer' : 'Walk-in customer'), order.product_name, `${order.quantity} ${unitLabel(order.unit, filipino)}`, formatMoney(Number(order.total || 0))]),
        };
    }, [reportType, deliveredOrders, productRows, customerRows, filipino]);

    const periodLabel = `${new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { dateStyle: 'medium' }).format(range.start)} – ${new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { dateStyle: 'medium' }).format(new Date(range.end.getTime() - DAY))}`;
    const generatedLabel = new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { dateStyle: 'medium' }).format(today);
    const format = reportType ? formats[reportType] : 'pdf';
    const reportPageCount = Math.max(1, Math.ceil(report.rows.length / REPORT_ROWS_PER_PAGE));
    const visibleReportRows = report.rows.slice((previewPage - 1) * REPORT_ROWS_PER_PAGE, previewPage * REPORT_ROWS_PER_PAGE);

    useEffect(() => {
        if (previewPage > reportPageCount) setPreviewPage(reportPageCount);
    }, [previewPage, reportPageCount]);

    const exportReport = async () => {
        const slug = report.title.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const fileStem = `agrifarm-${slug}-${from}-to-${to}`;
        const note = filipino
            ? 'Batay sa mga order na minarkahang naihatid. Ang halaga ay benta, hindi tubo o kumpirmadong bayad.'
            : 'Based on orders marked delivered. Values represent sales, not profit or confirmed payment.';
        const metadata = {
            storeName,
            storeTitle: filipino ? 'Tindahan' : 'Store',
            periodTitle: filipino ? 'Panahon ng ulat' : 'Reporting period',
            periodLabel,
            generatedTitle: filipino ? 'Ginawa noong' : 'Generated on',
            generatedLabel,
            emptyLabel: filipino ? 'Walang datos para sa napiling panahon.' : 'No report data was found for the selected period.',
        };
        setIsExporting(true);
        try {
            if (format === 'pdf') {
                await createPdfReport({
                    report, storeName, periodLabel, generatedLabel, note, filename: `${fileStem}.pdf`,
                    summaries: [
                        { label: filipino ? 'Nakumpletong benta' : 'Completed sales', value: formatMoney(totalSales) },
                        { label: filipino ? 'Naihatid na order' : 'Delivered orders', value: deliveredOrders.length },
                        { label: filipino ? 'Mga customer' : 'Customers', value: uniqueCustomers },
                    ],
                });
                return;
            }
            if (format === 'excel') {
                await createExcelReport({ report, metadata, note, filename: `${fileStem}.xlsx` });
                return;
            }
            const csvRows = [
                [`AgriFarm — ${report.title}`],
                [filipino ? 'Tindahan' : 'Store', storeName],
                [metadata.periodTitle, periodLabel],
                [metadata.generatedTitle, generatedLabel],
                [],
                report.headers,
                ...report.rows,
            ];
            const csv = csvRows.map(row => row.map(csvCell).join(',')).join('\r\n');
            downloadBlob(`\ufeff${csv}`, 'text/csv;charset=utf-8', `${fileStem}.csv`);
        } finally {
            setIsExporting(false);
        }
    };

    const formatOptions = [['pdf', 'PDF'], ['excel', 'Excel'], ['csv', 'CSV']];
    const chooseFormat = (key, value) => setFormats(current => ({ ...current, [key]: value }));
    const showReport = key => { setReportType(key); setPreviewPage(1); };

    return <div className="seller-reports">
        <section className="report-generator seller-panel" aria-labelledby="report-page-heading">
            <div className="report-generator-copy"><span><Icon name="receipt" size={22} /></span><div><h1 id="report-page-heading" className="seller-page-title">{filipino ? 'Gumawa ng mga ulat' : 'Generate reports'}</h1><p>{filipino ? 'Pumili ng petsa, gumawa ng preview, at i-download ang file.' : 'Pick a date range, generate a preview, then download the file.'}</p></div></div>
            <div className="report-range" aria-label={filipino ? 'Saklaw ng petsa ng ulat' : 'Report date range'}>
                <label>{filipino ? 'Mula' : 'From'}<input type="date" value={from} max={to} onChange={event => { setFrom(event.target.value); setPreviewPage(1); }} /></label>
                <span aria-hidden="true">to</span>
                <label>{filipino ? 'Hanggang' : 'To'}<input type="date" value={to} min={from} max={inputDate(today)} onChange={event => { setTo(event.target.value); setPreviewPage(1); }} /></label>
            </div>
        </section>

        <section className="report-card-grid" aria-label={filipino ? 'Mga uri ng ulat' : 'Report types'}>
            {Object.entries(reportChoices).map(([key, choice]) => <article className={`report-option-card report-option-card--${key}${reportType === key ? ' is-generated' : ''}`} key={key}>
                <header><span><SellerIcon name={choice.icon} /></span><div><h2>{filipino ? choice.filipinoTitle : choice.title}</h2><p>{filipino ? choice.filipinoDescription : choice.description}</p></div></header>
                <div className="report-card-formats" role="radiogroup" aria-label={`${filipino ? choice.filipinoTitle : choice.title} ${filipino ? 'na format' : 'format'}`}>
                    {formatOptions.map(([value, label]) => <label key={value}><input type="radio" name={`format-${key}`} value={value} checked={formats[key] === value} onChange={() => chooseFormat(key, value)} /><span>{label}</span></label>)}
                </div>
                <button className="report-generate-button" type="button" onClick={() => showReport(key)}>{reportType === key && <Icon name="check" size={16} />}{reportType === key ? (filipino ? 'Gawin muli ang preview' : 'Regenerate preview') : (filipino ? 'Gumawa ng preview' : 'Generate preview')}</button>
            </article>)}
        </section>

        {reportType && <section className="report-preview-section" aria-labelledby="report-preview-heading">
            <div className="report-preview-toolbar"><div><span>{filipino ? 'Live preview' : 'Live preview'}</span><h2 id="report-preview-heading">{report.title}</h2></div><button type="button" disabled={isExporting} onClick={exportReport}><Icon name="arrow" size={17} />{isExporting ? (filipino ? 'Ginagawa ang file…' : 'Preparing file…') : `${filipino ? 'I-download ang' : 'Download'} ${format === 'excel' ? 'Excel' : format.toUpperCase()}`}</button></div>
            <article className="report-paper">
                <header><div><strong>AgriFarm</strong><span>{storeName}</span></div><div><small>{filipino ? 'Inihandang ulat' : 'Prepared report'}</small><strong>{report.title}</strong></div></header>
                <div className="report-paper-meta"><div><small>{filipino ? 'Panahon' : 'Reporting period'}</small><strong>{periodLabel}</strong></div><div><small>{filipino ? 'Ginawa noong' : 'Generated on'}</small><strong>{generatedLabel}</strong></div></div>
                <div className="report-summary">
                    <div><small>{filipino ? 'Nakumpletong benta' : 'Completed sales'}</small><strong>{formatMoney(totalSales)}</strong></div>
                    <div><small>{filipino ? 'Naihatid na order' : 'Delivered orders'}</small><strong>{deliveredOrders.length}</strong></div>
                    <div><small>{filipino ? 'Mga customer' : 'Customers'}</small><strong>{uniqueCustomers}</strong><span>{deliveredCustomers} {filipino ? 'may naihatid na order' : 'with delivered orders'}</span></div>
                </div>
                <div className="report-table-wrap"><table><thead><tr>{report.headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{report.rows.length ? visibleReportRows.map((row, rowIndex) => <tr key={`${row[0]}-${((previewPage - 1) * REPORT_ROWS_PER_PAGE) + rowIndex}`}>{row.map((value, index) => <td key={`${index}-${value}`}>{value}</td>)}</tr>) : <tr><td className="report-no-data" colSpan={report.headers.length}>{filipino ? 'Walang naihatid na order para sa napiling panahon.' : 'No delivered orders were found for the selected period.'}</td></tr>}</tbody></table></div>
                <Pagination
                    page={previewPage}
                    pageSize={REPORT_ROWS_PER_PAGE}
                    totalItems={report.rows.length}
                    onPageChange={setPreviewPage}
                    label={`${report.title} ${filipino ? 'na paglipat ng pahina' : 'pagination'}`}
                    itemLabel={filipino ? 'hilera' : (report.rows.length === 1 ? 'row' : 'rows')}
                    filipino={filipino}
                    className="report-pagination"
                />
                <footer>{filipino ? 'Batay sa mga order na minarkahang naihatid. Ang halaga ay benta, hindi tubo o kumpirmadong bayad.' : 'Based on orders marked delivered. Values represent sales, not profit or confirmed payment.'}</footer>
            </article>
        </section>}
    </div>;
}
