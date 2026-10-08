import { useEffect, useMemo, useState } from "react";
import { MapPinned, Sprout, Users } from "lucide-react";
import Icon from "../../Components/Storefront/Icon";
import Pagination from "../Seller/Pagination";
import HarvestForecastExport from "./HarvestForecastExport";
import "../../../css/seller-reports.css";

const DAY = 86400000;

function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function inputDate(value) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseInputDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function dateRange(from, to) {
    const today = startOfDay(new Date());
    const start = parseInputDate(from) || new Date(today.getFullYear(), today.getMonth(), 1);
    const selectedEnd = parseInputDate(to) || today;
    return {
        start,
        end: new Date(Math.max(start.getTime() + DAY, selectedEnd.getTime() + DAY)),
    };
}

function safeCell(value) {
    const text = String(value ?? "");
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value) {
    return `"${safeCell(value).replaceAll('"', '""')}"`;
}

function pdfText(value) {
    return String(value ?? "").replaceAll("₱", "PHP ").replace(/[–—]/g, "-").replace(/[']/g, "'");
}

function downloadBlob(contents, type, filename) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function formatMoney(value) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function formatQty(qty, unit) {
    const n = Number(qty) || 0;
    const rounded = Number.isInteger(n) ? n : parseFloat(n.toFixed(2));
    return unit ? `${rounded} ${unit}` : String(rounded);
}

const reportChoices = {
    barangay: {
        title: "Barangay performance",
        filipinoTitle: "Pagganap ng barangay",
        description: "Harvest volume, completed orders, total sales, and best product per barangay.",
        filipinoDescription: "Dami ng ani, natapos na order, kabuuang benta, at pinakamahusay na produkto bawat barangay.",
    },
    harvest: {
        title: "Harvest & product yield",
        filipinoTitle: "Ani at produksyon ng produkto",
        description: "Barangay, product name, total yield, total sold, unsold, and average price.",
        filipinoDescription: "Barangay, pangalan ng produkto, kabuuang ani, nabenta, hindi nabenta, at average na presyo.",
    },
    registration: {
        title: "Registration & account status",
        filipinoTitle: "Pagpaparehistro at katayuan ng account",
        description: "Pending applications, approved sellers, and account status changes.",
        filipinoDescription: "Mga pending na aplikasyon, aprubadong nagbebenta, at mga pagbabago sa account.",
    },
};

function ReportCardIcon({ type }) {
    if (type === "barangay") return <MapPinned aria-hidden="true" />;
    if (type === "harvest") return <Sprout aria-hidden="true" />;
    return <Users aria-hidden="true" />;
}

export default function AdminReports({
    harvestRecords = [],
    walkInOrders = [],
    sellers = [],
    pendingRegistrations = [],
    barangays = [],
    filipino = false,
}) {
    const today = useMemo(() => new Date(), []);
    const [reportType, setReportType] = useState(null);
    const [formats, setFormats] = useState({ barangay: "pdf", harvest: "pdf", registration: "pdf" });
    const [isExporting, setIsExporting] = useState(false);
    const [previewPage, setPreviewPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [from, setFrom] = useState(() => inputDate(new Date(today.getFullYear(), today.getMonth(), 1)));
    const [to, setTo] = useState(() => inputDate(today));

    const range = useMemo(() => dateRange(from, to), [from, to]);

    const filteredHarvest = useMemo(
        () => harvestRecords.filter((r) => { const d = new Date(r.harvest_date); return !Number.isNaN(d.getTime()) && d >= range.start && d < range.end; }),
        [harvestRecords, range],
    );
    const filteredOrders = useMemo(
        () => walkInOrders.filter((o) => { const d = new Date(o.created_at); return !Number.isNaN(d.getTime()) && d >= range.start && d < range.end && o.status === "delivered"; }),
        [walkInOrders, range],
    );
    const filteredSellers = useMemo(
        () => sellers.filter((s) => { const d = new Date(s.created_at); return !Number.isNaN(d.getTime()) && d >= range.start && d < range.end; }),
        [sellers, range],
    );
    const filteredPending = useMemo(
        () => pendingRegistrations.filter((p) => { const d = new Date(p.created_at); return !Number.isNaN(d.getTime()) && d >= range.start && d < range.end; }),
        [pendingRegistrations, range],
    );

    const barangayRows = useMemo(() => {
        const map = new Map();
        filteredHarvest.forEach((r) => {
            const b = r.barangay || "Unknown";
            const cur = map.get(b) || { barangay: b, harvestQty: 0, orders: 0, sales: 0, productSales: new Map() };
            cur.harvestQty += Number(r.quantity) || 0;
            map.set(b, cur);
        });
        filteredOrders.forEach((o) => {
            const b = o.barangay || "Unknown";
            const cur = map.get(b) || { barangay: b, harvestQty: 0, orders: 0, sales: 0, productSales: new Map() };
            cur.orders += 1;
            cur.sales += Number(o.total) || 0;
            const p = o.product_name || "Unknown";
            cur.productSales.set(p, (cur.productSales.get(p) || 0) + (Number(o.total) || 0));
            map.set(b, cur);
        });
        return [...map.values()].sort((a, b) => b.sales - a.sales || b.harvestQty - a.harvestQty).map((row) => {
            let bestProduct = "—"; let bestSales = 0;
            row.productSales.forEach((val, key) => { if (val > bestSales) { bestSales = val; bestProduct = key; } });
            return [row.barangay, formatQty(row.harvestQty, "kg"), row.orders, formatMoney(row.sales), bestProduct];
        });
    }, [filteredHarvest, filteredOrders]);

    const harvestRows = useMemo(() => {
        const soldMap = new Map(); const priceMap = new Map(); const pCnt = new Map();
        filteredOrders.forEach((o) => {
            const k = `${o.barangay || "Unknown"}||${o.product_name || "Unknown"}`;
            soldMap.set(k, (soldMap.get(k) || 0) + (Number(o.quantity) || 0));
            priceMap.set(k, (priceMap.get(k) || 0) + (Number(o.unit_price) || 0));
            pCnt.set(k, (pCnt.get(k) || 0) + 1);
        });
        const hMap = new Map();
        filteredHarvest.forEach((r) => {
            const k = `${r.barangay || "Unknown"}||${r.product_name || "Unknown"}`;
            const cur = hMap.get(k) || { barangay: r.barangay || "Unknown", product: r.product_name || "Unknown", unit: r.unit || "kg", totalYield: 0 };
            cur.totalYield += Number(r.quantity) || 0;
            hMap.set(k, cur);
        });
        return [...hMap.values()].sort((a, b) => a.barangay.localeCompare(b.barangay) || b.totalYield - a.totalYield).map((row) => {
            const k = `${row.barangay}||${row.product}`;
            const sold = soldMap.get(k) || 0;
            const unsold = Math.max(0, row.totalYield - sold);
            const cnt = pCnt.get(k) || 0;
            const avg = cnt > 0 ? (priceMap.get(k) || 0) / cnt : 0;
            return [row.barangay, row.product, formatQty(row.totalYield, row.unit), formatQty(sold, row.unit), formatQty(unsold, row.unit), avg > 0 ? formatMoney(avg) : "—"];
        });
    }, [filteredHarvest, filteredOrders]);

    const registrationRows = useMemo(() => {
        const rows = [];
        filteredSellers.forEach((s) => rows.push([s.name || "—", s.barangay || "—", "Seller", s.account_status ? s.account_status.charAt(0).toUpperCase() + s.account_status.slice(1) : "Active", new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(s.created_at))]));
        filteredPending.forEach((p) => rows.push([p.name || "—", "—", "Pending applicant", "Pending", new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(p.created_at))]));
        return rows.sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredSellers, filteredPending]);

    const report = useMemo(() => {
        if (reportType === "harvest") return {
            title: filipino ? "Ani at produksyon ng produkto" : "Harvest & product yield",
            headers: filipino ? ["Barangay", "Produkto", "Kabuuang ani", "Nabenta", "Hindi nabenta", "Avg. presyo"] : ["Barangay", "Product", "Total yield", "Total sold", "Unsold", "Avg. price"],
            rows: harvestRows,
        };
        if (reportType === "registration") return {
            title: filipino ? "Pagpaparehistro at katayuan ng account" : "Registration & account status",
            headers: filipino ? ["Pangalan", "Barangay", "Uri", "Katayuan", "Petsa"] : ["Name", "Barangay", "Type", "Status", "Date"],
            rows: registrationRows,
        };
        return {
            title: filipino ? "Pagganap ng barangay" : "Barangay performance",
            headers: filipino ? ["Barangay", "Kabuuang ani", "Natapos na order", "Kabuuang benta", "Pinakamahusay na produkto"] : ["Barangay", "Total harvest", "Orders completed", "Total sales", "Best product"],
            rows: barangayRows,
        };
    }, [reportType, barangayRows, harvestRows, registrationRows, filipino]);

    const summaries = useMemo(() => {
        if (reportType === "harvest") return [
            { label: filipino ? "Barangay" : "Barangays covered", value: new Set(filteredHarvest.map((r) => r.barangay)).size },
            { label: filipino ? "Mga produkto" : "Products tracked", value: new Set(filteredHarvest.map((r) => r.product_name)).size },
            { label: filipino ? "Kabuuang ani" : "Total yield", value: formatQty(filteredHarvest.reduce((s, r) => s + (Number(r.quantity) || 0), 0), "kg") },
        ];
        if (reportType === "registration") return [
            { label: filipino ? "Mga nagparehistro" : "New registrations", value: filteredSellers.length + filteredPending.length },
            { label: filipino ? "Mga aprubado" : "Approved sellers", value: filteredSellers.filter((s) => s.account_status === "active").length },
            { label: filipino ? "Mga pending" : "Pending applicants", value: filteredPending.length },
        ];
        return [
            { label: filipino ? "Mga barangay" : "Active barangays", value: barangayRows.length },
            { label: filipino ? "Natapos na order" : "Completed orders", value: filteredOrders.length },
            { label: filipino ? "Kabuuang benta" : "Total sales", value: formatMoney(filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)) },
        ];
    }, [reportType, filteredHarvest, filteredOrders, filteredSellers, filteredPending, barangayRows, filipino]);

    const periodLabel = `${new Intl.DateTimeFormat(filipino ? "fil-PH" : "en-PH", { dateStyle: "medium" }).format(range.start)} \u2013 ${new Intl.DateTimeFormat(filipino ? "fil-PH" : "en-PH", { dateStyle: "medium" }).format(new Date(range.end.getTime() - DAY))}`;
    const generatedLabel = new Intl.DateTimeFormat(filipino ? "fil-PH" : "en-PH", { dateStyle: "medium" }).format(today);
    const format = reportType ? formats[reportType] : "pdf";
    const reportPageCount = Math.max(1, Math.ceil(report.rows.length / rowsPerPage));
    const visibleReportRows = report.rows.slice((previewPage - 1) * rowsPerPage, previewPage * rowsPerPage);
    const reportNote = filipino
        ? "Opisyal na ulat ng AgriFarm para sa Pasig CENRO. Batay sa datos na nasa sistema noong ginawa ang ulat."
        : "Official AgriFarm report for Pasig CENRO. Based on data available in the system at the time of generation.";

    useEffect(() => { if (previewPage > reportPageCount) setPreviewPage(reportPageCount); }, [previewPage, reportPageCount]);

    const chooseFormat = (key, value) => setFormats((cur) => ({ ...cur, [key]: value }));
    const showReport = (key) => { setReportType(key); setPreviewPage(1); };

    const exportReport = async () => {
        const slug = report.title.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const fileStem = `agrifarm-cenro-${slug}-${from}-to-${to}`;
        const note = reportNote;
        setIsExporting(true);
        try {
            if (format === "csv") {
                const csvRows = [
                    ["AgriFarm CENRO \u2014 " + report.title],
                    ["Organisation", "AgriFarm \u2014 Pasig CENRO"],
                    ["Reporting period", periodLabel],
                    ["Generated on", generatedLabel],
                    [],
                    report.headers,
                    ...report.rows,
                ];
                const csvText = csvRows
                    .map((r) => r.map((v) => { const s = String(v ?? ""); return "\"" + s.replaceAll("\"", "\"\"") + "\""; }).join(","))
                    .join("\r\n");
                downloadBlob("\ufeff" + csvText, "text/csv;charset=utf-8", fileStem + ".csv");
                return;
            }
            if (format === "excel") {
                const excelModule = await import("exceljs");
                const ExcelJS = excelModule.default || excelModule;
                const wb = new ExcelJS.Workbook();
                const ws = wb.addWorksheet(report.title.replace(/[\\/*?:\[\]]/g, "").slice(0, 31) || "Report");
                const cc = report.headers.length;
                ws.mergeCells(1,1,1,cc); ws.getCell("A1").value = `AgriFarm \u2014 ${report.title}`;
                ws.getCell("A1").font = { name:"Aptos Display", size:18, bold:true, color:{argb:"FFFFFFFF"} };
                ws.getCell("A1").fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF176A43"} };
                ws.getRow(1).height = 31;
                ws.addTable({ name:"AdminReport", ref:"A3", headerRow:true, totalsRow:false, style:{theme:"TableStyleMedium4", showRowStripes:true}, columns: report.headers.map((h) => ({ name: String(h ?? ""), filterButton: true })), rows: report.rows.map((row) => row.map((v) => String(v ?? ""))) });
                const buf = await wb.xlsx.writeBuffer();
                downloadBlob(buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `${fileStem}.xlsx`);
                return;
            }
            const { jsPDF } = await import("jspdf");
            const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight(); const m = 15;
            const uw = pw - m * 2; const cw = Math.floor(uw / report.headers.length); const cols = report.headers.map(() => cw);
            const drawHeader = (cont = false) => {
                pdf.setFillColor(23,106,67); pdf.rect(0,0,pw,8,"F");
                pdf.setFont("helvetica","bold"); pdf.setFontSize(20); pdf.setTextColor(22,93,59); pdf.text("AgriFarm",m,21);
                pdf.setFontSize(14); pdf.setTextColor(35,56,43); pdf.text(pdfText(report.title),pw-m,19,{align:"right"});
                pdf.setFont("helvetica","normal"); pdf.setFontSize(8); pdf.setTextColor(101,117,107);
                pdf.text(cont?"Pasig CENRO \u2014 continued":"Pasig CENRO",m,27);
                pdf.setDrawColor(28,107,69); pdf.setLineWidth(0.7); pdf.line(m,31,pw-m,31);
            };
            const drawTH = (y) => {
                let x=m; pdf.setFillColor(30,104,69); pdf.rect(m,y,cols.reduce((s,w)=>s+w,0),9,"F");
                pdf.setFont("helvetica","bold"); pdf.setFontSize(7); pdf.setTextColor(255,255,255);
                report.headers.forEach((h,i) => { pdf.text(pdfText(h).toUpperCase(),x+2.5,y+5.7,{maxWidth:cols[i]-5}); x+=cols[i]; });
                return y+9;
            };
            drawHeader();
            pdf.setFont("helvetica","normal"); pdf.setFontSize(8); pdf.setTextColor(105,120,111);
            pdf.text("REPORTING PERIOD",m,39); pdf.text("GENERATED ON",106,39);
            pdf.setFont("helvetica","bold"); pdf.setTextColor(35,56,43);
            pdf.text(pdfText(periodLabel),m,44); pdf.text(pdfText(generatedLabel),106,44);
            const sw=(uw-5*(summaries.length-1))/summaries.length;
            summaries.forEach((s,i) => {
                const x=m+i*(sw+5); pdf.setFillColor(244,248,241); pdf.setDrawColor(220,229,218); pdf.roundedRect(x,50,sw,17,2,2,"FD");
                pdf.setFont("helvetica","normal"); pdf.setFontSize(7); pdf.setTextColor(101,117,107); pdf.text(pdfText(s.label).toUpperCase(),x+4,56);
                pdf.setFont("helvetica","bold"); pdf.setFontSize(12); pdf.setTextColor(23,106,67); pdf.text(pdfText(String(s.value)),x+4,63);
            });
            let y=drawTH(74); pdf.setFontSize(7.5);
            (report.rows.length?report.rows:[["No data available."]]).forEach((row,ri) => {
                const cells=row.map((v,i)=>pdf.splitTextToSize(pdfText(v),(cols[i]||uw)-5));
                const rh=Math.max(8,Math.max(...cells.map((l)=>l.length))*3.6+3);
                if(y+rh>ph-16){pdf.addPage();drawHeader(true);y=drawTH(37);}
                if(ri%2===1){pdf.setFillColor(248,250,247);pdf.rect(m,y,cols.reduce((s,w)=>s+w,0),rh,"F");}
                pdf.setDrawColor(228,233,226); pdf.line(m,y+rh,m+cols.reduce((s,w)=>s+w,0),y+rh);
                let x=m;
                cells.forEach((lines,i)=>{ pdf.setFont("helvetica","normal");pdf.setFontSize(7.5);pdf.setTextColor(52,73,59);pdf.text(lines,x+2.5,y+5,{lineHeightFactor:1.15});x+=cols[i]||uw; });
                y+=rh;
            });
            const pages=pdf.getNumberOfPages();
            for(let p=1;p<=pages;p++){pdf.setPage(p);pdf.setDrawColor(225,231,223);pdf.line(m,ph-11,pw-m,ph-11);pdf.setFont("helvetica","normal");pdf.setFontSize(7);pdf.setTextColor(108,124,114);pdf.text(pdfText(note),m,ph-6,{maxWidth:uw-25});pdf.text(`${p} / ${pages}`,pw-m,ph-6,{align:"right"});}
            downloadBlob(pdf.output("blob"),"application/pdf",`${fileStem}.pdf`);
        } finally { setIsExporting(false); }
    };

    const formatOptions = [["pdf","PDF"],["excel","Excel"],["csv","CSV"]];

    return (
        <div className="seller-reports">
            <section className="report-generator seller-panel" aria-labelledby="admin-report-heading">
                <div className="report-generator-copy">
                    <span><Icon name="receipt" size={22} /></span>
                    <div>
                        <h1 id="admin-report-heading" className="seller-page-title">
                            {filipino ? "Gumawa ng mga ulat" : "Generate reports"}
                        </h1>
                        <p>{filipino ? "Pumili ng petsa, gumawa ng preview, at i-download ang file." : "Pick a date range, generate a preview, then download the file."}</p>
                    </div>
                </div>
                <div className="report-range" aria-label={filipino ? "Saklaw ng petsa ng ulat" : "Report date range"}>
                    <label>
                        {filipino ? "Mula" : "From"}
                        <input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPreviewPage(1); }} />
                    </label>
                    <span aria-hidden="true">to</span>
                    <label>
                        {filipino ? "Hanggang" : "To"}
                        <input type="date" value={to} min={from} max={inputDate(today)} onChange={(e) => { setTo(e.target.value); setPreviewPage(1); }} />
                    </label>
                </div>
            </section>

            <HarvestForecastExport barangays={barangays} from={from} to={to} filipino={filipino} />

            <section className="report-card-grid" aria-label={filipino ? "Mga uri ng ulat" : "Report types"}>
                {Object.entries(reportChoices).map(([key, choice]) => (
                    <article key={key} className={`report-option-card report-option-card--${key}${reportType === key ? " is-generated" : ""}`}>
                        <header>
                            <span><ReportCardIcon type={key} /></span>
                            <div>
                                <h2>{filipino ? choice.filipinoTitle : choice.title}</h2>
                                <p>{filipino ? choice.filipinoDescription : choice.description}</p>
                            </div>
                        </header>
                        <div className="report-card-formats" role="radiogroup" aria-label={`${filipino ? choice.filipinoTitle : choice.title} format`}>
                            {formatOptions.map(([value, label]) => (
                                <label key={value}>
                                    <input type="radio" name={`format-${key}`} value={value} checked={formats[key] === value} onChange={() => chooseFormat(key, value)} />
                                    <span>{label}</span>
                                </label>
                            ))}
                        </div>
                        <button className="report-generate-button" type="button" onClick={() => showReport(key)}>
                            {reportType === key && <Icon name="check" size={16} />}
                            {reportType === key ? (filipino ? "Gawin muli ang preview" : "Regenerate preview") : (filipino ? "Gumawa ng preview" : "Generate preview")}
                        </button>
                    </article>
                ))}
            </section>

            {reportType && (
                <section className="report-preview-section" aria-labelledby="admin-report-preview-heading">
                    <div className="report-preview-toolbar">
                        <div>
                            <span>{filipino ? "Preview ng ulat" : "Live preview"}</span>
                            <h2 id="admin-report-preview-heading">{report.title}</h2>
                        </div>
                        <button type="button" disabled={isExporting} onClick={exportReport}>
                            <Icon name="download" size={17} />
                            {isExporting ? (filipino ? "Ginagawa ang file\u2026" : "Preparing file\u2026") : `${filipino ? "I-download ang" : "Download"} ${format === "excel" ? "Excel" : format.toUpperCase()}`}
                        </button>
                    </div>
                    <article className="report-paper">
                        <header>
                            <div><strong>AgriFarm</strong><span>Pasig CENRO</span></div>
                            <div><small>{filipino ? "Opisyal na ulat" : "Official report"}</small><strong>{report.title}</strong></div>
                        </header>
                        <div className="report-paper-meta">
                            <div><small>{filipino ? "Panahon" : "Reporting period"}</small><strong>{periodLabel}</strong></div>
                            <div><small>{filipino ? "Ginawa noong" : "Generated on"}</small><strong>{generatedLabel}</strong></div>
                        </div>
                        <div className="report-summary">
                            {summaries.map((s) => (<div key={s.label}><small>{s.label}</small><strong>{s.value}</strong></div>))}
                        </div>
                        <div className="report-table-wrap">
                            <table>
                                <thead><tr>{report.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                                <tbody>
                                    {visibleReportRows.map((row, ri) => (
                                        <tr key={`${row[0]}-${(previewPage-1)*rowsPerPage+ri}`}>
                                            {row.map((cell, i) => <td key={i}>{cell}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {!report.rows.length && <p className="report-empty-message">{filipino ? "Walang datos para sa napiling panahon." : "No data found for the selected period."}</p>}
                        <Pagination page={previewPage} pageSize={rowsPerPage} totalItems={report.rows.length} onPageChange={setPreviewPage} onPageSizeChange={setRowsPerPage} filipino={filipino} label={filipino ? 'Mga pahina ng report' : 'Report preview pagination'} itemLabel={filipino ? 'tala' : 'records'} className="report-pagination" />
                        <footer>{reportNote}</footer>
                    </article>
                </section>
            )}
        </div>
    );
}
