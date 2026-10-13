import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

// Only show placeholders for real foreground GET visits, after a short flicker guard.
export default function usePageLoading(acceptVisit = () => true) {
    const [visit, setVisit] = useState(null);
    const accept = useRef(acceptVisit);
    accept.current = acceptVisit;

    useEffect(() => {
        let activeId = null;
        let timer;
        const clear = () => {
            window.clearTimeout(timer);
            activeId = null;
            setVisit(null);
        };
        const stopStart = router.on('start', ({ detail }) => {
            const next = detail.visit;
            if (next.prefetch || next.async) return;
            clear();
            if (next.method !== 'get' || !accept.current(next)) return;
            activeId = next.id;
            timer = window.setTimeout(() => setVisit(next), 160);
        });
        const stopFinish = router.on('finish', ({ detail }) => {
            if (detail.visit.id === activeId) clear();
        });
        return () => {
            window.clearTimeout(timer);
            stopStart();
            stopFinish();
        };
    }, []);

    return visit;
}
