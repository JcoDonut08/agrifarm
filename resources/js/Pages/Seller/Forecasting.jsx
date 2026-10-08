import { useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Icon from '../../Components/Storefront/Icon';
import FormStatus from '../../Components/FormStatus';
import ConfirmationDialog from '../../Components/ConfirmationDialog';
import { unitLabel } from './SellerLocale';
import '../../../css/seller-forecast.css';

function monthLabel(month, filipino, includeYear = true) {
    return new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { month: 'short', year: includeYear ? 'numeric' : undefined, timeZone: 'Asia/Manila' })
        .format(new Date(`${month}-01T00:00:00+08:00`));
}

function wideRange(point) {
    return point.lower !== null && point.upper - point.lower > Math.max(point.value, 1);
}

// Row-major order in the crop reference photo atlas (four columns, five rows).
const picturedCrops = ['Kamatis', 'Talong', 'Okra', 'Kangkong', 'Pechay', 'Mustasa', 'Kalabasa', 'Ampalaya', 'Sitaw', 'Sili', 'Alugbati', 'Lettuce', 'Labanos', 'Patola', 'Gabi', 'Saluyot', 'Spinach', 'Kalamansi', 'Luya', 'Malunggay'];

function CropPicture({ crop, text, large = false }) {
    const index = picturedCrops.findIndex(name => name.toLowerCase() === crop.trim().toLowerCase());
    return index < 0
        ? <span className={`forecast-crop-picture is-placeholder ${large ? 'is-large' : ''}`} aria-hidden="true"><Icon name="sprout" /></span>
        : <span role="img" aria-label={`${crop} — ${text('crop reference image', 'halimbawang larawan ng pananim')}`}
            className={`forecast-crop-picture ${large ? 'is-large' : ''}`}
            style={{ backgroundPosition: `${(index % 4) / 3 * 100}% ${Math.floor(index / 4) / 4 * 100}%` }} />;
}

function HarvestCalendar({ rows, months, filipino, text, strengthOf, headingRef, dataset }) {
    const [selected, setSelected] = useState(null);
    const ownCrops = rows.filter(([, details]) => details.status !== 'new_crop');
    const hasShortHistory = ownCrops.some(([, details]) => details.reason === 'Insufficient Data' && details.unit === 'season_strength');
    const orderedRows = [...ownCrops, ...rows.filter(([, details]) => details.status === 'new_crop')];
    const selectedDetails = selected && rows.find(([crop]) => crop === selected.crop)?.[1];
    const selectedPoint = selectedDetails?.forecast?.find(point => point.month === selected.month);
    const barangay = dataset?.scope === 'barangay' ? dataset.barangay : null;
    const label = strength => strength >= 0.7 ? text('Peak season', 'Pinakamainam na panahon')
        : strength >= 0.4 ? text('Okay season', 'Katamtamang panahon') : text('Off-season', 'Hindi panahon');

    return <section className="seller-panel forecast-panel forecast-visual-calendar">
        <div className="forecast-results-heading">
            <h3 ref={headingRef} tabIndex={-1}>{text('Your harvest calendar', 'Kalendaryo ng iyong ani')}</h3>
            <span>{monthLabel(months[0], filipino)} – {monthLabel(months.at(-1), filipino)}</span>
        </div>
        <p className="forecast-calendar-intro">{text('Find the best harvest months for each crop. Tap a month for details.', 'Tingnan ang pinakamainam na buwan ng ani. Pindutin ang buwan para sa detalye.')}</p>
        {barangay && <p className="forecast-dataset-source">{text('Harvest records', 'Mga tala ng ani')}: <strong>{barangay}</strong>
            <small>{monthLabel(dataset.record_start_month, filipino)} – {monthLabel(dataset.record_end_month, filipino)}</small></p>}
        {hasShortHistory && <p className="forecast-history-note" role="note">{text(
            'Some crops have fewer than 24 recorded months. Their guide uses seasonal references.',
            'May ilang pananim na kulang sa 24 buwang tala. Gabay batay sa panahon ang ginagamit para sa mga ito.',
        )}</p>}
        <div className="forecast-season-legend">
            <span><i className="is-best" aria-hidden="true" />{text('Peak season', 'Pinakamainam na panahon')}</span>
            <span><i className="is-good" aria-hidden="true" />{text('Okay season', 'Katamtamang panahon')}</span>
            <span><i className="is-quiet" aria-hidden="true" />{text('Off-season', 'Hindi panahon')}</span>
        </div>
        <p className="forecast-calendar-scroll-hint">{text('Scroll sideways to see all months.', 'I-scroll pakaliwa o pakanan para makita ang lahat ng buwan.')}</p>
        {selected && <div className="forecast-month-detail" role="status">
            <strong>{selected.crop} · {monthLabel(selected.month, filipino)}</strong>
            <p>{!selectedPoint ? text('No harvest estimate for this month.', 'Walang tantya ng ani para sa buwang ito.')
                : selectedDetails.status === 'success' ? <>{label(strengthOf(selectedPoint, selectedDetails))} · {barangay ? text(`Estimated harvest for ${barangay}`, `Tantyang ani para sa ${barangay}`) : text('Estimated harvest', 'Tantyang ani')}: {Math.round(selectedPoint.lower)}–{Math.round(selectedPoint.upper)} kg</>
                    : <>{label(strengthOf(selectedPoint, selectedDetails))} · {text('Seasonal planting guide', 'Gabay batay sa panahon')}</>}</p>
        </div>}
        <div className="forecast-season-grid" tabIndex={0} role="region" aria-label={text('Visual harvest calendar', 'Biswal na kalendaryo ng ani')}>
            <table>
                <caption className="sr-only">{text('Harvest patterns, not sales demand or guaranteed yield. Seasonal guides use illustrative reference patterns.', 'Pattern ng ani, hindi demand sa benta o garantisadong ani. Halimbawang pattern ang ginagamit sa gabay batay sa panahon.')}</caption>
                <thead><tr><th scope="col">{text('Crop', 'Pananim')}</th>{months.map(month => <th scope="col" key={month}>{monthLabel(month, filipino)}</th>)}</tr></thead>
                <tbody>{orderedRows.map(([crop, details]) => <tr key={crop}>
                    <th scope="row"><div className="forecast-calendar-crop"><CropPicture crop={crop} text={text} /><span>{crop}<small>{details.status === 'success' ? (barangay ? text('Barangay records', 'Tala ng barangay') : text('Your records', 'Iyong mga tala')) : details.unit === 'unavailable' ? text('No forecast', 'Walang pagtataya') : text('Seasonal guide', 'Gabay sa panahon')}</small></span></div></th>
                    {months.map(month => {
                        const point = details.forecast?.find(value => value.month === month);
                        const strength = point ? strengthOf(point, details) : null;
                        const level = strength === null ? 'unavailable' : strength >= 0.7 ? 'best' : strength >= 0.4 ? 'good' : 'quiet';
                        return <td key={month}><button type="button" className={`forecast-season-cell is-${level}`}
                            aria-label={`${crop}, ${monthLabel(month, filipino)}: ${point ? label(strength) : text('No forecast', 'Walang pagtataya')}`}
                            aria-pressed={selected?.crop === crop && selected?.month === month}
                            onClick={() => setSelected({ crop, month })} /></td>;
                    })}
                </tr>)}</tbody>
            </table>
        </div>

    </section>;
}

export default function Forecasting({ filipino = false }) {
    const { data, setData, post, transform, processing, errors, clearErrors } = useForm({ harvest_data: null });
    const { flash, forecastData, forecastRun, plantingPlans = [] } = usePage().props;
    const planForm = useForm({ crop: '', planting_month: '' });
    const [planAction, setPlanAction] = useState(null);
    const [planNotice, setPlanNotice] = useState('');
    const [planNoticeId, setPlanNoticeId] = useState(0);
    const [planToRemove, setPlanToRemove] = useState(null);
    const hasForecast = Boolean(forecastData?.forecast_months?.length);
    const barangay = forecastData?.dataset?.scope === 'barangay' ? forecastData.dataset.barangay : null;
    const resultsHeadingRef = useRef(null);
    const plantingPlanHeadingRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [resultReveal, setResultReveal] = useState(0);
    const [uploadErrorFocus, setUploadErrorFocus] = useState(0);
    const fileInputRef = useRef(null);
    const filePickerRef = useRef(null);
    const uploadErrorRef = useRef(null);
    const rows = Object.entries(forecastData?.crops || {});
    const months = forecastData?.forecast_months || [];
    const recommendations = forecastData?.recommendations || [];
    const savedCrops = new Set(plantingPlans.filter(plan => plan.planting_month === forecastData?.planting_month).map(plan => plan.crop));
    const text = (english, translated) => filipino ? translated : english;
    useEffect(() => {
        if (!resultReveal) return;
        resultsHeadingRef.current?.focus({ preventScroll: true });
        resultsHeadingRef.current?.scrollIntoView({
            block: 'start',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
    }, [resultReveal]);
    useEffect(() => {
        if (!uploadErrorFocus) return;
        uploadErrorRef.current?.focus({ preventScroll: true });
        uploadErrorRef.current?.scrollIntoView({
            block: 'center',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
    }, [uploadErrorFocus]);
    const seasonText = value => value >= 0.7 ? text('Peak', 'Pinakamainam') : value >= 0.4 ? text('Okay', 'Katamtaman') : text('Off-season', 'Hindi panahon');
    const strengthOf = (point, details) => {
        const max = Math.max(0, ...(details.forecast || []).map(value => value.value));
        return details.status === 'success' ? (max > 0 ? point.value / max : 0) : point.value;
    };

    function strongHarvestMonths(crop) {
        const details = forecastData.crops[crop];
        const strongMonths = months.filter(month => {
            const point = details.forecast?.find(value => value.month === month);
            return point && strengthOf(point, details) >= 0.7;
        });
        return strongMonths.length
            ? `${text('Strong harvest months', 'Mga buwang malakas ang ani')}: ${strongMonths.map(month => monthLabel(month, filipino, false)).join(', ')}`
            : text('No strong harvest months shown in the calendar.', 'Walang buwang malakas ang ani na ipinapakita sa kalendaryo.');
    }

    function sellingReason(rec) {
        const activity = rec.selling_activity;
        if (!activity || activity.level === 'limited') return '';
        const level = activity.level === 'regular' ? text('Regular', 'Madalas') : activity.level === 'some' ? text('Some', 'May ilan') : text('Few', 'Kaunti');
        return activity.basis === 'harvest_month'
            ? text(`Past ${monthLabel(rec.harvest_month, false, false)} sales: ${level}`, `Mga dating benta sa ${monthLabel(rec.harvest_month, true, false)}: ${level}`)
            : text(`Recent sales: ${level}`, `Kamakailang benta: ${level}`);
    }

    function quantitiesLabel(values) {
        return Object.entries(values || {}).map(([unit, quantity]) => `${Number(quantity).toLocaleString('en-PH')} ${unitLabel(unit, filipino)}`).join(', ');
    }

    function sellingPeriod(activity) {
        if (activity.basis === 'harvest_month') return activity.periods.map(month => monthLabel(month, filipino)).join(', ');
        const period = activity.periods[0];
        if (!period) return '';
        const date = value => new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
        return `${date(period.from)} – ${date(period.to)}`;
    }

    function errorText(error) {
        const rowList = (error.details?.rows || []).join(', ');
        const messages = {
            missing_columns: text(`Missing required columns: ${(error.details?.columns || []).join(', ')}.`, `Kulang ang mga column: ${(error.details?.columns || []).join(', ')}.`),
            duplicate_columns: text('Use only one column for each of Month, Vegetable Crop and Harvest (kg).', 'Gumamit ng isang column lamang para sa bawat Month, Vegetable Crop at Harvest (kg).'),
            invalid_dates: text(`Unreadable dates at rows ${rowList}. Use January 2025, Jan 2025, 2025-01 or 2025-01-15.`, `Hindi mabasa ang petsa sa mga hanay ${rowList}. Gamitin ang January 2025, Jan 2025, 2025-01 o 2025-01-15.`),
            invalid_harvest: text(`Harvest must be a number from 0 to 1,000,000 kg. Check rows ${rowList}.`, `Dapat bilang mula 0 hanggang 1,000,000 kg ang ani. Suriin ang mga hanay ${rowList}.`),
            invalid_crops: text(`Name a crop in every row (up to 100 characters). Check rows ${rowList}.`, `Ilagay ang pangalan ng pananim sa bawat hanay (hanggang 100 titik). Suriin ang mga hanay ${rowList}.`),
            invalid_barangay: text(`Name the same barangay in every row (up to 100 characters). Check rows ${rowList}.`, `Ilagay ang parehong barangay sa bawat hanay (hanggang 100 titik). Suriin ang mga hanay ${rowList}.`),
            mixed_barangays: text('Upload records for only one barangay at a time. Ask for a separate file for each barangay.', 'Mga tala ng isang barangay lamang ang i-upload. Humingi ng hiwalay na file para sa bawat barangay.'),
            no_crops: text('No crops found. Add at least one harvest record.', 'Walang nakitang pananim. Maglagay ng kahit isang tala ng ani.'),
            too_many_rows: text('Upload exceeds the 20,000-row limit.', 'Lampas sa 20,000 hanay ang file.'),
            too_many_crops: text('Upload exceeds the 50-crop limit.', 'Lampas sa 50 pananim ang file.'),
            date_span: text('Harvest records must span no more than 50 years.', 'Hanggang 50 taon lamang ang saklaw ng mga tala ng ani.'),
            workbook_too_large: text('This Excel workbook is too large when opened. Save just your harvest sheet as CSV.', 'Masyadong malaki ang Excel kapag binuksan. I-save ang tala ng ani bilang CSV.'),
            unreadable_file: text('Cannot read this file. Save a UTF-8 CSV or a valid Excel (.xlsx) workbook.', 'Hindi mabasa ang file. I-save bilang UTF-8 CSV o wastong Excel (.xlsx).'),
        };
        return messages[error.error_code] || text('The forecast could not be generated. Please try again later. Your last saved result is still available.', 'Hindi mabuo ang pagtataya. Subukan muli mamaya. Nananatili ang huling na-save na resulta.');
    }

    function chooseFile(file) {
        if (!processing && file) {
            setData('harvest_data', file);
            clearErrors('harvest_data');
        }
    }

    function clearFile() {
        setData('harvest_data', null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        clearErrors('harvest_data');
        filePickerRef.current?.focus();
    }

    function focusUploadError() {
        setUploadErrorFocus(value => value + 1);
    }

    function submit(event) {
        event?.preventDefault();
        if (processing || !data.harvest_data) return;
        setIsDragging(false);
        transform(values => ({ ...values, language: filipino ? 'filipino' : 'english' }));
        post('/seller/forecasting', { preserveScroll: true, preserveState: true, onSuccess: page => {
            if (!page.props.flash?.forecastError) {
                clearFile();
                setResultReveal(value => value + 1);
            } else focusUploadError();
        }, onError: focusUploadError });
    }

    function weatherReason(rec) {
        const level = score => score >= 8 ? text('high', 'mataas') : score >= 5 ? text('moderate', 'katamtaman') : text('low', 'mababa');
        if (rec.weather_focus === 'rain') {
            return rec.weather_tolerance.rain >= 8 ? text('Handles rain well', 'Matibay sa ulan')
                : `${text('Rain tolerance', 'Tibay sa ulan')}: ${level(rec.weather_tolerance.rain)}`;
        }
        if (rec.weather_focus === 'heat') {
            return rec.weather_tolerance.heat >= 8 ? text('Handles heat well', 'Matibay sa init')
                : `${text('Heat tolerance', 'Tibay sa init')}: ${level(rec.weather_tolerance.heat)}`;
        }
        if (rec.weather_tolerance.rain >= 8 && rec.weather_tolerance.heat >= 8) return text('Handles rain and heat well', 'Matibay sa ulan at init');
        if (rec.weather_tolerance.rain >= 8) return text('Better suited to rain', 'Mas angkop sa ulan');
        if (rec.weather_tolerance.heat >= 8) return text('Better suited to heat', 'Mas angkop sa init');
        return text('Moderate rain and heat tolerance', 'Katamtamang tibay sa ulan at init');
    }

    function savePlan(rec) {
        planForm.clearErrors();
        setPlanNotice('');
        setPlanAction({ type: 'save', crop: rec.crop });
        planForm.transform(() => ({ crop: rec.crop, planting_month: forecastData.planting_month, language: filipino ? 'filipino' : 'english' }));
        planForm.post('/seller/planting-plans', {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setPlanNotice(text('Saved to your planting plan.', 'Na-save sa iyong plano sa pagtatanim.'));
                setPlanNoticeId(id => id + 1);
                requestAnimationFrame(() => {
                    plantingPlanHeadingRef.current?.focus({ preventScroll: true });
                    plantingPlanHeadingRef.current?.scrollIntoView({ block: 'start' });
                });
            },
            onFinish: () => setPlanAction(null),
        });
    }

    function removePlan(plan) {
        if (planForm.processing) return;
        planForm.clearErrors();
        setPlanNotice('');
        setPlanAction({ type: 'remove', id: plan.id });
        planForm.delete(`/seller/planting-plans/${plan.id}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setPlanToRemove(null);
                setPlanNotice(text('Removed from your planting plan.', 'Inalis sa iyong plano sa pagtatanim.'));
                setPlanNoticeId(id => id + 1);
            },
            onFinish: () => setPlanAction(null),
        });
    }

    return (
        <div className="seller-analytics seller-forecast">
            <header className="seller-section-header">
                <h2>{text('Harvest Forecast', 'Pagtataya ng Ani')}</h2>
                <p>{text('See what to plant next.', 'Tingnan kung ano ang maaaring itanim.')}</p>
            </header>

            {hasForecast && <div key={resultReveal} className={`forecast-results ${resultReveal ? 'forecast-results-reveal' : ''}`}>
                <HarvestCalendar key={`${forecastRun?.created_at}-${forecastRun?.source_filename}`} rows={rows} months={months} filipino={filipino} text={text} strengthOf={strengthOf} headingRef={resultsHeadingRef} dataset={forecastData.dataset} />
                <section className="seller-panel forecast-panel forecast-recommendations">
                    <div className="forecast-results-heading">
                        <h3>{text('Recommended crops to plant', 'Mga mungkahing pananim')}</h3>
                        <span>{monthLabel(forecastData.planting_month, filipino)}</span>
                    </div>
                    <p className="forecast-calendar-intro">{text('Chosen for the season, harvest timing, and recorded selling activity.', 'Pinili batay sa panahon, oras ng ani, at naitalang benta.')}</p>
                    {recommendations.length ? <div className="forecast-card-grid">
                        {recommendations.map(rec => <article className="forecast-rec-card" key={rec.crop}>
                            <div className="forecast-rec-header"><CropPicture crop={rec.crop} text={text} large /><div><h4>{rec.crop}</h4>
                                {rec.new_crop && <span className="forecast-new-crop">{text('New crop for you', 'Bagong pananim para sa iyo')}</span>}
                            </div></div>
                            <ul className="forecast-rec-summary">
                                <li>{weatherReason(rec)}</li>
                                <li className="forecast-strong-months">{strongHarvestMonths(rec.crop)}</li>
                                {sellingReason(rec) && <li className="forecast-selling-activity">{sellingReason(rec)}</li>}
                            </ul>
                            <p className="forecast-growing-time">{text('About', 'Mga')} <strong>{rec.days_to_harvest} {text('days', 'araw')}</strong></p>
                            <p className="forecast-planting-date">{text('Plant in', 'Itanim sa')} <strong>{monthLabel(forecastData.planting_month, filipino)}</strong></p>
                            <p className="forecast-harvest-date">{text('Harvest around', 'Ani bandang')} <strong>{monthLabel(rec.harvest_month, filipino)}</strong></p>
                            <p className="forecast-expected-harvest">{rec.forecast
                                ? <>{rec.source === 'barangay_history' ? text(`Estimated harvest for ${barangay}`, `Tantyang ani para sa ${barangay}`) : text('Estimated harvest', 'Tantyang ani')}: <strong>{Math.round(rec.forecast.lower)}–{Math.round(rec.forecast.upper)} kg</strong></>
                                : text('Seasonal planting guide', 'Gabay batay sa panahon')}</p>
                            <button type="button" className="forecast-plan-button"
                                disabled={planForm.processing || savedCrops.has(rec.crop)}
                                aria-label={savedCrops.has(rec.crop)
                                    ? text(`${rec.crop} — saved to planting plan`, `${rec.crop} — na-save sa plano sa pagtatanim`)
                                    : text(`Add ${rec.crop} to my planting plan`, `Idagdag ang ${rec.crop} sa aking plano sa pagtatanim`)}
                                onClick={() => savePlan(rec)}>
                                {savedCrops.has(rec.crop)
                                    ? text('Saved to planting plan', 'Na-save sa plano')
                                    : planAction?.type === 'save' && planAction.crop === rec.crop
                                        ? text('Saving…', 'Sine-save…') : text('Add to my planting plan', 'Idagdag sa aking plano')}
                            </button>
                            <details className="forecast-card-details">
                                <summary>{text('Why this crop?', 'Bakit ito?')}</summary>
                                <p>{rec.source === 'barangay_history'
                                    ? text(`Based on ${barangay} harvest records.`, `Batay sa mga tala ng ani ng ${barangay}.`)
                                    : rec.source === 'farm_history'
                                    ? text('Based on your harvest records.', 'Batay sa mga tala ng iyong ani.')
                                    : text('Based on illustrative seasonal references for Pasig.', 'Batay sa mga halimbawang sanggunian ng panahon sa Pasig.')}</p>
                                {rec.outside_forecast_horizon && <p>{text('This harvest date is outside your saved forecast. This suggestion uses seasonal references.', 'Lampas sa saklaw ng iyong na-save na pagtataya ang petsang ito. Batay sa mga sanggunian ng panahon ang mungkahing ito.')}</p>}
                                <ul>
                                    <li>{text('Harvest season', 'Panahon ng ani')}: {seasonText(rec.season_strength)} ({Math.round(rec.season_strength * 100)}%)</li>
                                    <li>{weatherReason(rec)}</li>
                                    <li>{text('Planting rank', 'Ranggo sa pagtatanim')}: {rec.score.toFixed(1)} / 10. {text('A guide for comparing crops.', 'Gabay sa paghahambing ng mga pananim.')}</li>
                                </ul>
                                {rec.selling_activity?.order_count > 0 && <div className="forecast-selling-details">
                                    <p>{text('Selling activity', 'Tala ng benta')}: <strong>{rec.selling_activity.scope === 'barangay' ? rec.selling_activity.barangay : text('Your selling records', 'Mga tala ng iyong benta')}</strong></p>
                                    <p>{text('Completed orders', 'Mga nakumpletong order')}: {rec.selling_activity.order_count}</p>
                                    {rec.selling_activity.periods.length > 0 && <p>{text('Period', 'Panahon')}: {sellingPeriod(rec.selling_activity)}</p>}
                                    {Object.keys(rec.selling_activity.sold).length > 0 && <p>{text('Quantity sold', 'Dami ng nabenta')}: {quantitiesLabel(rec.selling_activity.sold)}</p>}
                                    {Object.keys(rec.selling_activity.stock).length > 0 && <p>{text('Current stock', 'Kasalukuyang stock')}: {quantitiesLabel(rec.selling_activity.stock)}</p>}
                                    {rec.selling_activity.stock_pressure && <p>{text('Current stock is higher than recent sales in the same unit.', 'Mas mataas ang kasalukuyang stock kaysa kamakailang benta sa parehong yunit.')}</p>}
                                </div>}
                                <p>{text('Growing times are approximate. Transplanted crops assume ready seedlings.', 'Tantya ang tagal ng paglaki. Ipinapalagay na handa na ang punla para sa paglilipat-tanim.')}</p>
                                {rec.forecast && <p>{text('The harvest range is an 80% model prediction interval.', 'Ang saklaw ng ani ay 80% prediction interval ng modelo.')}
                                    {wideRange(rec.forecast) && <> {text('The model gives a broad range for this harvest.', 'Malawak ang saklaw ng tantya ng modelo para sa aning ito.')}</>}</p>}
                            </details>
                        </article>)}
                    </div> : <p className="forecast-help">{text('No planting suggestions for these crops yet.', 'Wala pang mungkahi sa pagtatanim para sa mga pananim na ito.')}</p>}
                    {forecastRun && <p className="forecast-updated">{text('Updated', 'Na-update noong')} {new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(forecastRun.created_at))}</p>}
                </section>


            </div>}

            <FormStatus dismissible messageId={planNoticeId} dismissLabel={text('Dismiss message', 'Isara ang mensahe')}>{planNotice}</FormStatus>
            {(planForm.errors.crop || planForm.errors.planting_month) && <p className="forecast-error" role="alert">
                {planForm.errors.crop || planForm.errors.planting_month}
            </p>}
            <ConfirmationDialog open={Boolean(planToRemove)} title={text('Remove planting plan?', 'Alisin ang plano sa pagtatanim?')}
                description={text(`Remove ${planToRemove?.crop || ''} from your planting plan?`, `Alisin ang ${planToRemove?.crop || ''} sa iyong plano sa pagtatanim?`)}
                confirmLabel={text('Remove plan', 'Alisin ang plano')} cancelLabel={text('Keep plan', 'Panatilihin ang plano')} workingLabel={text('Removing…', 'Inaalis…')}
                busy={planForm.processing} onCancel={() => setPlanToRemove(null)} onConfirm={() => removePlan(planToRemove)} />

            {plantingPlans.length > 0 && <section className="seller-panel forecast-panel forecast-planting-plan">
                <h3 ref={plantingPlanHeadingRef} tabIndex={-1}>{text('Your planting plan', 'Iyong plano sa pagtatanim')}</h3>
                <ul className="forecast-plan-list">
                    {plantingPlans.map(plan => <li key={plan.id}>
                        <div className="forecast-plan-crop"><CropPicture crop={plan.crop} text={text} /><strong>{plan.crop}</strong></div>
                        <dl>
                            <div><dt>{text('Plant in', 'Itanim sa')}</dt><dd>{monthLabel(plan.planting_month, filipino)}</dd></div>
                            <div><dt>{text('Harvest around', 'Ani bandang')}</dt><dd>{monthLabel(plan.harvest_month, filipino)}</dd></div>
                        </dl>
                        <button type="button" className="forecast-plan-remove" disabled={planForm.processing}
                            aria-label={text(`Remove ${plan.crop} from planting plan`, `Alisin ang ${plan.crop} sa plano sa pagtatanim`)}
                            onClick={() => setPlanToRemove(plan)}>
                            {planAction?.type === 'remove' && planAction.id === plan.id ? text('Removing…', 'Inaalis…') : text('Remove', 'Alisin')}
                        </button>
                    </li>)}
                </ul>
            </section>}

            <section className="seller-panel forecast-panel forecast-upload-panel">
                <h3>{hasForecast ? text('Update harvest records', 'I-update ang tala ng ani') : text('Upload harvest records', 'Mag-upload ng tala ng ani')}</h3>
                {forecastRun && <p className="forecast-help forecast-saved">{text('Saved file', 'Na-save na file')}: {forecastRun.source_filename}</p>}
                <form className="forecast-upload-form" onSubmit={submit} aria-busy={processing}>
                    <input type="file" className="sr-only" tabIndex={-1} accept=".csv,.txt,.xlsx" ref={fileInputRef} disabled={processing}
                        aria-label={text('Harvest file', 'File ng ani')} onChange={event => chooseFile(event.target.files[0])} />
                    <div
                        className={`forecast-upload-zone ${isDragging ? 'is-dragging' : ''} ${data.harvest_data ? 'has-file' : ''}`}
                        onDragOver={event => { event.preventDefault(); if (!processing) setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={event => { event.preventDefault(); setIsDragging(false); chooseFile(event.dataTransfer.files[0]); }}
                    >
                        <button type="button" className="forecast-file-picker" ref={filePickerRef} disabled={processing}
                            aria-label={text('Choose harvest file', 'Pumili ng file ng ani')}
                            aria-describedby={errors.harvest_data || flash?.forecastError ? 'forecast-upload-error' : undefined}
                            onClick={() => fileInputRef.current?.click()}>
                            <span className="forecast-upload-icon">{data.harvest_data ? <Icon name="receipt" /> : <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}</span>
                            <span className="forecast-file-copy">
                                <span className={data.harvest_data ? 'forecast-file-badge' : 'forecast-upload-text'}>{data.harvest_data ? data.harvest_data.name : text('Drop your harvest file here', 'I-drop ang file ng ani rito')}</span>
                                <span className="forecast-upload-subtext">{data.harvest_data
                                    ? `${new Intl.NumberFormat(filipino ? 'fil-PH' : 'en-PH', { maximumFractionDigits: 1 }).format(data.harvest_data.size / 1024)} KB`
                                    : text('CSV or Excel · Up to 5 MB', 'CSV o Excel · Hanggang 5 MB')}</span>
                            </span>
                            <span className="forecast-file-action">{data.harvest_data ? text('Change file', 'Palitan ang file') : text('Choose file', 'Pumili ng file')}</span>
                        </button>
                        {data.harvest_data && <button type="button" className="forecast-file-remove" disabled={processing}
                            aria-label={text('Remove selected file', 'Alisin ang napiling file')} onClick={clearFile}><Icon name="close" size={18} /></button>}
                    </div>
                    <button type="submit" className="seller-save-button forecast-generate-button" disabled={processing || !data.harvest_data}>
                        {processing ? <span className="forecast-loading-spinner" aria-hidden="true" /> : <Icon name="sprout" />}
                        {processing ? text('Preparing guide…', 'Inihahanda ang gabay…') : text('Generate', 'Bumuo')}
                    </button>
                    {(errors.harvest_data || flash?.forecastError) && <p id="forecast-upload-error" ref={uploadErrorRef} tabIndex={-1} className="forecast-error" role="alert">
                        {errors.harvest_data || errorText(flash.forecastError)}
                    </p>}
                </form>
                <div className="forecast-generation-status" role="status" aria-live="polite" aria-atomic="true">
                    {processing && <><p>{text('Preparing your planting guide…', 'Inihahanda ang gabay sa pagtatanim…')}</p><span className="forecast-loading-track" aria-hidden="true"><span /></span></>}
                </div>
            </section>

            {hasForecast && <div className="forecast-help-sections">
                <details className="forecast-how-it-works">
                    <summary>{text('How this works', 'Paano ito gumagana')}</summary>
                    <p>{barangay ? text(`Kilogram estimates describe ${barangay}’s recorded production, rather than an individual farm’s yield.`, `Ang tantya sa kilo ay para sa naitalang produksyon ng ${barangay}, hindi sa ani ng isang bukid.`) : text('Your harvest records help estimate future harvest patterns.', 'Ginagamit ang iyong mga tala ng ani upang tantyahin ang mga susunod na pattern ng ani.')}</p>
                    {barangay && <p>{text('The barangay name comes from the uploaded file; it does not verify who issued it.', 'Mula sa na-upload na file ang pangalan ng barangay; hindi nito pinatutunayan kung sino ang nagbigay ng file.')}</p>}
                    <p>{text('Seasonal planting guides use illustrative reference patterns for Pasig. They guide timing and do not estimate kilos.', 'Mga halimbawang pattern ng panahon sa Pasig ang batayan ng gabay. Gabay ito sa panahon ng pagtatanim at walang tantya sa kilo.')}</p>
                    <p>{text('Suggestions consider harvest patterns, seasonal rain/heat suitability, and selling activity when enough records are available. Future sales and buyer demand are not predicted.', 'Batay ang mga mungkahi sa pattern ng ani, tibay sa ulan/init ayon sa panahon, at benta kung sapat ang mga tala. Walang pagtataya ng susunod na benta o demand ng mamimili.')}</p>
                    <p>{text('At least 24 recorded months are needed to fit a harvest model; gaps or a failed fit may still require a seasonal guide.', 'Kailangan ng hindi bababa sa 24 buwang may tala para sa modelo ng ani; maaaring gabay batay sa panahon pa rin ang gamitin kung may puwang o hindi mabuo ang modelo.')}</p>
                    <p>{text('Use this with your local conditions and farming experience. The planting decision is yours.', 'Isaalang-alang ang kondisyon sa lugar at iyong karanasan. Ikaw ang magpapasya sa pagtatanim.')}</p>
                </details>
                    <details className="forecast-explanation">
                        <summary>{text('Model details and crop references', 'Detalye ng modelo at mga sanggunian sa pananim')}</summary>
                        <p>{text('SARIMA estimates future monthly harvests from at least 24 recorded months. Only short gaps are interpolated; sparse records use seasonal reference profiles. Seasonal planting guides use illustrative reference patterns for Pasig, not independently measured barangay averages.', 'Tinatantya ng SARIMA ang buwanang ani mula sa hindi bababa sa 24 buwang may tala. Maiikling puwang lamang ang pinupunan; kung kulang ang tala, ginagamit ang mga pattern ng panahon. Mga halimbawang sanggunian ang mga gabay batay sa panahon, hindi hiwalay na sinusukat na barangay average.')}</p>
                        <p>{text('Validated on synthetic data generated from regional seasonal patterns to confirm the pipeline works. Accuracy on real barangay records is future work.', 'Sinuri gamit ang sintetikong datos mula sa mga pattern ng panahon upang tiyaking gumagana ang proseso. Susuriin pa ang katumpakan gamit ang tunay na tala ng barangay.')}</p>
                        <p>{text('The 80% ranges depend on the fitted model and assumptions. Planting scores start with 60% season strength and 40% rain/heat tolerance. Sufficient selling records adjust the score by at most one point in either direction; the score stays from 0 to 10. These are planning rules, not measured chances of success.', 'Nakadepende sa modelo at mga palagay ang 80% saklaw. Nagsisimula ang ranggo sa 60% lakas ng panahon at 40% tibay sa ulan/init. Kung sapat ang tala ng benta, hanggang isang puntos ang dagdag o bawas; nananatili sa 0 hanggang 10 ang puntos. Mga tuntunin sa pagpaplano ito, hindi sinusukat na posibilidad ng tagumpay.')}</p>
                        <ul>{rows.filter(([, details]) => details.status === 'success').map(([crop, details]) => <li key={crop}>
                            {crop}: SARIMA ({details.order.join(',')}) ({details.seasonal_order.join(',')});
                            {' '}{details.selection === 'aic_grid' ? text('selected by AIC', 'pinili gamit ang AIC') : text('default order (search time budget reached)', 'karaniwang order (naabot ang takdang oras ng paghahanap)')}.
                            {' '}{details.data_points_used} {text('recorded months', 'buwang may tala')}; {details.interpolated_months} {text('interpolated', 'pinunang puwang')}.
                        </li>)}</ul>
                        <ul>{rows.filter(([, details]) => details.metadata).map(([crop, details]) => <li key={crop}>
                            {crop}: ~{details.metadata.days_to_harvest} {text('days', 'araw')}.
                            {' '}{filipino ? 'Tantya lamang; nag-iiba ayon sa uri at paraan ng pagtatanim.' : details.metadata.timing_note}
                            {details.metadata.source_url && <> <a href={details.metadata.source_url} target="_blank" rel="noreferrer">{text('Agriculture reference', 'Sanggunian sa agrikultura')}</a></>}
                        </li>)}</ul>
                        <p>{text('Use this as planting guidance alongside your local conditions and farming experience.', 'Gamitin ito bilang gabay kasama ng kondisyon sa lugar at iyong karanasan sa pagsasaka.')}</p>
                    </details>
            </div>}
        </div>
    );
}
