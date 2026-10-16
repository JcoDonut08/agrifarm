import { useEffect, useState } from 'react';

export function MonthlyWeatherAdvice({ advice, filipino, monthLabel }) {
    const text = (english, translated) => filipino ? translated : english;
    if (!advice) return null;
    return <div className="forecast-monthly-advice">
        <p className="forecast-monthly-advice-title">{text('Monthly weather advice', 'Buwanang payo sa panahon')} · {monthLabel(advice.month, filipino)}</p>
        {advice.condition ? <>
            <p className="forecast-monthly-condition">{advice.condition[filipino ? 'fil' : 'en']}</p>
            {advice.preparation ? <p><strong>{text(`If you plant ${advice.crop}:`, `Kung magtatanim ng ${advice.crop}:`)}</strong> {advice.preparation[filipino ? 'fil' : 'en']}</p>
                : <p>{text('Ask CENRO about the soil, water and space this crop needs before planting.', 'Magtanong sa CENRO tungkol sa lupa, tubig at espasyong kailangan ng pananim bago magtanim.')}</p>}
            {advice.messages.some(message => message.rule === 'review_temperature') && <p>{text('The temperature estimate is outside the growing guide’s range. Check your variety with CENRO before planting.', 'Lampas sa saklaw ng gabay ang tantyang temperatura. Tiyakin ang barayti sa CENRO bago magtanim.')}</p>}
            {advice.source && <a href={advice.source.url} target="_blank" rel="noopener noreferrer" title={advice.source.title}>{text('Read the growing guide', 'Basahin ang gabay sa pagtatanim')}<span className="sr-only"> {advice.source.title} · {text('(opens in a new tab)', '(magbubukas sa bagong tab)')}</span></a>}
        </> : <p>{text('Monthly weather advice is unavailable for this planting month. Check the daily forecast before planting.', 'Walang buwanang payo sa panahon para sa buwang ito ng pagtatanim. Tingnan ang pang-araw-araw na taya bago magtanim.')}</p>}
    </div>;
}

export default function MonthlyWeatherOutlook({ outlook, filipino, monthLabel, plantingMonth }) {
    const text = (english, translated) => filipino ? translated : english;
    const [selected, setSelected] = useState(outlook?.current_month || '');
    const points = outlook?.forecast || [];
    const point = points.find(item => item.month === selected) || points[0];
    useEffect(() => {
        if (!points.some(item => item.month === selected)) setSelected(points[0]?.month || '');
    }, [outlook, selected]);
    const ready = outlook?.status === 'ready' && point;
    const number = value => new Intl.NumberFormat(filipino ? 'fil-PH' : 'en-PH', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value);
    const rainfallDifference = point ? Math.round(point.rainfall_total_mm * 10) - Math.round(point.reference_rainfall_mm * 10) : 0;
    const rainfallSummary = rainfallDifference > 0
        ? text('More rain than usual', 'Mas maraming ulan kaysa karaniwan')
        : rainfallDifference < 0
            ? text('Less rain than usual', 'Mas kaunting ulan kaysa karaniwan')
            : text('Usual amount of rain', 'Karaniwang dami ng ulan');

    return <section className="seller-panel forecast-panel forecast-monthly-weather" aria-labelledby="monthly-weather-heading">
        <div className="forecast-monthly-heading">
            <div><h3 id="monthly-weather-heading">{text('Monthly Weather Outlook', 'Buwanang Pagtataya ng Panahon')}</h3>
                <p>{text('Pasig area · Plan ahead for your crops', 'Lugar ng Pasig · Magplano para sa iyong mga pananim')}</p></div>
            {ready && <div className="forecast-monthly-selector"><label htmlFor="monthly-weather-month">{text('Forecast month', 'Buwan ng pagtataya')}</label>
                <select id="monthly-weather-month" value={point.month} onChange={event => setSelected(event.target.value)}>
                    {points.map(item => <option key={item.month} value={item.month}>{monthLabel(item.month, filipino)}</option>)}
                </select></div>}
        </div>
        {ready ? <>
            <div aria-live="polite" aria-atomic="true">
                <p className="sr-only">{monthLabel(point.month, filipino)}</p>
                <dl className="forecast-monthly-summary">
                    <div><dt>{text('Expected rain', 'Inaasahang ulan')}</dt><dd className="forecast-monthly-rain-summary">{rainfallSummary}</dd>
                        <p>{text('Compared with past years for this month.', 'Kumpara sa mga nakaraang taon para sa buwang ito.')}</p></div>
                    <div><dt>{text('Expected temperature', 'Inaasahang temperatura')}</dt><dd className="forecast-monthly-temperature-summary">{text(`Around ${Math.round(point.temperature_mean_c)}°C`, `Mga ${Math.round(point.temperature_mean_c)}°C`)}</dd>
                        <p>{text('Average for the whole month.', 'Karaniwan para sa buong buwan.')}</p></div>
                </dl>
            </div>
            <p className="forecast-monthly-note"><strong>{text('Before planting:', 'Bago magtanim:')}</strong> {plantingMonth
                ? text('Follow the crop preparation advice below and check the daily weather forecast.', 'Sundin ang paghahanda para sa mga pananim sa ibaba at tingnan ang pang-araw-araw na taya ng panahon.')
                : text('Read the crop’s growing guide and check the daily weather forecast.', 'Basahin ang gabay sa pagtatanim at tingnan ang pang-araw-araw na taya ng panahon.')}</p>
            {outlook.refresh_recommended && <p className="forecast-monthly-note">{text('This guide still covers your selected month, but an updated guide is due. Check the daily forecast for current conditions.', 'Sakop pa ng gabay na ito ang napiling buwan, ngunit kailangan na ng bagong gabay. Tingnan ang pang-araw-araw na taya para sa kasalukuyang panahon.')}</p>}
            {plantingMonth && <p className="forecast-monthly-note">{text('Planting advice below is for', 'Ang payo sa pagtatanim sa ibaba ay para sa')} <strong>{monthLabel(plantingMonth, filipino)}</strong>.</p>}
            <details className="forecast-monthly-validation">
                <summary>{text('Show weather details', 'Tingnan ang detalye ng panahon')}</summary>
                <dl className="forecast-monthly-figures">
                    <div><dt>{text('Mean temperature', 'Karaniwang temperatura')}</dt><dd>{number(point.temperature_mean_c)} °C</dd></div>
                    <div><dt>{text('Total rainfall', 'Kabuuang ulan')}</dt><dd>{number(point.rainfall_total_mm)} mm</dd></div>
                    <div><dt>{text(`Rainfall reference average (${outlook.reference_period})`, `Karaniwang ulan sa sanggunian (${outlook.reference_period})`)}</dt><dd>{number(point.reference_rainfall_mm)} mm</dd></div>
                </dl>
                <p>{text('Rainfall is the estimated total for the whole month, measured in millimeters (mm). These monthly values do not predict individual storms or daily heat extremes.', 'Ang ulan ay tantyang kabuuan para sa buong buwan, na sinusukat sa milimetro (mm). Hindi hinuhulaan ng buwanang datos ang bawat bagyo o matinding init bawat araw.')}</p>
                <p>{text('Historical ERA5 reanalysis estimates via Open-Meteo; model errors were measured against withheld ERA5 months, not independent garden or station readings.', 'Mga historikal na tantya ng ERA5 reanalysis mula sa Open-Meteo; sinukat ang error laban sa inilaang mga buwan ng ERA5, hindi sa hiwalay na sukat sa taniman o istasyon.')}</p>
                <p>{text('Historical data', 'Historikal na datos')}: {monthLabel(outlook.source.history_start, filipino)} – {monthLabel(outlook.forecast_origin, filipino)}. {text('Forecast issued', 'Inilabas na pagtataya')}: <time dateTime={outlook.source.as_of}>{outlook.source.as_of}</time>.</p>
                <p>{text('Model', 'Modelo')}: SARIMA · {text('Test period', 'Panahon ng pagsusuri')}: {outlook.test_period} · {text(`1–3 months ahead, ${outlook.evaluation.temperature_mean_c.test.sarima.n} test months per target. Lower error is better.`, `1–3 buwan bago ang target, ${outlook.evaluation.temperature_mean_c.test.sarima.n} na buwan ng pagsusuri bawat target. Mas mainam ang mas mababang error.`)}</p>
                <div className="forecast-monthly-error-table" tabIndex={0} role="region" aria-label={text('Weather model comparison', 'Paghahambing ng modelo ng panahon')}>
                    <table><thead><tr><th scope="col">{text('Target / method', 'Target / paraan')}</th><th scope="col">MAE</th><th scope="col">RMSE</th></tr></thead><tbody>
                        {[['temperature_mean_c', text('Temperature', 'Temperatura'), '°C'], ['rainfall_total_mm', text('Rainfall', 'Ulan'), 'mm']].flatMap(([target, label, unit]) =>
                            [['sarima', 'SARIMA'], ['seasonal_naive', text('Same month last year', 'Parehong buwan noong nakaraang taon')], ['monthly_average', text('Historical monthly average', 'Historikal na buwanang average')]].map(([method, title]) =>
                                <tr key={`${target}-${method}`}><th scope="row">{label} · {title}</th><td>{number(outlook.evaluation[target].test[method].mae)} {unit}</td><td>{number(outlook.evaluation[target].test[method].rmse)} {unit}</td></tr>))}
                    </tbody></table>
                </div>
                <p>{text('No calibrated uncertainty range is published. Rainfall percentage errors were large in dry test months; use these estimates as experimental planning guidance.', 'Wala pang inilalathalang nasuring saklaw ng kawalang-katiyakan. Malaki ang porsiyento ng error sa ulan sa tuyong mga buwan ng pagsusuri; pang-eksperimentong gabay sa pagpaplano ang mga tantyang ito.')}</p>
                {Number.isFinite(outlook.evaluation.rainfall_total_mm.test.sarima.mape) && <p>{text('Rainfall MAPE', 'MAPE ng ulan')}: {number(outlook.evaluation.rainfall_total_mm.test.sarima.mape)}% · {outlook.evaluation.rainfall_total_mm.test.sarima.mape_n} {text('months with at least 1 mm actual rainfall.', 'buwan na may hindi bababa sa 1 mm na aktuwal na ulan sa ERA5.')}</p>}
                <p>{text(`ERA5 grid: ${outlook.source.grid_latitude}°, ${outlook.source.grid_longitude}°; resolution about 25 km. This is shared area guidance, not a separate forecast for each barangay.`, `Grid ng ERA5: ${outlook.source.grid_latitude}°, ${outlook.source.grid_longitude}°; lawak na mga 25 km. Pangkalahatang gabay ito sa lugar, hindi hiwalay na pagtataya para sa bawat barangay.`)}</p>
                <p>{text('Monthly weather advice does not change the crop ranking or SARIMA harvest estimates.', 'Hindi binabago ng buwanang payo sa panahon ang ranggo ng pananim o tantya ng ani ng SARIMA.')}</p>
                <a href={outlook.source.documentation_url} target="_blank" rel="noopener noreferrer">{text('Open-Meteo / ERA5 data and attribution', 'Datos at pagkilala sa Open-Meteo / ERA5')}<span className="sr-only"> {text('(opens in a new tab)', '(magbubukas sa bagong tab)')}</span></a>
            </details>
        </> : <p className="forecast-monthly-note" role="status">{outlook?.status === 'outdated'
            ? text('This monthly guide needs an update. Check the daily forecast and your crop’s growing guide before planting.', 'Kailangang i-update ang buwanang gabay. Tingnan ang pang-araw-araw na taya at gabay sa iyong pananim bago magtanim.')
            : text('Monthly weather guidance is currently unavailable. Check the daily weather forecast before planting.', 'Kasalukuyang walang buwanang gabay sa panahon. Tingnan ang pang-araw-araw na taya bago magtanim.')}</p>}
    </section>;
}
