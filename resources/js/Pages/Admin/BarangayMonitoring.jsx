import { useState } from "react";
import {
    AlertCircle,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Eye,
    FileText,
    MapPinned,
    Package,
    Sprout,
    TrendingUp,
} from "lucide-react";

const PAGE_SIZE = 6;
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 });
const count = new Intl.NumberFormat("en-PH");

export default function BarangayMonitoring({ monitoringData, filipino }) {
    const [barangay, setBarangay] = useState("all");
    const [compareBy, setCompareBy] = useState("harvest");
    const [tablePage, setTablePage] = useState(1);
    const [reportPage, setReportPage] = useState(1);
    const [report, setReport] = useState(null);

    if (!monitoringData) return <Message title="Loading Barangay Monitoring" text="Please wait while monitoring records load." />;

    const all = monitoringData.allBarangaysData || { overview: {}, statusTable: [], comparisonData: {}, reports: [] };
    const selected = barangay === "all";
    const data = selected ? all : monitoringData.specificBarangayData?.[barangay];
    if (!data) return <Message title="Barangay Monitoring unavailable" text="The monitoring data could not be displayed. Please refresh and try again." />;

    const updateBarangay = (value) => {
        setBarangay(value);
        setTablePage(1);
        setReportPage(1);
    };
    const statusRows = page(data.statusTable || [], tablePage);
    const reports = page(data.reports || [], reportPage);

    return (
        <div className="barangay-monitoring">
            <header className="barangay-monitoring__header">
                <div>
                    <p className="barangay-monitoring__eyebrow">CENRO workspace</p>
                    <h1 className="admin-page-title">{filipino ? "Pagbabantay sa Barangay" : "Barangay Monitoring"}</h1>
                    <p className="barangay-monitoring__intro">
                        {selected
                            ? "Combined record of actual activity across registered barangays."
                            : "Actual recorded activity for the selected barangay."}
                    </p>
                </div>
                <label className="barangay-monitoring__filter">
                    <span>Barangay</span>
                    <select value={barangay} onChange={(event) => updateBarangay(event.target.value)}>
                        <option value="all">{filipino ? "Lahat ng Barangay" : "All Barangays"}</option>
                        {(monitoringData.barangays || []).map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                </label>
            </header>

            {selected ? (
                <AllBarangays
                    data={data}
                    rows={statusRows}
                    currentPage={tablePage}
                    setPage={setTablePage}
                    compareBy={compareBy}
                    setCompareBy={setCompareBy}
                    onView={updateBarangay}
                    filipino={filipino}
                />
            ) : <BarangayDetails data={data} filipino={filipino} />}

            <Reports
                rows={reports}
                allCount={(data.reports || []).length}
                pageNumber={reportPage}
                setPage={setReportPage}
                selected={selected}
                onView={setReport}
                filipino={filipino}
            />
            {report && <ReportDialog report={report} onClose={() => setReport(null)} />}
        </div>
    );
}

function AllBarangays({ data, rows, currentPage, setPage, compareBy, setCompareBy, onView, filipino }) {
    const summary = data.overview || {};
    return (
        <>
            <Metrics items={[
                ["Total Barangays", integer(summary.totalBarangays), "Currently monitored", MapPinned],
                ["Total Products", integer(summary.totalProducts), "Listed products", Package],
                ["Total Sales", money(summary.totalSales), "Completed orders", TrendingUp],
            ]} />
            <section className="barangay-monitoring__grid">
                <article className="admin-panel">
                    <Title icon={MapPinned} title="Barangay Agricultural Status" description="Recorded products, harvest, and sales." />
                    {!rows.items.length ? <Empty icon={MapPinned} text="No registered barangays have recorded activity yet." /> : <>
                        <div className="barangay-monitoring__table-wrap">
                            <table className="barangay-monitoring__table">
                                <thead><tr><th>Barangay</th><th>Products</th><th>Harvest</th><th>Sales</th><th><span className="sr-only">Action</span></th></tr></thead>
                                <tbody>{rows.items.map((row) => <tr key={row.name}>
                                    <td data-label="Barangay">
                                        <span className="barangay-monitoring__barangay-cell">
                                            <span className="admin-seller-photo barangay-monitoring__seller-photo" aria-hidden="true">
                                                {row.seller?.photoUrl ? (
                                                    <img src={row.seller.photoUrl} alt="" />
                                                ) : (
                                                    row.seller?.name?.slice(0, 1).toUpperCase() || row.name.slice(0, 1)
                                                )}
                                            </span>
                                            <span>
                                                <strong>{row.name}</strong>
                                                {row.seller?.name && <small>{row.seller.name}</small>}
                                            </span>
                                        </span>
                                    </td>
                                    <td data-label="Products">{integer(row.products)}</td>
                                    <td data-label="Harvest">—</td>
                                    <td data-label="Sales">{money(row.sales)}</td>
                                    <td><button type="button" className="admin-action-btn admin-action-btn--view barangay-monitoring__view" onClick={() => onView(row.name)}><Eye />View</button></td>
                                </tr>)}</tbody>
                            </table>
                        </div>
                        <DataNote text="A recorded-harvest data source is not available in the database yet." />
                        <Pager pagination={rows} setPage={setPage} label="barangays" />
                    </>}
                </article>
                <article className="admin-panel">
                    <div className="barangay-monitoring__chart-header">
                        <Title icon={BarChart3} title="Barangay Production Comparison" description="Based on actual records in the system." />
                        <label className="barangay-monitoring__compare"><span>Compare by</span>
                            <select value={compareBy} onChange={(event) => setCompareBy(event.target.value)}>
                                <option value="harvest">Harvest</option><option value="sales">Sales</option><option value="demand">Demand</option>
                            </select>
                        </label>
                    </div>
                    <Comparison data={data.comparisonData} metric={compareBy} />
                </article>
            </section>
        </>
    );
}

function BarangayDetails({ data, filipino }) {
    const summary = data.overview || {};
    return (
        <>
            <Metrics items={[
                ["Total Products", integer(summary.totalProducts), "Listed products", Package],
                ["Total Harvest", "—", "No harvest records yet", Sprout],
                ["Total Sales", money(summary.totalSales), "Completed orders", TrendingUp],
                ["Active Reports", integer(summary.activeReports), "Requiring action", AlertCircle],
            ]} />
            <section className="barangay-monitoring__grid">
                <Trend title="Sales Performance" description="Monthly completed sales" chart={data.salesTrend} formatter={money} color="#2e7d56" />
                <Trend title="Harvest Trend" description="Monthly recorded harvest" chart={data.harvestTrend} formatter={integer} color="#b7791f" line />
            </section>
            <section className="admin-panel">
                <Title icon={Package} title="Product & Harvest Monitoring" description="Available and sold quantities come from actual inventory and order records." />
                <Products rows={data.products || []} />
            </section>
        </>
    );
}

function Metrics({ items }) {
    return <section className={"admin-metrics barangay-monitoring__metrics barangay-monitoring__metrics--" + items.length}>
        {items.map(([label, value, detail, Icon]) => <article key={label} className="admin-metric-card">
            <div className="admin-metric-heading"><h2>{label}</h2><span className="admin-metric-icon"><Icon /></span></div>
            <strong className="admin-metric-value">{value}</strong><p>{detail}</p>
        </article>)}
    </section>;
}

function Products({ rows }) {
    if (!rows.length) return <Empty icon={Package} text="No products have been listed for this barangay yet." />;
    return <div className="barangay-monitoring__table-wrap">
        <table className="barangay-monitoring__table">
            <thead><tr><th>Product</th><th>Harvested</th><th>Available</th><th>Sold</th><th>Status</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}>
                <td data-label="Product"><strong>{row.name}</strong></td><td data-label="Harvested">—</td>
                <td data-label="Available">{integer(row.available) + " " + row.unit}</td>
                <td data-label="Sold">{integer(row.sold) + " " + row.unit}</td>
                <td data-label="Status"><Badge value={row.status} /></td>
            </tr>)}</tbody>
        </table>
        <DataNote text="Harvested will appear once harvest records are available in the system." />
    </div>;
}

function Comparison({ data = {}, metric }) {
    const labels = data.labels || [];
    const values = data[metric] || [];
    const available = values.filter((value) => typeof value === "number");
    if (!available.length) return <Empty icon={Sprout} text="No recorded harvest data is available to compare yet." />;
    const max = Math.max(...available, 1);
    return <div className="barangay-monitoring__comparison">
        {labels.map((label, index) => {
            const value = values[index] || 0;
            return <div className="barangay-monitoring__bar-row" key={label}>
                <div><span>{label}</span><strong>{metric === "sales" ? money(value) : integer(value)}</strong></div>
                <span className="barangay-monitoring__bar-track"><i style={{ width: Math.round(value / max * 100) + "%" }} /></span>
            </div>;
        })}
        <DataNote text={metric === "demand" ? "Demand uses quantity from actual recorded orders." : "Comparison uses only actual records."} />
    </div>;
}

function Trend({ title, description, chart = {}, formatter, color, line }) {
    const values = chart.data || [];
    const labels = chart.labels || [];
    const available = chart.available && values.some((value) => Number(value) > 0);
    return <article className="admin-panel barangay-monitoring__trend">
        <Title icon={line ? Sprout : TrendingUp} title={title} description={description} />
        {!available ? <Empty icon={line ? Sprout : TrendingUp} text="No recorded data is available for this period yet." /> :
            <div className={"barangay-monitoring__trend-plot" + (line ? " barangay-monitoring__trend-plot--line" : "")}>
                {values.map((value, index) => <div key={labels[index]} className="barangay-monitoring__trend-point">
                    <span title={formatter(value)} style={{ "--chart-height": Math.max(Number(value) / Math.max(...values, 1) * 100, 3) + "%", "--chart-color": color }} />
                    <small>{labels[index]}</small>
                </div>)}
            </div>}
    </article>;
}

function Reports({ rows, allCount, pageNumber, setPage, selected, onView }) {
    return <section className="admin-panel barangay-monitoring__reports">
        <Title icon={FileText} title="Barangay Reports" description={selected ? "Reports from all barangays." : "Reports for the selected barangay."} />
        {!rows.items.length ? <Empty icon={FileText} text="No reports have been recorded yet. They will appear when CENRO reporting records are connected." /> :
            <><div className="barangay-monitoring__table-wrap"><table className="barangay-monitoring__table">
                <thead><tr><th>Date</th>{selected && <th>Barangay</th>}<th>Report Type</th><th>Reported By</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
                <tbody>{rows.items.map((entry) => <tr key={entry.id}>
                    <td data-label="Date">{date(entry.date)}</td>{selected && <td data-label="Barangay">{entry.barangay}</td>}
                    <td data-label="Report Type">{entry.type}</td><td data-label="Reported By">{entry.reportedBy}</td>
                    <td data-label="Status"><Badge value={entry.status} /></td>
                    <td><button type="button" className="admin-action-btn admin-action-btn--view barangay-monitoring__view" onClick={() => onView(entry)}><Eye />View</button></td>
                </tr>)}</tbody>
            </table></div><Pager pagination={{ ...rows, total: allCount, page: pageNumber }} setPage={setPage} label="reports" /></>}
    </section>;
}

function ReportDialog({ report, onClose }) {
    const fields = [
        ["Report ID", report.id], ["Barangay", report.barangay], ["Report Type", report.type],
        ["Date/Time", date(report.date)], ["Reported By", report.reportedBy], ["Product", report.product || "—"],
        ["Description", report.description || "—"], ["Supporting attachment", report.attachment || "None"],
        ["CENRO remarks", report.remarks || "—"], ["Status", report.status], ["Resolution / Action Taken", report.resolution || "—"],
    ];
    return <div className="barangay-monitoring__dialog-backdrop" onMouseDown={onClose}>
        <section className="barangay-monitoring__dialog" role="dialog" aria-modal="true" aria-labelledby="report-details-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><p className="barangay-monitoring__eyebrow">Complete details</p><h2 id="report-details-title">{report.type}</h2></div>
                <button type="button" aria-label="Close report details" onClick={onClose}>×</button></header>
            <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>
    </div>;
}

function Title({ icon: Icon, title, description }) {
    return <div className="admin-panel-heading"><div><h2><Icon />{title}</h2><p>{description}</p></div></div>;
}
function Badge({ value }) {
    return <span className={"barangay-monitoring__badge barangay-monitoring__badge--" + String(value || "").toLowerCase().replaceAll(" ", "-")}>{value}</span>;
}
function Empty({ icon: Icon, text }) {
    return <div className="barangay-monitoring__empty"><Icon /><p>{text}</p></div>;
}
function DataNote({ text }) {
    return <p className="barangay-monitoring__data-note"><CircleAlert />{text}</p>;
}
function Message({ title, text }) {
    return <div className="admin-panel barangay-monitoring__message"><CircleAlert /><div><h1 className="admin-page-title">{title}</h1><p>{text}</p></div></div>;
}
function Pager({ pagination, setPage, label }) {
    if (pagination.pages <= 1) return null;
    return <nav className="admin-table-pagination barangay-monitoring__pagination" aria-label={"Pagination for " + label}>
        <span className="admin-pagination-info">Showing <strong>{pagination.start + "–" + pagination.end}</strong> of <strong>{pagination.total}</strong> {label}</span>
        <div className="admin-pagination-controls"><button type="button" className="admin-pagination-btn" disabled={pagination.page === 1} onClick={() => setPage(pagination.page - 1)} aria-label="Previous page"><ChevronLeft />Previous</button>
            <button type="button" className="admin-pagination-btn" disabled={pagination.page === pagination.pages} onClick={() => setPage(pagination.page + 1)} aria-label="Next page">Next<ChevronRight /></button></div>
    </nav>;
}
function page(items, requested) {
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const current = Math.min(requested, pages);
    const offset = (current - 1) * PAGE_SIZE;
    return { items: items.slice(offset, offset + PAGE_SIZE), page: current, pages, total, start: total ? offset + 1 : 0, end: Math.min(offset + PAGE_SIZE, total) };
}
function money(value) { return peso.format(Number(value) || 0); }
function integer(value) { return count.format(Number(value) || 0); }
function date(value) { return value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"; }
