import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import Icon from '../../Components/Storefront/Icon';
import { WeatherScene, WeatherSymbol } from './WeatherArtwork';
import { weatherCondition } from './SellerLocale';

const metricOptions = {
    temperature: { label: 'Temperature', field: 'temperature_c', unit: '°' },
    precipitation: { label: 'Precipitation', field: 'rain_chance_percent', unit: '%' },
    wind: { label: 'Wind', field: 'wind_kph', unit: ' km/h' },
};

function formatObservedAt(value, filipino) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function formatHour(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
    }).format(date);
}

function manilaDateKey(value = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(value);
    const part = type => parts.find(item => item.type === type)?.value;

    return `${part('year')}-${part('month')}-${part('day')}`;
}

function formatDay(value, todayKey, filipino) {
    if (value === todayKey) return filipino ? 'Ngayon' : 'Today';
    const date = new Date(`${value}T00:00:00+08:00`);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', {
        timeZone: 'Asia/Manila',
        weekday: 'short',
    }).format(date);
}

function formatForecastDate(value, filipino) {
    const date = new Date(`${value}T00:00:00+08:00`);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
    }).format(date);
}

function ForecastChart({ hours, metric, filipino }) {
    const option = metricOptions[metric];
    const optionLabel = filipino ? ({ temperature: 'Temperatura', precipitation: 'Posibilidad ng ulan', wind: 'Hangin' })[metric] : option.label;
    const samples = useMemo(() => hours.filter((_, index) => index % 3 === 0).slice(0, 8), [hours]);
    const values = samples.map(hour => Number(hour[option.field])).filter(Number.isFinite);

    if (samples.length < 2 || values.length !== samples.length) {
        return <div className="seller-weather-chart-empty">{filipino ? 'Hindi available ang oras-oras na taya' : 'Hourly forecast unavailable'}</div>;
    }

    const width = 640;
    const height = 112;
    const paddingX = 12;
    const paddingTop = 20;
    const paddingBottom = 8;
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const range = Math.max(maximum - minimum, 1);
    const points = values.map((value, index) => ({
        x: paddingX + (index * (width - (paddingX * 2))) / (values.length - 1),
        y: paddingTop + ((maximum - value) / range) * (height - paddingTop - paddingBottom),
        value,
    }));
    const line = points.map(point => `${point.x},${point.y}`).join(' ');
    const area = `${paddingX},${height} ${line} ${width - paddingX},${height}`;

    return <div className="seller-weather-chart" aria-label={filipino ? `Taya ng ${optionLabel.toLowerCase()} sa susunod na 24 oras` : `${option.label} forecast for the next 24 hours`}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
            <polygon className="seller-weather-area" points={area} />
            <polyline className="seller-weather-line" points={line} />
            {points.map((point, index) => <g key={`${samples[index].time}-${metric}`}>
                <circle cx={point.x} cy={point.y} r="2.5" />
                <text x={point.x} y={Math.max(11, point.y - 8)} textAnchor="middle">
                    {Math.round(point.value)}{option.unit}
                </text>
            </g>)}
        </svg>
        <div className="seller-weather-chart-labels">
            {samples.map(hour => <span key={hour.time}>{formatHour(hour.time)}</span>)}
        </div>
    </div>;
}

function DailyForecast({ days, selectedIndex, onSelect, todayKey, filipino }) {
    if (!days.length) return null;

    const visibleDays = days.slice(0, 8);

    return <section className="seller-weather-daily" aria-label={filipino ? 'Taya para sa walong araw' : 'Eight-day forecast'}>
        <div className="seller-weather-days">
            {visibleDays.map((day, index) => {
                const dayLabel = formatDay(day.date, todayKey, filipino);
                const condition = weatherCondition(day, filipino);
                const high = Math.round(Number(day.max_temperature_c));
                const low = Math.round(Number(day.min_temperature_c));
                const rain = Math.round(Number(day.rain_chance_percent));

                return <article className={selectedIndex === index ? 'is-selected' : ''} key={day.date}>
                    <button
                        type="button"
                        title={condition}
                        aria-label={filipino ? `${dayLabel}, ${formatForecastDate(day.date, true)}: ${condition}, pinakamataas na ${high} degree, pinakamababa na ${low} degree, ${rain}% posibilidad ng ulan` : `${dayLabel}, ${formatForecastDate(day.date, false)}: ${condition}, high ${high} degrees, low ${low} degrees, ${rain}% rain`}
                        aria-pressed={selectedIndex === index}
                        onClick={() => onSelect(index)}
                    >
                        <span className="seller-weather-day-label"><strong>{dayLabel}</strong><small>{formatForecastDate(day.date, filipino)}</small></span>
                        <WeatherSymbol weather={day} size={36} />
                        <span className="seller-weather-day-temperature"><b>{high}°</b><small>{low}°</small></span>
                        <em>{filipino ? `${rain}% ulan` : `${rain}% rain`}</em>
                    </button>
                </article>;
            })}
        </div>
    </section>;
}

export default function WeatherCard({ weather, onViewForecast, filipino = false }) {
    const [metric, setMetric] = useState('temperature');
    const [todayKey, setTodayKey] = useState(() => manilaDateKey());
    const [selectedDayIndex, setSelectedDayIndex] = useState(null);
    const hasWeather = weather
        && Number.isFinite(Number(weather.temperature_c))
        && Number.isFinite(Number(weather.humidity_percent))
        && Number.isFinite(Number(weather.rain_chance_percent));
    const observedAt = formatObservedAt(weather?.observed_at, filipino);
    const hours = Array.isArray(weather?.hourly) ? weather.hourly : [];
    const days = Array.isArray(weather?.daily)
        ? weather.daily.filter(day => typeof day.date === 'string' && day.date >= todayKey)
        : [];
    const todayDayIndex = days.findIndex(day => day.date === todayKey);
    const selectedDay = Number.isInteger(selectedDayIndex) ? days[selectedDayIndex] : null;
    const isCurrentSelection = !selectedDay || selectedDay.date === todayKey;
    const selectedWeather = isCurrentSelection ? weather : selectedDay;
    const selectedTemperature = isCurrentSelection
        ? Math.round(Number(weather?.temperature_c))
        : Math.round(Number(selectedDay?.max_temperature_c));
    const selectedLabel = isCurrentSelection ? (filipino ? 'Ngayon' : 'Now') : (filipino ? `Taya para sa ${formatDay(selectedDay.date, todayKey, true)}` : `${formatDay(selectedDay.date, todayKey, false)} forecast`);
    const selectedCondition = weatherCondition(selectedWeather, filipino);

    useEffect(() => {
        setSelectedDayIndex(todayDayIndex >= 0 ? todayDayIndex : null);
    }, [todayDayIndex, todayKey, weather?.observed_at]);

    useEffect(() => {
        let lastRefresh = Date.now();
        const refresh = () => {
            setTodayKey(manilaDateKey());
            if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < 30 * 60 * 1000) return;
            lastRefresh = Date.now();
            router.reload({ only: ['weather'], preserveScroll: true });
        };
        const timer = window.setInterval(refresh, 60 * 1000);
        document.addEventListener('visibilitychange', refresh);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, []);

    return <section className="seller-panel seller-weather" aria-labelledby="weather-card-title">
        <header className="seller-weather-header">
            <div>
                <h2 id="weather-card-title"><Icon name="sprout" size={25} />{filipino ? 'Panahon at lagay ng sakahan' : 'Weather & farm outlook'}</h2>
                <p><Icon name="pin" size={16} />{weather?.location || 'Pasig City'}</p>
            </div>
            {hasWeather && <div className="seller-weather-condition">
                <span>{selectedCondition}</span>
                <small>{observedAt ? (filipino ? `Huling update: ${observedAt}` : `Updated ${observedAt}`) : (filipino ? 'Kasalukuyang lagay ng panahon' : 'Current conditions')}</small>
            </div>}
        </header>

        {hasWeather ? <>
            <div className="seller-weather-hero">
                <div className="seller-weather-summary">
                    <span className="seller-weather-kicker">{selectedLabel}</span>
                    <div className="seller-weather-current">
                        <WeatherSymbol weather={selectedWeather} size={64} />
                        <strong>{selectedTemperature}<sup>°C</sup></strong>
                    </div>
                    {isCurrentSelection ? <dl>
                        <div><dt>{filipino ? 'Pakiramdam' : 'Feels like'}</dt><dd>{Number.isFinite(Number(weather.feels_like_c)) ? `${Math.round(Number(weather.feels_like_c))}°C` : '—'}</dd></div>
                        <div><dt>{filipino ? 'Ulan' : 'Rain'}</dt><dd>{Math.round(Number(weather.rain_chance_percent))}%</dd></div>
                        <div><dt>{filipino ? 'Halumigmig' : 'Humidity'}</dt><dd>{Math.round(Number(weather.humidity_percent))}%</dd></div>
                        <div><dt>{filipino ? 'Hangin' : 'Wind'}</dt><dd>{Number.isFinite(Number(weather.wind_kph)) ? `${Math.round(Number(weather.wind_kph))} km/h` : '—'}</dd></div>
                    </dl> : <dl>
                        <div><dt>{filipino ? 'Pinakamataas' : 'High'}</dt><dd>{Math.round(Number(selectedDay.max_temperature_c))}°C</dd></div>
                        <div><dt>{filipino ? 'Pinakamababa' : 'Low'}</dt><dd>{Math.round(Number(selectedDay.min_temperature_c))}°C</dd></div>
                        <div><dt>{filipino ? 'Ulan' : 'Rain'}</dt><dd>{Math.round(Number(selectedDay.rain_chance_percent))}%</dd></div>
                    </dl>}
                </div>
                <WeatherScene weather={selectedWeather} label={selectedCondition} filipino={filipino} />
            </div>

            <div className="seller-weather-detail-heading"><strong>{filipino ? 'Susunod na 24 oras' : 'Next 24 hours'}</strong><span>{filipino ? 'Pumili ng sukatan' : 'Choose a metric'}</span></div>
            <div className="seller-weather-tabs" role="tablist" aria-label={filipino ? 'Graph ng panahon' : 'Weather chart'}>
                {Object.entries(metricOptions).map(([key, option]) => <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={metric === key}
                    onClick={() => setMetric(key)}
                >{filipino ? ({ temperature: 'Temperatura', precipitation: 'Posibilidad ng ulan', wind: 'Hangin' })[key] : option.label}</button>)}
            </div>
            <ForecastChart hours={hours} metric={metric} filipino={filipino} />
            <DailyForecast days={days} selectedIndex={selectedDayIndex} onSelect={setSelectedDayIndex} todayKey={todayKey} filipino={filipino} />
        </> : <div className="seller-weather-unavailable">
            <WeatherSymbol weather={{ condition_key: 'cloudy' }} size={46} />
            <strong>{filipino ? 'Hindi available ang datos ng panahon' : 'Weather data unavailable'}</strong>
            <p>{filipino ? 'Subukan muli maya-maya. Available pa rin ang mga tool para sa sakahan at order.' : 'Try again shortly. Farm and order tools remain available.'}</p>
        </div>}

        <footer className="seller-weather-footer">
            <div>
                {weather?.provider === 'google'
                    ? <span className="gmp-weather-attribution" translate="no">Source: Includes weather data from Google</span>
                    : <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">{filipino ? 'Datos ng panahon mula sa Open-Meteo' : 'Weather data by Open-Meteo'}</a>}
                {hasWeather && weather.is_stale && <small>{filipino ? 'Ipinapakita ang pinakahuling naka-save na pagbasa' : 'Showing the latest cached reading'}</small>}
            </div>
            <button className="seller-text-link" onClick={onViewForecast}>{filipino ? 'Tingnan ang taya ng panahon' : 'View forecasting'} <Icon name="arrow" size={17} /></button>
        </footer>
    </section>;
}
