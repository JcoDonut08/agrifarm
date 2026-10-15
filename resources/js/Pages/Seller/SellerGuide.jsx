import { useEffect, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import '../../../css/seller-guide.css';

const steps = [
    { image: 'welcome', section: 'Dashboard', target: '.seller-dashboard-stats', align: 'start',
        title: ['Welcome to your store!', 'Maligayang pagdating sa iyong tindahan!'],
        body: ['I’m Kuya Ani! I’ll show you where to manage your products, orders, harvest forecasts, and reports. Your dashboard gives you a quick view of sales, pending orders, and stock.', 'Ako si Kuya Ani! Ipapakita ko kung saan pamamahalaan ang mga produkto, order, pagtataya ng ani, at ulat. Makikita sa dashboard ang benta, mga naghihintay na order, at stock.'] },
    { image: 'products', section: 'Products', target: '.product-page-heading',
        title: ['Add your products', 'Idagdag ang iyong mga produkto'],
        body: ['Use Add product to upload a photo and enter the price, selling unit, and available stock. Keep stock accurate so customers know what they can order.', 'Gamitin ang Magdagdag ng produkto para maglagay ng larawan, presyo, unit, at available na stock. Panatilihing tama ang stock para malinaw sa customer ang maaaring orderin.'] },
    { image: 'orders', section: 'Orders', target: '.orders-page-heading', align: 'start',
        title: ['Keep orders moving', 'Asikasuhin ang mga order'],
        body: ['Review incoming orders here, then update their status as you prepare and deliver them. You can also record walk-in sales, so your stock and sales records stay up to date.', 'Suriin dito ang mga bagong order at i-update ang status habang inihahanda at inihahatid. Maaari ring magtala ng walk-in na benta para updated ang stock at tala ng benta.'] },
    { image: 'forecasting', section: 'Forecasting', target: '.forecast-upload-panel',
        title: ['Plan with harvest forecasts', 'Magplano gamit ang pagtataya ng ani'],
        body: ['Upload harvest records as CSV or Excel, then choose Generate. Download the sample to check the required format. Use the estimated harvest and planting suggestions as a planning guide; actual results can vary.', 'Mag-upload ng tala ng ani bilang CSV o Excel, saka piliin ang Bumuo. I-download ang sample para makita ang tamang format. Gabay sa pagpaplano ang tantyang ani at mungkahing pagtatanim; maaaring mag-iba ang aktuwal na resulta.'] },
    { image: 'reports', section: 'Reports', target: '.report-generator', align: 'center',
        title: ['Create and download reports', 'Gumawa at mag-download ng ulat'],
        body: ['Choose a report type and date range, review the preview, then export in your preferred available format. Reports use your recorded store activity, so an empty period may have no rows.', 'Pumili ng uri ng ulat at saklaw ng petsa, suriin ang preview, saka i-export sa available na format. Naitalang gawain ng tindahan ang gamit ng ulat, kaya maaaring walang laman ang napiling panahon.'] },
    { image: 'settings', section: 'Settings', target: '.seller-language-settings', align: 'center',
        title: ['Make the workspace yours', 'Iangkop ang iyong workspace'],
        body: ['Choose English or Filipino, select a light, dark, or system theme, and adjust order, low-stock, and weather alerts. To revisit this tour later, use Replay seller guide here in Settings.', 'Pumili ng English o Filipino, maliwanag, madilim, o system na tema, at mga abiso para sa order, stock, at panahon. Para balikan ang gabay, piliin ang Ulitin ang gabay dito sa Mga Setting.'] },
    { image: 'finished', section: 'Products', target: '.product-page-heading',
        title: ['You’re ready to get started!', 'Handa ka nang magsimula!'],
        body: ['Start with your product listings. You can replay this guide anytime from Settings.', 'Magsimula sa iyong mga produkto. Maaari mong ulitin ang gabay anumang oras mula sa Mga Setting.'] },
];

function placeCard(target, card, align = 'end') {
    const margin = 20;
    const gap = 22;
    const preferredLeft = align === 'start' ? target.left : align === 'center' ? target.left + (target.width - card.width) / 2 : target.right - card.width;
    const left = Math.max(margin, Math.min(preferredLeft, innerWidth - card.width - margin));
    const candidates = [
        { left, top: target.bottom + gap },
        { left: target.right + gap, top: target.top },
        { left: target.left - card.width - gap, top: target.top },
        { left, top: target.top - card.height - gap },
    ];
    const fits = position => position.left >= margin && position.top >= margin && position.left + card.width <= innerWidth - margin && position.top + card.height <= innerHeight - margin;
    return candidates.find(fits) || { left, top: Math.max(margin, innerHeight - card.height - margin) };
}

export default function SellerGuide({ pending, filipino, navigate, onClose }) {
    const [step, setStep] = useState(0);
    const [spotlight, setSpotlight] = useState(null);
    const [placement, setPlacement] = useState(null);
    const card = useRef(null);
    const dialog = useRef(null);
    const heading = useRef(null);
    const { post, processing, errors } = useForm({});
    const current = steps[step];
    const language = filipino ? 1 : 0;
    const text = (english, tagalog) => filipino ? tagalog : english;
    const last = step === steps.length - 1;

    useEffect(() => {
        const element = dialog.current;
        const previousFocus = document.activeElement;
        const overflow = document.body.style.overflow;
        element.showModal();
        document.body.style.overflow = 'hidden';
        return () => {
            element.close();
            document.body.style.overflow = overflow;
            requestAnimationFrame(() => {
                const target = previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : document.querySelector('.seller-main h1, .seller-main h2');
                if (target) { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
            });
        };
    }, []);

    useEffect(() => {
        setSpotlight(null);
        navigate(current.section);
        let frame;
        let observer;
        const measure = () => {
            const target = document.querySelector(`.seller-main ${current.target}`);
            if (!target) return;
            const bounds = target.getBoundingClientRect();
            const bottom = Math.min(innerHeight - 12, bounds.bottom + 6);
            setSpotlight({ left: Math.max(6, bounds.left - 6), top: Math.max(6, bounds.top - 6), width: Math.min(innerWidth - 12, bounds.width + 12), height: Math.max(0, bottom - Math.max(6, bounds.top - 6)) });
            setPlacement(innerWidth > 800 && card.current ? placeCard(bounds, card.current.getBoundingClientRect(), current.align) : null);
        };
        const reveal = () => {
            document.querySelector(`.seller-main ${current.target}`)?.scrollIntoView({ block: 'start', behavior: 'instant' });
            window.scrollBy({ top: innerHeight < 600 ? -16 : -100, left: 0, behavior: 'instant' });
            measure();
        };
        frame = requestAnimationFrame(() => {
            reveal();
            const target = document.querySelector(`.seller-main ${current.target}`);
            observer = new ResizeObserver(measure);
            if (target) observer.observe(target);
            if (card.current) observer.observe(card.current);
            frame = requestAnimationFrame(measure);
            heading.current?.focus({ preventScroll: true });
        });
        window.addEventListener('resize', reveal);
        window.addEventListener('scroll', measure, true);
        return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', reveal); window.removeEventListener('scroll', measure, true); };
    }, [step, current, navigate]);

    function close(start = false) {
        if (processing) return;
        const finish = () => { onClose(); navigate(start ? 'Products' : current.section); };
        if (!pending) { finish(); return; }
        post('/seller/guide/dismiss', { preserveScroll: true, preserveState: true, onSuccess: finish });
    }

    return <dialog ref={dialog} className="seller-guide" aria-labelledby="seller-guide-title" aria-describedby="seller-guide-description" onCancel={event => { event.preventDefault(); close(); }}>
        <div className={`seller-guide-shade${spotlight ? ' has-spotlight' : ''}`} />
        {spotlight && spotlight.height > 0 && <div className="seller-guide-spotlight" style={spotlight} aria-hidden="true" />}
        <div ref={card} className={`seller-guide-card${placement ? ' is-positioned' : ''}`} style={placement ? { '--guide-left': `${placement.left}px`, '--guide-top': `${placement.top}px` } : undefined}>
            <img className="seller-guide-character" src={`/images/seller-guide/kuya-ani-${current.image}.png`} alt="" />
            <section className="seller-guide-bubble" aria-busy={processing}>
                <div className="seller-guide-meta"><span>Kuya Ani · {step + 1} / {steps.length}</span><button type="button" disabled={processing} onClick={() => close()}>{text('Skip guide', 'Laktawan')}</button></div>
                <h2 id="seller-guide-title" ref={heading} tabIndex={-1}>{current.title[language]}</h2>
                <p id="seller-guide-description">{current.body[language]}</p>
                {Object.keys(errors).length > 0 && <p role="alert" className="seller-guide-error">{text('Could not save your preference. Please try again.', 'Hindi na-save ang iyong setting. Pakisubukan muli.')}</p>}
                <div className="seller-guide-actions"><button type="button" disabled={step === 0 || processing} onClick={() => setStep(value => value - 1)}>{text('Back', 'Bumalik')}</button><button type="button" className="seller-guide-next" disabled={processing} onClick={() => last ? close(true) : setStep(value => value + 1)}>{processing ? text('Saving…', 'Sine-save…') : last ? text('Go to products', 'Pumunta sa produkto') : text('Next', 'Susunod')}</button></div>
            </section>
        </div>
    </dialog>;
}
