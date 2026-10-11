import { useEffect, useState } from 'react';
import Icon from '../../Components/Storefront/Icon';
import { WeatherSymbol } from './WeatherArtwork';
import { weatherCondition } from './SellerLocale';

const manilaHour = () => Number(new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', hour: 'numeric', hourCycle: 'h23',
}).format(new Date()));

export default function HeaderSummary({ user, weather, filipino }) {
    const [hour, setHour] = useState(manilaHour);
    useEffect(() => {
        const refresh = () => setHour(manilaHour());
        const timer = window.setInterval(refresh, 60 * 1000);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, []);

    const greeting = hour < 12
        ? (filipino ? 'Magandang umaga' : 'Good morning')
        : hour < 18
            ? (filipino ? 'Magandang hapon' : 'Good afternoon')
            : (filipino ? 'Magandang gabi' : 'Good evening');
    const name = user.barangay || user.name.replace(/^Barangay\s+/i, '');
    const location = weather?.location || 'Pasig City';
    const hasTemperature = weather?.temperature_c !== null
        && weather?.temperature_c !== undefined
        && weather.temperature_c !== ''
        && Number.isFinite(Number(weather.temperature_c));
    const temperature = hasTemperature ? `${Math.round(Number(weather.temperature_c))}°C` : null;
    const unavailable = filipino ? 'Walang datos ng panahon' : 'Weather unavailable';
    const stale = filipino ? 'Huling update' : 'Last update';

    return <div className="seller-header-summary">
        <p className="seller-greeting">
            <span className="seller-greeting-prefix">{greeting}, </span>
            <span className="seller-greeting-name">{name}</span>
        </p>
        <div className="seller-header-weather" role="group"
            aria-label={hasTemperature ? `${location}: ${temperature}, ${weatherCondition(weather, filipino)}${weather.is_stale ? ` (${stale})` : ''}` : `${location}: ${unavailable}`}>
            <span className="seller-header-weather-location">{location}</span>
            <div className="seller-header-weather-reading">
                {hasTemperature ? <WeatherSymbol weather={weather} size={26} /> : <Icon name="pin" size={16} />}
                {hasTemperature ? <strong>{temperature}</strong> : <span className="seller-header-weather-unavailable">{unavailable}</span>}
                {hasTemperature && weather.is_stale && <span className="seller-header-weather-stale">{stale}</span>}
            </div>
        </div>
    </div>;
}
