import { useState, useRef, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import Icon from './Icon';
import { marketHref } from './catalog';
import { useShop } from './ShopContext';
import { chatbotIntent } from './chatbotIntents';

export default function HelpWidget() {
    const user = usePage().props.auth?.user;
    const { filipino } = useShop();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [awaitingReference, setAwaitingReference] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef(null);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const launcherRef = useRef(null);
    const closeRef = useRef(null);
    const lookupGeneration = useRef(0);
    const requestRef = useRef(null);
    const text = (english, tagalog) => filipino ? tagalog : english;
    const backOption = { id: 'reset', label: text('Back to menu', 'Bumalik sa menu') };
    const initialOptions = [
        { id: 'order', label: text('Check my order', 'Suriin ang Order'), icon: 'package' },
        { id: 'faqs', label: text('Common questions', 'Mga karaniwang tanong'), icon: 'help' },
        { id: 'products', label: text('Browse products', 'Tingnan ang produkto'), icon: 'cart', href: marketHref() },
        { id: 'contact', label: text('Contact AgriFarm', 'Makipag-ugnayan'), icon: 'message', href: '/contact' },
    ];
    const faqOptions = [
        { id: 'faq-what', label: text('What is AgriFarm?', 'Ano ang AgriFarm?') },
        { id: 'faq-ordering', label: text('How do I order?', 'Paano umorder?') },
        { id: 'faq-payment', label: text('How do I pay?', 'Paano magbayad?') },
        { id: 'faq-grow', label: text('What can I buy?', 'Anong mabibili?') },
        { id: 'faq-join', label: text('How can I join?', 'Paano sumali?') },
        backOption,
    ];
    const orderOptions = [
        { id: 'order-reference', label: text('Check another order', 'Tingnan ang ibang order') },
        { id: 'view-orders', label: text('View my orders', 'Mga order ko'), href: '/customer/orders' },
        backOption,
    ];
    const faqAnswers = {
        'faq-what': text('AgriFarm connects customers with urban farmers in Pasig City. Browse local produce, save your favorites, and place orders through the marketplace.', 'Iniuugnay ng AgriFarm ang mga mamimili at urban farmer sa Pasig City. Mamili ng lokal na ani, mag-save ng mga paborito, at umorder sa marketplace.'),
        'faq-ordering': text('Browse the marketplace, add available products to your cart, then open your cart and continue to checkout. Review your delivery details and total before placing your order.', 'Mamili sa marketplace at idagdag sa cart ang mga produkto. Buksan ang cart at magpatuloy sa checkout. Suriin ang detalye ng delivery at kabuuang halaga bago umorder.'),
        'faq-payment': text('Cash on delivery (COD) is available at checkout. Review the final total before placing your order.', 'Maaaring magbayad sa pamamagitan ng cash on delivery (COD). Suriin ang kabuuang halaga bago umorder.'),
        'faq-grow': text('Find vegetables, fruits, herbs, and beans in the marketplace. Each listing shows its price, selling unit, and available quantity. Check the current listings for what is available.', 'May mga gulay, prutas, herbs, at beans sa marketplace. Makikita sa bawat listing ang presyo, yunit, at dami. Tingnan ang kasalukuyang mga listing para sa available na ani.'),
        'faq-join': text('Create a customer account to shop on AgriFarm. To ask about joining as an urban farmer or seller, contact AgriFarm through the Contact page.', 'Gumawa ng customer account para mamili sa AgriFarm. Para magtanong tungkol sa pagsali bilang urban farmer o seller, makipag-ugnayan sa Contact page.'),
    };

    function cancelLookup() {
        lookupGeneration.current += 1;
        requestRef.current?.abort();
        requestRef.current = null;
    }

    useEffect(() => {
        setMessages([]);
        setIsLoading(false);
        setAwaitingReference(false);
        setInputValue('');
        return cancelLookup;
    }, [user?.id, filipino]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = messages.length ? scrollRef.current.scrollHeight : 0;
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen) closeRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const element = containerRef.current;
        const viewport = window.visualViewport;
        const fitViewport = () => {
            const height = viewport?.height ?? window.innerHeight;
            element.style.setProperty('--chat-viewport-height', `${height}px`);
            element.style.setProperty('--chat-keyboard-inset', `${Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0))}px`);
        };
        fitViewport();
        viewport?.addEventListener('resize', fitViewport);
        viewport?.addEventListener('scroll', fitViewport);
        window.addEventListener('resize', fitViewport);
        return () => {
            viewport?.removeEventListener('resize', fitViewport);
            viewport?.removeEventListener('scroll', fitViewport);
            window.removeEventListener('resize', fitViewport);
            element.style.removeProperty('--chat-viewport-height');
            element.style.removeProperty('--chat-keyboard-inset');
        };
    }, [isOpen]);

    useEffect(() => {
        if (awaitingReference) inputRef.current?.focus();
    }, [awaitingReference]);

    function closeAssistant() {
        setIsOpen(false);
        window.requestAnimationFrame(() => launcherRef.current?.focus());
    }

    function resetConversation() {
        cancelLookup();
        setMessages([]);
        setIsLoading(false);
        setAwaitingReference(false);
        setInputValue('');
    }

    function addMessage(sender, message, options = [], order = null) {
        setMessages(previous => [...previous, { sender, text: message, options, order }]);
    }

    function promptSignIn() {
        setAwaitingReference(false);
        addMessage('bot', text('Sign in to check your orders.', 'Mag-sign in para makita ang iyong mga order.'), [
            { id: 'login', label: text('Sign in', 'Mag-sign in'), href: '/login' }, backOption,
        ]);
    }

    const statusLabels = {
        pending: text('Pending', 'Nakabinbin'), reservation: text('Reserved', 'Nakareserba'),
        preparing: text('Preparing', 'Inihahanda'), out_for_delivery: text('Out for delivery', 'Nasa biyahe'),
        delivered: text('Delivered', 'Na-deliver'), cancelled: text('Cancelled', 'Kinansela'),
        processing: text('Processing', 'Pinoproseso'), mixed: text('Item statuses vary', 'Magkakaiba ang status'),
        active_multiple: text('Active orders', 'Mga aktibong order'),
    };

    async function lookupOrder(reference = null) {
        if (!user) { promptSignIn(); return; }
        if (user.role !== 'customer') {
            setAwaitingReference(false);
            addMessage('bot', text('Sign in with a customer account to check your orders.', 'Mag-sign in gamit ang customer account para makita ang iyong mga order.'), [backOption]);
            return;
        }
        cancelLookup();
        const generation = lookupGeneration.current;
        const controller = new AbortController();
        requestRef.current = controller;
        setIsLoading(true);
        setAwaitingReference(false);
        try {
            const url = reference ? `/api/chatbot/order-status?reference=${encodeURIComponent(reference)}` : '/api/chatbot/latest-order';
            const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
            if (generation !== lookupGeneration.current) return;
            if (response.status === 401) { promptSignIn(); return; }
            if (response.status === 403 || response.status === 429) {
                addMessage('bot', response.status === 403
                    ? text('Sign in with a customer account to check your orders.', 'Mag-sign in gamit ang customer account para makita ang iyong mga order.')
                    : text('Too many requests. Wait a moment and try again.', 'Masyadong maraming pagsubok. Maghintay sandali bago subukan muli.'), [backOption]);
                return;
            }
            if (!response.ok) throw new Error('Order lookup failed');
            const data = await response.json();
            if (generation !== lookupGeneration.current) return;
            if (data.status === 'not_found') {
                addMessage('bot', reference
                    ? text('Sorry, I could not find any order matching that.', 'Paumanhin, wala akong mahanap na order na tumutugma doon.')
                    : text('You do not have any recent orders in the system.', 'Wala kang anumang kamakailang order sa system.'), orderOptions);
            } else {
                addMessage('bot', text('Here is the latest recorded status.', 'Narito ang pinakabagong naitalang status.'), orderOptions, data);
            }
        } catch (error) {
            if (generation !== lookupGeneration.current || error.name === 'AbortError') return;
            addMessage('bot', text('There was a problem retrieving your order. Please try again.', 'Nagkaroon ng problema sa pagkuha ng iyong order. Subukan muli.'), [
                { id: 'retry-order', label: text('Try again', 'Subukan muli'), reference }, backOption,
            ]);
        } finally {
            if (generation === lookupGeneration.current) { setIsLoading(false); requestRef.current = null; }
        }
    }

    function respond(option, showChoice = true) {
        if (option.id === 'reset') { resetConversation(); return; }
        if (isLoading) return;
        if (showChoice) addMessage('user', option.label);
        if (option.id === 'order' || option.id === 'retry-order') { lookupOrder(option.reference || null); return; }
        setAwaitingReference(false);
        if (option.id === 'order-reference') {
            if (!user) { promptSignIn(); return; }
            if (user.role !== 'customer') return;
            addMessage('bot', text('Enter an Order ID from your orders:', 'Ilagay ang Order ID mula sa iyong mga order:'), [backOption]);
            setAwaitingReference(true);
        } else if (option.id === 'faqs') {
            addMessage('bot', text('What would you like to know?', 'Ano ang gusto mong malaman?'), faqOptions);
        } else if (faqAnswers[option.id]) {
            const links = option.id === 'faq-join' ? [initialOptions[3]] : ['faq-grow', 'faq-ordering'].includes(option.id) ? [initialOptions[2]] : [];
            addMessage('bot', faqAnswers[option.id], [...links, ...faqOptions]);
        } else if (option.id === 'products') {
            addMessage('bot', text('Browse current listings, or use the marketplace search and filters to find produce.', 'Tingnan ang mga listing o gamitin ang search at mga filter sa marketplace para maghanap ng ani.'), [initialOptions[2], backOption]);
        } else if (option.id === 'contact') {
            addMessage('bot', text('You can reach AgriFarm through the Contact page.', 'Maaari kang makipag-ugnayan sa AgriFarm sa Contact page.'), [initialOptions[3], backOption]);
        } else {
            addMessage('bot', option.id === 'greeting'
                ? text('Hello! How can I help you today?', 'Kumusta! Paano kita matutulungan ngayon?')
                : text('I can help with order checks, common questions, and finding products. Choose an option below or ask something like “How do I pay?”', 'Makatutulong ako sa pag-check ng order, mga karaniwang tanong, at paghahanap ng produkto. Pumili sa ibaba o itanong ang “Paano magbayad?”'), initialOptions);
        }
    }

    function handleSubmit(event) {
        event.preventDefault();
        const message = inputValue.trim();
        if (!message || isLoading) return;
        const intent = chatbotIntent(message);
        const reference = intent.id === 'reference' ? intent.reference : awaitingReference && intent.id === 'unknown' ? message : null;
        setInputValue('');
        if (intent.id === 'reset') { resetConversation(); return; }
        addMessage('user', message);
        if (reference) { lookupOrder(reference); return; }
        respond(intent, false);
    }

    const hour = new Date().getHours();
    const greeting = hour < 12 ? text('Good morning', 'Magandang umaga') : hour < 18 ? text('Good afternoon', 'Magandang hapon') : text('Good evening', 'Magandang gabi');
    const firstName = user?.name?.trim().split(/\s+/)[0];

    return <div ref={containerRef} className="help-widget-container">
        {isOpen && <section id="kuya-ani-assistant" className="help-widget-window" aria-label="Kuya Ani assistant" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closeAssistant(); } }}>
            <header className="help-widget-header">
                <span className="help-widget-avatar-small"><img src="/images/farmer-mascot-final.jpg" alt="" /></span>
                <div className="help-widget-header-text"><h2>Kuya Ani</h2><span>{text('AgriFarm assistant', 'Katulong sa AgriFarm')}</span></div>
                {messages.length > 0 && <button type="button" className="help-widget-menu" onClick={resetConversation} aria-label={text('Back to menu', 'Bumalik sa menu')} title={text('Back to menu', 'Bumalik sa menu')}><Icon name="reset" size={19} /></button>}
                <button ref={closeRef} type="button" className="help-widget-close" onClick={closeAssistant} aria-label="Close assistant"><Icon name="close" size={21} /></button>
            </header>
            <div className="help-widget-body" ref={scrollRef}>
                {messages.length === 0 ? <div className="chat-welcome">
                    <h3>{greeting}{firstName ? `, ${firstName}` : ''}!</h3>
                    <p>{text('I’m Kuya Ani. What can I help you with?', 'Ako si Kuya Ani. Paano kita matutulungan?')}</p>
                    <div className="chat-welcome-actions">{initialOptions.map((option, index) => {
                        const content = <><Icon name={option.icon} size={21} /><span>{option.label}</span><Icon name="chevron" className="chat-option-chevron" size={18} /></>;
                        const className = `chat-welcome-action${index === 0 ? ' is-primary' : ''}`;
                        return option.href ? <Link key={option.id} href={option.href} className={className} onClick={closeAssistant}>{content}</Link> : <button type="button" key={option.id} className={className} onClick={() => respond(option)}>{content}</button>;
                    })}</div>
                </div> : <div className="chat-messages" role="log" aria-label={text('Conversation with Kuya Ani', 'Usapan kay Kuya Ani')} aria-live="polite" aria-relevant="additions" aria-busy={isLoading}>
                    {messages.map((message, index) => <div key={index} className={`chat-message ${message.sender}`}>
                        <div className="chat-bubble"><p>{message.text}</p>{message.order && <div className="chat-order-summary">
                            <strong>{message.order.reference || text('Your active orders', 'Mga aktibong order mo')}</strong>
                            <span className="chat-order-status">{statusLabels[message.order.status] || message.order.status}</span>
                            <p>{message.order.summary}</p>
                        </div>}</div>
                        {index === messages.length - 1 && !isLoading && message.options.length > 0 && <div className="chat-options-pills">{message.options.map(option => option.href
                            ? <Link key={option.id} href={option.href} onClick={closeAssistant} className="chat-pill">{option.label}</Link>
                            : <button type="button" key={option.id} onClick={() => respond(option)} className="chat-pill">{option.label}</button>)}</div>}
                    </div>)}
                    {isLoading && <p className="chat-loading" role="status">{text('Checking your order…', 'Tinitingnan ang order mo…')}</p>}
                </div>}
            </div>
            <form className="chat-input-form" onSubmit={handleSubmit}>
                <input ref={inputRef} type="text" aria-label={awaitingReference ? 'Order ID' : text('Message Kuya Ani', 'Mensahe para kay Kuya Ani')} placeholder={awaitingReference ? text('Enter your order reference…', 'Ilagay ang order reference…') : text('Ask Kuya Ani…', 'Magtanong kay Kuya Ani…')} maxLength={awaitingReference ? 64 : 240} value={inputValue} onChange={event => setInputValue(event.target.value)} autoComplete="off" />
                <button type="submit" disabled={!inputValue.trim() || isLoading} aria-label="Send"><Icon name="send" size={20} /></button>
            </form>
        </section>}
        <button ref={launcherRef} type="button" className={`help-widget-fab${isOpen ? ' active' : ''}`} onClick={() => isOpen ? closeAssistant() : setIsOpen(true)} aria-label={isOpen ? 'Close Help Assistant' : 'Open Help Assistant'} aria-expanded={isOpen} aria-controls={isOpen ? 'kuya-ani-assistant' : undefined}>
            <span className="help-widget-avatar"><img src="/images/farmer-mascot-final.jpg" alt="" /></span>
        </button>
    </div>;
}
