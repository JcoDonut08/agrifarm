import { useEffect, useId, useState } from 'react';

function addressLabel(feature, typedValue) {
    const place = feature.properties || {};
    const number = place.housenumber || typedValue.match(/^\s*(\d+[a-zA-Z-]*)\s+/)?.[1];
    const street = place.street || place.name;
    if (!street) return null;

    const firstLine = [number, street].filter(Boolean).join(' ');
    const area = place.city || place.district || place.county || 'Pasig City';
    return [firstLine, area, place.state].filter((part, index, parts) => part && parts.indexOf(part) === index).join(', ');
}

export default function AddressAutocomplete({ value, onChange, error, className = '', required = false }) {
    const id = useId();
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [loading, setLoading] = useState(false);
    const [selectedValue, setSelectedValue] = useState('');

    useEffect(() => {
        const query = value.trim();
        if (!open || query.length < 4 || query === selectedValue) {
            setSuggestions([]);
            setLoading(false);
            return;
        }

        setSuggestions([]);
        setLoading(true);
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ q: query, countrycode: 'PH', lat: '14.5764', lon: '121.0851', bbox: '121.02,14.52,121.14,14.65', limit: '5', lang: 'en' });
                const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: controller.signal });
                if (!response.ok) throw new Error('Address search unavailable');
                const data = await response.json();
                const options = (data.features || []).map(feature => addressLabel(feature, query)).filter(Boolean);
                setSuggestions([...new Set(options)]);
                setActive(-1);
            } catch (searchError) {
                if (searchError.name !== 'AbortError') setSuggestions([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 450);

        return () => { clearTimeout(timer); controller.abort(); };
    }, [value, open, selectedValue]);

    function selectAddress(address) {
        onChange(address);
        setSelectedValue(address);
        setSuggestions([]);
        setOpen(false);
        setActive(-1);
    }

    function handleKeyDown(event) {
        if (event.key === 'Escape') { setOpen(false); setActive(-1); return; }
        if (!suggestions.length) return;
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => (index + 1) % suggestions.length); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => index <= 0 ? suggestions.length - 1 : index - 1); }
        if (event.key === 'Enter' && active >= 0) { event.preventDefault(); selectAddress(suggestions[active]); }
    }

    const showList = open && suggestions.length > 0;

    return <div className={`address-suggest-field ${className}`}>
        <label htmlFor={id}>Complete address</label>
        <div className="address-suggest-control">
            <input id={id} type="text" value={value} onChange={event => { setSelectedValue(''); onChange(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={handleKeyDown} autoComplete="off" maxLength="500" placeholder="House number, street, city or landmark" role="combobox" aria-autocomplete="list" aria-expanded={showList} aria-controls={`${id}-suggestions`} aria-activedescendant={active >= 0 && showList ? `${id}-option-${active}` : undefined} aria-invalid={Boolean(error)} required={required} />
            <ul id={`${id}-suggestions`} className="address-suggest-list" role="listbox" hidden={!showList}>
                {suggestions.map((address, index) => <li id={`${id}-option-${index}`} key={address} role="option" aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => selectAddress(address)}>{address}</li>)}
                <li className="address-suggest-attribution" role="presentation">Suggestions from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>. Check the full address before saving.</li>
            </ul>
        </div>
        {loading && <span className="address-suggest-help" role="status">Finding addresses…</span>}
        {open && !loading && value.trim().length >= 4 && suggestions.length === 0 && value !== selectedValue && <span className="address-suggest-help">No matches yet. You can enter your address manually.</span>}
        {error && <small role="alert">{error}</small>}
    </div>;
}
