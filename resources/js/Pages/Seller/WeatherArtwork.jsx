function weatherKind(weather) {
    const key = `${weather?.condition_key || ''} ${weather?.condition || ''}`.toLowerCase();
    if (key.includes('thunder') || key.includes('storm')) return 'storm';
    if (key.includes('rain') || key.includes('shower') || key.includes('drizzle')) return 'rain';
    if (key.includes('fog') || key.includes('mist') || key.includes('haze')) return 'fog';
    if (key.includes('partly') || key.includes('mostly clear') || key.includes('mostly_clear')) return 'partly';
    if (key.includes('clear') || key.includes('sun')) return 'clear';
    return 'cloudy';
}

function KuyaAni({ kind }) {
    /* Kuya Ani: a small farmer mascot standing near the shed.
       Body: brown skin, green shirt, dark pants, straw hat.
       Pose changes by weather condition. */
    const wet = ['rain', 'storm'].includes(kind);
    return <g className="kuya-ani" transform="translate(158 148)">
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
            <path className="kuya-ani-arm" d="M-7 20l-5 6M7 18l8-10" />
            {/* Waving hand circle */}
            <circle className="kuya-ani-hand" cx="15" cy="8" r="2.5" />
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

    return <div className={`agrifarm-weather-scene is-${kind}`} role="img" aria-label={filipino ? `${label} sa isang urban farm sa Pasig` : `${label} over a Pasig urban farm`}>
        <svg viewBox="0 0 720 210" preserveAspectRatio="xMidYMid slice">
            <defs>
                <linearGradient id="farm-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" className="farm-sky-top" />
                    <stop offset="1" className="farm-sky-bottom" />
                </linearGradient>
                <linearGradient id="farm-hill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={wet ? '#4d735e' : '#6f9c6d'} />
                    <stop offset="1" stopColor={wet ? '#315540' : '#416f4c'} />
                </linearGradient>
                <linearGradient id="farm-ground" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={wet ? '#345641' : '#497951'} />
                    <stop offset=".55" stopColor={wet ? '#274936' : '#356541'} />
                    <stop offset="1" stopColor={wet ? '#1f3c2d' : '#294f35'} />
                </linearGradient>
                <linearGradient id="farm-roof" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#a56343" />
                    <stop offset="1" stopColor="#653a2d" />
                </linearGradient>
                <linearGradient id="farm-wall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#e6c98d" />
                    <stop offset="1" stopColor="#b98d5e" />
                </linearGradient>
                <radialGradient id="farm-puddle">
                    <stop offset="0" stopColor="#a6cbd0" stopOpacity=".7" />
                    <stop offset="1" stopColor="#6d9293" stopOpacity=".15" />
                </radialGradient>
            </defs>
            <rect width="720" height="210" fill="url(#farm-sky)" />
            <ellipse className="farm-sky-haze" cx="360" cy="119" rx="390" ry="42" />
            {kind === 'clear' && <g className="farm-sun"><circle cx="605" cy="46" r="25" /><circle cx="605" cy="46" r="36" /></g>}
            {kind === 'partly' && <g className="farm-sun"><circle cx="590" cy="45" r="22" /><circle cx="590" cy="45" r="31" /></g>}
            {kind !== 'clear' && <g className="farm-clouds">
                <path className="farm-cloud-shadow" d="M419 68c8-25 40-30 57-12 16-19 54-11 58 15 18 0 27 7 29 19H402c0-12 6-19 17-22Z" />
                <path d="M424 61c8-22 40-26 55-9 18-17 52-6 53 18 17 0 25 7 27 17H408c0-12 5-21 16-26Z" />
                <path className="farm-cloud-shadow" d="M78 50c7-18 30-23 44-10 13-13 42-5 44 16 13 0 20 5 22 14H65c0-10 5-17 13-20Z" />
                <path d="M82 45c7-17 30-20 42-7 15-12 39-3 40 16 13 0 19 5 21 13H69c0-10 4-17 13-22Z" />
            </g>}
            <g className="farm-skyline">
                <path d="M0 128h43v-25h23v25h34V82h40v46h26v-20h42v20h32V92h34v36h34v-31h26v31h386v30H0Z" />
                <path d="M120 82V61M113 61h14M257 92V69M320 97V77" />
                <g className="farm-skyline-windows"><path d="M109 94h7m9 0h7m-23 12h7m9 0h7M248 104h7m9 0h7" /></g>
            </g>
            <path className="farm-distant-hills" d="M0 132c83-30 148-14 216 2 79 18 150-28 240-16 72 10 130 36 264 8v49H0Z" />
            <path className="farm-near-hills" fill="url(#farm-hill)" d="M0 146c92-17 163 11 242 4 87-8 139-29 232-11 83 16 155 14 246-5v45H0Z" />
            <g className="farm-tree-line">{[18, 42, 185, 205, 382, 405, 612, 635, 660].map((x, index) => <g key={x} transform={`translate(${x} ${137 + (index % 3) * 4})`}><path d="M8 2v17" /><circle cx="8" cy="1" r="9" /><circle cx="2" cy="7" r="7" /><circle cx="14" cy="7" r="7" /></g>)}</g>
            <rect y="151" width="720" height="59" fill="url(#farm-ground)" />
            <g className="farm-shed">
                <ellipse className="farm-shed-shadow" cx="119" cy="199" rx="52" ry="7" />
                <rect className="farm-shed-wall" x="83" y="149" width="72" height="48" fill="url(#farm-wall)" />
                <path className="farm-shed-roof" fill="url(#farm-roof)" d="m70 153 49-37 50 37-8 7-42-31-41 31Z" />
                <rect className="farm-shed-door" x="113" y="169" width="20" height="28" />
                <rect className="farm-shed-window" x="90" y="158" width="16" height="14" rx="1" />
                <path className="farm-window-frame" d="M98 158v14M90 165h16" />
                <path className="farm-shed-trim" d="M84 181h70M119 129v-10" />
                <circle className="farm-door-handle" cx="128" cy="183" r="1.5" />
            </g>
            <KuyaAni kind={kind} />
            <g className="farm-beds">
                <path className="farm-bed" d="m186 177 163-19 101 34-176 18Z" />
                <path className="farm-bed" d="m419 174 120-14 112 32-129 18Z" />
                <path className="farm-furrow" d="m215 181 139-17M246 191l143-18M279 202l146-17M449 178l93-12M480 188l101-15M519 199l105-17" />
            </g>
            {wet && <g className="farm-puddles"><ellipse cx="187" cy="199" rx="37" ry="5" fill="url(#farm-puddle)" /><ellipse cx="677" cy="184" rx="24" ry="4" fill="url(#farm-puddle)" /></g>}
            <g className="farm-plants">
                {[[219, 174], [258, 178], [301, 182], [346, 187], [456, 173], [492, 178], [531, 181], [570, 187], [608, 191]].map(([x, y]) => <g key={x} transform={`translate(${x} ${y})`}>
                    <g className="farm-plant">
                        <path d="M0 15V0" />
                        <path d="M0 7C-15 6-15-5 0 0M0 10c15 0 15-11 0-5" />
                    </g>
                </g>)}
            </g>
            <g className="farm-sign" transform="translate(650 139)">
                <path d="M13 24v34" />
                <rect width="48" height="29" rx="5" />
                <path d="M23 21V9m0 5c-9 0-10-7 0-6m0 8c9 0 10-7 0-6" />
            </g>
            <g className="farm-foreground-grass"><path d="M12 210c2-15 2-22-2-31m4 31c5-13 10-19 18-25m-4 25c0-10 4-17 12-23M688 210c-2-16-1-24 5-34m-2 34c6-15 12-21 21-27m-8 27c1-11 6-18 13-22" /></g>
            {wet && <g className="farm-rain" aria-hidden="true">
                <g>{[35, 92, 151, 214, 278, 342, 405, 468, 526, 585, 642, 694].map((x, index) => <path key={x} d={`M${x} ${8 + ((index % 3) * 14)}l-15 38`} />)}</g>
                <g>{[58, 124, 188, 248, 313, 378, 438, 501, 557, 617, 672].map((x, index) => <path key={x} d={`M${x} ${72 + ((index % 2) * 18)}l-15 38`} />)}</g>
            </g>}
            {kind === 'storm' && <path className="farm-lightning" d="m365 18-24 42h19l-13 39 43-54h-22l18-27Z" />}
            {kind === 'fog' && <g className="farm-fog"><path d="M20 79h230M310 57h285M420 99h270" /></g>}
        </svg>
        <span className="agrifarm-weather-scene-caption"><strong>{filipino ? 'Lagay ng urban farm' : 'Urban farm conditions'}</strong><small>{filipino ? (wet ? 'Takpan ang mga inaning produkto at suriin ang daluyan ng tubig.' : 'Gamitin ang taya sa pagpaplano ng pagdidilig at pag-aani.') : (wet ? 'Keep harvested produce covered and check drainage.' : 'Use the outlook to plan watering and harvest work.')}</small></span>
    </div>;
}
