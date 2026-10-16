import { useId } from 'react';

function weatherKind(weather) {
    const key = `${weather?.condition_key || ''} ${weather?.condition || ''}`.toLowerCase();
    if (key.includes('thunder') || key.includes('storm')) return 'storm';
    if (key.includes('rain') || key.includes('shower') || key.includes('drizzle')) return 'rain';
    if (key.includes('fog') || key.includes('mist') || key.includes('haze')) return 'fog';
    if (key.includes('partly') || key.includes('mostly clear') || key.includes('mostly_clear')) return 'partly';
    if (key.includes('clear') || key.includes('sun')) return 'clear';
    return 'cloudy';
}

function KuyaAni({ kind, transform = 'translate(158 148)' }) {
    /* Kuya Ani: a small farmer mascot standing near the shed.
       Body: brown skin, green shirt, dark pants, straw hat.
       Pose changes by weather condition. */
    const wet = ['rain', 'storm'].includes(kind);
    return <g className="kuya-ani" transform={transform}>
        {/* Legs */}
        <path className="kuya-ani-pants" d="M-3 30l-2 14h4l2-14ZM3 30l2 14h4l-2-14Z" />
        {/* Boots */}
        <path className="kuya-ani-boots" d="M-6 43h6v3h-8ZM4 43h6v3h-8Z" />
        {/* Body / shirt */}
        <path className="kuya-ani-shirt" d="M-7 16c0-3 3-5 7-5s7 2 7 5v14h-14Z" />
        {/* Arms + accessory */}
        {wet ? <>
            {/* Holding umbrella */}
            <path className="kuya-ani-arm" d="M-7 20l-5-3M7 20l1-12" />
            {/* Umbrella */}
            <path className="kuya-ani-umbrella-pole" d="M8 8V-18" />
            <path className="kuya-ani-umbrella" d="M-6-18c0-12 28-12 28 0Z" />
        </> : kind === 'clear' ? <>
            {/* Waving hand */}
            <path className="kuya-ani-arm" d="M-7 20l-5 6" />
            <g transform="translate(7 18)">
                <g className="kuya-ani-wave">
                    <path className="kuya-ani-arm" d="M0 0l8-10" />
                    <circle className="kuya-ani-hand" cx="8" cy="-10" r="2.5" />
                </g>
            </g>
        </> : kind === 'fog' ? <>
            {/* Holding lantern */}
            <path className="kuya-ani-arm" d="M-7 20l-5 6M7 20l6 2" />
            {/* Lantern */}
            <rect className="kuya-ani-lantern" x="11" y="19" width="6" height="8" rx="1" />
            <circle className="kuya-ani-lantern-glow" cx="14" cy="23" r="2" />
            <path className="kuya-ani-lantern-handle" d="M12 19c0-3 4-3 4 0" />
        </> : <>
            {/* Watering can */}
            <path className="kuya-ani-arm" d="M-7 20l-5 6M7 20l7 0" />
            <path className="kuya-ani-can" d="M13 17h9v7h-9ZM22 18l5-4" />
            {/* Water drops from can */}
            <g className="kuya-ani-water"><path d="M26 16l1-2M28 15l1-3M30 16l1-2" /></g>
        </>}
        {/* Head */}
        <circle className="kuya-ani-head" cx="0" cy="6" r="7" />
        {/* Face */}
        <circle className="kuya-ani-eye" cx="-2.5" cy="5" r="1" />
        <circle className="kuya-ani-eye" cx="2.5" cy="5" r="1" />
        <path className="kuya-ani-smile" d="M-2 8c1 2 3 2 4 0" />
        {/* Hat */}
        {wet
            ? null /* No hat, umbrella covers him */
            : <g className="kuya-ani-hat">
                <ellipse cx="0" cy="-1" rx="10" ry="2.5" />
                <path d="M-6-1c0-6 12-6 12 0" />
            </g>}
    </g>;
}

export function WeatherSymbol({ weather, size = 48 }) {
    const kind = weatherKind(weather);
    const showSun = ['clear', 'partly'].includes(kind);
    const showCloud = kind !== 'clear';

    return <span className={`agrifarm-weather-symbol is-${kind}`} aria-hidden="true" style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64">
            {showSun && <g className="weather-symbol-sun">
                <path d="M19 4v6M19 32v6M3 21h6M29 21h6M7.7 9.7l4.2 4.2M26.1 28.1l4.2 4.2M30.3 9.7l-4.2 4.2" />
                <circle cx="19" cy="21" r="9" />
            </g>}
            {showCloud && <path className="weather-symbol-cloud" d="M15 48h34a10 10 0 0 0 1-19.9A15 15 0 0 0 21.4 25 11.5 11.5 0 0 0 15 48Z" />}
            {kind === 'fog' && <g className="weather-symbol-fog"><path d="M10 52h38M16 58h32" /></g>}
            {['rain', 'storm'].includes(kind) && <g className="weather-symbol-rain"><path d="m19 52-3 7M32 52l-3 7M45 52l-3 7" /></g>}
            {kind === 'storm' && <path className="weather-symbol-bolt" d="m35 42-8 12h7l-3 9 13-15h-7l5-6Z" />}
        </svg>
    </span>;
}

export function WeatherScene({ weather, label, filipino = false }) {
    const kind = weatherKind(weather);
    const wet = ['rain', 'storm'].includes(kind);
    const skyId = `farm-sky-${useId().replace(/:/g, '')}`;

    return <figure className={`agrifarm-weather-scene is-${kind}`}>
        <svg viewBox="0 0 720 280" role="img" aria-label={filipino ? `${label} sa isang urban farm sa Pasig` : `${label} over a Pasig urban farm`}>
            <defs>
                <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" className="farm-sky-top" />
                    <stop offset="1" className="farm-sky-bottom" />
                </linearGradient>
            </defs>
            <rect width="720" height="280" fill={`url(#${skyId})`} />
            {['clear', 'partly'].includes(kind) && <g className="farm-sun">
                <circle className="farm-sun-halo" cx="610" cy="57" r="46" />
                <circle className="farm-sun-disc" cx="610" cy="57" r="29" />
            </g>}
            {kind !== 'clear' && <g className="farm-clouds">
                <path className="farm-cloud-shadow" d="M440 74c4-16 22-22 35-15 6-28 48-31 60-3 18-9 40 6 36 24H440Z" />
                <path d="M432 67c4-16 22-22 35-15 6-28 48-31 60-3 18-9 40 6 36 24H432Z" />
                <path d="M75 49c4-12 18-16 29-10 5-21 35-24 45-4 15-6 30 4 29 18H75Z" />
            </g>}
            <g className="farm-skyline">
                <path d="M0 158v-39h38v39h19V96h34v62h17v-25h34v25h20v-53h40v53h23v-31h28v31h279v-29h31v29h17v-56h35v56h20v-34h38v34h17v-43h30v43h21v-25h23v25Z" />
                <path d="M74 96V81m-6 0h12m101 24V91m408 11V87m-6 0h12" />
                <g className="farm-skyline-windows"><path d="M65 109h5m9 0h5m-19 12h5m9 0h5m88-4h6m10 0h6m-22 13h6m10 0h6m382-16h5m9 0h5m-19 12h5m9 0h5" /></g>
            </g>
            <path className="farm-distant-hills" d="M0 151c101-22 133 11 229 2s131-30 216-16 157 34 275 6v64H0Z" />
            <path className="farm-near-hills" d="M0 170c100-14 150 10 239 1s164-19 245-4 159 2 236-9v59H0Z" />
            <g className="farm-tree-line">
                {[28, 57, 228, 259, 471, 500, 672, 702].map((x, index) => <g key={x} transform={`translate(${x} ${151 + index % 3 * 4})`}>
                    <path d="M0 3v25" /><path d="M-13 6c-4-9 2-17 8-17 1-14 20-14 21 0 15 2 13 22 0 24H-7c-5 0-8-3-6-7Z" />
                </g>)}
            </g>
            <path className="farm-ground" d="M0 181c159-13 287 1 411-1s218-9 309-3v103H0Z" />
            <g className="farm-fence">
                <path d="M15 182H705M15 191H705" />
                {[24, 64, 230, 270, 310, 350, 390, 430, 470, 510, 550, 590, 630, 670, 704].map(x => <path key={x} d={`M${x} 175v26`} />)}
            </g>
            <path className="farm-path" d="M231 201c72 11 114 28 126 79h105c-34-52-112-70-231-79Z" />
            <g className="farm-shed">
                <ellipse className="farm-shed-shadow" cx="132" cy="234" rx="69" ry="9" />
                <rect className="farm-shed-wall" x="86" y="165" width="91" height="67" rx="2" />
                <path className="farm-shed-cladding" d="M87 179h89M87 193h89M87 207h89M87 221h89" />
                <path className="farm-shed-roof" d="m73 169 58-48 60 48-7 10-53-41-51 41Z" />
                <path className="farm-shed-roof-seam" d="m88 162 43-35 45 35" />
                <rect className="farm-shed-door" x="139" y="188" width="24" height="44" rx="2" />
                <rect className="farm-shed-window" x="99" y="183" width="25" height="24" rx="2" />
                <path className="farm-window-frame" d="M111.5 184v22M100 195h23" />
                <circle className="farm-door-handle" cx="157" cy="211" r="2" />
            </g>
            <KuyaAni kind={kind} transform="translate(210 174) scale(1.2)" />
            <g className="farm-beds">
                <path className="farm-bed-side" d="m259 220 126-21 61 32v10l-131 26-56-35Z" />
                <path className="farm-bed" d="m259 220 126-21 61 32-131 25Z" />
                <path className="farm-bed-side" d="m452 212 123-20 82 35v12l-132 24-73-39Z" />
                <path className="farm-bed" d="m452 212 123-20 82 35-132 24Z" />
                <path className="farm-furrow" d="m284 225 104-19m-78 32 104-20m66 5 102-18m-71 31 108-19" />
            </g>
            <g className="farm-plants">
                {[[284, 210], [320, 204], [356, 198], [318, 231], [354, 224], [390, 217], [482, 201], [518, 195], [554, 189], [523, 223], [560, 216], [596, 209]].map(([x, y], index) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                    <g className="farm-plant">
                        <path d="M0 13V-2" />
                        <path d={index % 3 === 0 ? 'M0 6C-17 6-18-9-6-6L0 1C5-13 19-7 13 2 10 6 4 7 0 6Z' : 'M0 4C-16 4-18-10-6-8L0-2C5-15 19-8 13 0 10 5 4 6 0 4Z'} />
                        <path className="farm-leaf-vein" d="m-7-3 7 7 7-6" />
                    </g>
                </g>)}
            </g>
            <g className="farm-sign" transform="translate(664 190)">
                <path d="M13 24v37" />
                <rect width="37" height="30" rx="4" />
                <path d="M18 23V10m0 5c-10 0-11-9 0-7m0 11c10 0 11-9 0-7" />
            </g>
            <g className="farm-foreground-grass"><path d="m15 267 3-12m-1 10-7-5m8 5 7-9m36 17 1-12m0 7-7-4m8 3 6-8m612 12 2-13m0 7 6-6m-7 7-7-4" /></g>
            {wet && <g className="farm-puddles"><ellipse cx="219" cy="246" rx="31" ry="5" /><ellipse cx="679" cy="263" rx="23" ry="4" /></g>}
            {wet && <g className="farm-rain" aria-hidden="true">
                <g>{[35, 92, 151, 214, 278, 342, 405, 468, 526, 585, 642, 694].map((x, index) => <path key={x} d={`M${x} ${8 + index % 3 * 14}l-10 24`} />)}</g>
                <g>{[58, 124, 188, 248, 313, 378, 438, 501, 557, 617, 672].map((x, index) => <path key={x} d={`M${x} ${90 + index % 2 * 26}l-10 24`} />)}</g>
            </g>}
            {kind === 'storm' && <path className="farm-lightning" d="m365 30-24 42h19l-13 39 43-54h-22l18-27Z" />}
            {kind === 'fog' && <g className="farm-fog"><path d="M20 79h230M310 57h285M420 109h270" /></g>}
        </svg>
    </figure>;
}
