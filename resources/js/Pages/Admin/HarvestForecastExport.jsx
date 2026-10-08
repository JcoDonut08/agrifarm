import { useEffect, useRef, useState } from 'react';
import Icon from '../../Components/Storefront/Icon';
import Pagination from '../Seller/Pagination';

export default function HarvestForecastExport({ barangays, from, to, filipino }) {
    const text = (english, filipinoText) => filipino ? filipinoText : english;
    const [barangay, setBarangay] = useState('');
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [format, setFormat] = useState('xlsx');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const requestRef = useRef(null);
    const statusRef = useRef(null);
    const selection = `${barangay}|${from}|${to}|${filipino}`;

    useEffect(() => {
        requestRef.current?.abort();
        setPreview(null);
        setError('');
        setNotice('');
        setBusy(false);
        setPage(1);
        return () => requestRef.current?.abort();
    }, [selection]);

    useEffect(() => {
        if (preview || error) statusRef.current?.focus({ preventScroll: true });
    }, [preview, error]);

    function saveFile(contents, filename) {
        const url = URL.createObjectURL(contents);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function issueText(issue) {
        const messages = {
            empty: text('No harvest records in this selection. Choose another barangay or date range.', 'Walang tala ng ani sa napiling saklaw. Pumili ng ibang barangay o petsa.'),
            non_kg: text(`Add the measured weight in kg to these harvest records: ${Object.entries(issue.units || {}).map(([unit, count]) => `${count} ${unit}`).join(', ')}. Farmers can add it using Edit in Harvest Records.`, `Idagdag ang aktuwal na timbang sa kg sa mga tala ng ani: ${Object.entries(issue.units || {}).map(([unit, count]) => `${count} ${unit}`).join(', ')}. Gamitin ng magsasaka ang I-edit sa Mga Talaan ng Ani.`),
            crop_names: text(`Correct inconsistent or invalid crop names before exporting.${issue.variants?.length ? ` Names: ${issue.variants.map(names => names.join(' / ')).join('; ')}.` : ''}`, `Itama ang magkakaiba o di-wastong pangalan ng pananim bago i-export.${issue.variants?.length ? ` Mga pangalan: ${issue.variants.map(names => names.join(' / ')).join('; ')}.` : ''}`),
            quantity_limit: text('Each monthly crop total must be from 0 to 1,000,000 kg. Check the records or choose a smaller range.', 'Dapat mula 0 hanggang 1,000,000 kg ang bawat buwanang kabuuan ng pananim. Suriin ang tala o paliitin ang saklaw.'),
            crop_limit: text('Choose a range with at most 50 crops.', 'Pumili ng saklaw na may hanggang 50 pananim.'),
            row_limit: text('Choose a smaller range: the file exceeds 20,000 monthly crop rows.', 'Paliitin ang saklaw: lampas sa 20,000 buwanang tala ng pananim.'),
            file_limit: text('Choose a smaller range: the file exceeds 5 MB.', 'Paliitin ang saklaw: lampas sa 5 MB ang file.'),
            date_span: text('Recorded harvests must span at most 50 years.', 'Hanggang 50 taon lamang ang saklaw ng mga tala ng ani.'),
        };
        return messages[issue.code];
    }

    async function prepare(download = false) {
        if (requestRef.current && !requestRef.current.signal.aborted) return;
        const controller = new AbortController();
        requestRef.current = controller;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const params = new URLSearchParams({ barangay, from, to, format, language: filipino ? 'filipino' : 'english' });
            const response = await fetch(`/admin/reports/harvest-forecast/${download ? 'download' : 'preview'}?${params}`, {
                headers: { Accept: 'application/json' }, signal: controller.signal,
            });
            if (response.headers.get('content-type')?.includes('application/json')) {
                const result = await response.json();
                if (controller.signal.aborted) return;
                if (result.errors) {
                    setError(Object.values(result.errors).flat().join(' '));
                } else if (Array.isArray(result.issues)) {
                    setPreview({ ...result, selection });
                    setPage(1);
                } else if (response.ok && download && format === 'xlsx' && result.preview?.can_export) {
                    const excelModule = await import('exceljs');
                    if (controller.signal.aborted) return;
                    const ExcelJS = excelModule.default || excelModule;
                    const workbook = new ExcelJS.Workbook();
                    workbook.creator = 'AgriFarm — Pasig CENRO';
                    const sheet = workbook.addWorksheet('Monthly harvests');
                    sheet.addTable({
                        name: 'MonthlyHarvests', ref: 'A1', headerRow: true, totalsRow: false,
                        style: { theme: 'TableStyleMedium4', showRowStripes: true },
                        columns: result.headers.map(name => ({ name, filterButton: true })),
                        rows: result.preview.rows.map(([month, crop, kg, area]) => [month, crop, Number(kg), area]),
                    });
                    sheet.columns.forEach((column, index) => { column.width = [15, 30, 20, 25][index]; });
                    sheet.getColumn(3).numFmt = '0.000';
                    sheet.views = [{ state: 'frozen', ySplit: 1 }];
                    const buffer = await workbook.xlsx.writeBuffer();
                    if (controller.signal.aborted) return;
                    const contents = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    if (contents.size > 5 * 1024 * 1024) throw new Error('Export too large');
                    saveFile(contents, result.filename);
                    setPreview({ ...result.preview, selection });
                    setPage(1);
                    setNotice(text('Excel downloaded. Give this file to farmers to upload and click Generate.', 'Na-download ang Excel. Ibigay ito sa mga magsasaka para i-upload at pindutin ang Bumuo.'));
                } else {
                    throw new Error('Unexpected response');
                }
                return;
            }
            if (!response.ok || !download || !response.headers.get('content-type')?.includes('text/csv')) throw new Error('Export failed');
            const contents = await response.blob();
            if (controller.signal.aborted) return;
            const filename = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1] || 'barangay-harvest.csv';
            saveFile(contents, filename);
            setNotice(text('CSV downloaded. Give this file to farmers to upload and click Generate.', 'Na-download ang CSV. Ibigay ito sa mga magsasaka para i-upload at pindutin ang Bumuo.'));
        } catch (failure) {
            if (failure.name !== 'AbortError' && !controller.signal.aborted) setError(text('Could not prepare the export. Please try again.', 'Hindi maihanda ang export. Subukan muli.'));
        } finally {
            if (requestRef.current === controller) {
                requestRef.current = null;
                setBusy(false);
            }
        }
    }

    const currentPreview = preview?.selection === selection ? preview : null;
    const dateLabel = value => new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString(filipino ? 'fil-PH' : 'en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const kgLabel = value => Number(value).toLocaleString('en-PH', { maximumFractionDigits: 3 });
    const pageRows = currentPreview?.rows?.slice((page - 1) * rowsPerPage, page * rowsPerPage) || [];
    return <section className="harvest-forecast-export" aria-labelledby="harvest-forecast-export-heading">
        <header><h2 id="harvest-forecast-export-heading">{text('Export for forecasting', 'Export para sa pagtataya')}</h2>
            <p>{text('Download actual monthly harvests for farmers to upload. Uses the date range above.', 'I-download ang tunay na buwanang ani para i-upload ng mga magsasaka. Gamit ang petsang pinili sa itaas.')}</p></header>
        <form onSubmit={event => { event.preventDefault(); prepare(); }} className="harvest-export-controls">
            <label htmlFor="forecast-export-barangay">Barangay</label>
            <select id="forecast-export-barangay" required value={barangay} onChange={event => setBarangay(event.target.value)}>
                <option value="">{text('Choose a barangay', 'Pumili ng barangay')}</option>
                {barangays.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <button type="submit" disabled={!barangay || !from || !to || busy}>{busy ? text('Preparing…', 'Inihahanda…') : text('Generate preview', 'Gumawa ng preview')}</button>
        </form>
        <fieldset className="report-card-formats harvest-export-formats" disabled={busy}>
            <legend>{text('Download format', 'Format ng download')}</legend>
            {[['xlsx', 'Excel'], ['csv', 'CSV']].map(([value, label]) => <label key={value}>
                <input type="radio" name="harvest-export-format" value={value} checked={format === value} onChange={() => { setFormat(value); setNotice(''); }} />
                <span>{label}</span>
            </label>)}
        </fieldset>
        {(currentPreview || error) && <div className="harvest-export-preview" ref={statusRef} tabIndex={-1}>
            {error && <p role="alert">{error}</p>}
            {currentPreview && <>
                <p><strong>{currentPreview.barangay}</strong>{currentPreview.record_count > 0 && <> · {currentPreview.record_start} – {currentPreview.record_end}</>}</p>
                {currentPreview.record_count > 0 && <p>{text(`${currentPreview.record_count} harvest records · ${currentPreview.row_count} monthly crop totals`, `${currentPreview.record_count} tala ng ani · ${currentPreview.row_count} buwanang kabuuan ng pananim`)}</p>}
                {!currentPreview.can_export && currentPreview.crops.length > 0 && <p className="harvest-export-crops">{text('Crops', 'Mga pananim')}: {currentPreview.crops.join(', ')}</p>}
                {currentPreview.partial_months.length > 0 && <p className="harvest-export-warning">{text('Partial months', 'Hindi buong buwan')}: {currentPreview.partial_months.join(', ')}. {text('Only records within your selected dates are included.', 'Mga tala lamang sa napiling petsa ang kasama.')}</p>}
                {currentPreview.issues.length > 0 && <ul role="alert">{currentPreview.issues.map(issue => <li key={issue.code}>{issueText(issue)}</li>)}</ul>}
                {currentPreview.can_export && <>
                    <div className="report-preview-section harvest-monthly-report">
                        <div className="report-preview-toolbar">
                            <div><span>{text('Live preview', 'Preview ng ulat')}</span><h2>{text('Monthly harvest records', 'Buwanang tala ng ani')}</h2></div>
                            <button type="button" disabled={busy} onClick={() => prepare(true)}><Icon name="download" size={17} />{busy ? text('Preparing…', 'Inihahanda…') : format === 'xlsx' ? text('Download Excel', 'I-download ang Excel') : text('Download forecasting CSV', 'I-download ang CSV para sa pagtataya')}</button>
                        </div>
                        <article className="report-paper">
                            <header><div><strong>AgriFarm</strong><span>Pasig CENRO</span></div><div><small>{text('Harvest records for forecasting', 'Mga tala ng ani para sa pagtataya')}</small><strong>{currentPreview.barangay}</strong></div></header>
                            <div className="report-paper-meta">
                                <div><small>{text('Reporting period', 'Saklaw ng ulat')}</small><strong>{dateLabel(currentPreview.from)} – {dateLabel(currentPreview.to)}</strong></div>
                                <div><small>{text('Generated on', 'Binuo noong')}</small><strong>{dateLabel(currentPreview.generated_at)}</strong></div>
                            </div>
                            <div className="report-summary">
                                <div><small>{text('Crops recorded', 'Mga pananim na naitala')}</small><strong>{currentPreview.crops.length}</strong></div>
                                <div><small>{text('Months with records', 'Mga buwang may tala')}</small><strong>{currentPreview.month_count}</strong></div>
                                <div><small>{text('Total harvest weight', 'Kabuuang timbang ng ani')}</small><strong>{kgLabel(currentPreview.total_kg)} kg</strong></div>
                            </div>
                            <div className="report-table-wrap" role="region" aria-label={text('Monthly harvest totals', 'Buwanang kabuuan ng ani')} tabIndex={0}>
                                <table><thead><tr>{[text('Month', 'Buwan'), text('Vegetable crop', 'Pananim'), text('Harvest (kg)', 'Ani (kg)'), 'Barangay'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
                                    <tbody>{pageRows.map(([month, crop, kg, area]) => <tr key={`${month}|${crop}`}><td>{month}</td><td>{crop}</td><td>{kgLabel(kg)}</td><td>{area}</td></tr>)}</tbody>
                                </table>
                            </div>
                            <Pagination page={page} pageSize={rowsPerPage} onPageSizeChange={setRowsPerPage} totalItems={currentPreview.row_count} onPageChange={setPage} filipino={filipino} label={text('Monthly harvest pages', 'Mga pahina ng buwanang ani')} itemLabel={text('monthly crop totals', 'buwanang kabuuan ng pananim')} className="report-pagination" />
                            <footer>{text('Actual recorded harvests for this barangay. Months without records are omitted; they do not mean zero harvest. Downloads include every row, ready for forecasting upload.', 'Aktuwal na naitalang ani ng barangay. Hindi kasama ang buwang walang tala; hindi ito nangangahulugang walang ani. Kasama sa download ang lahat ng tala, handa nang i-upload para sa pagtataya.')}</footer>
                        </article>
                    </div>
                </>}
            </>}
        </div>}
        <p className="harvest-export-notice" role="status" aria-live="polite">{notice}</p>
    </section>;
}
