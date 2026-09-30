import { useState, useRef, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import Icon from './Icon';
import { marketHref } from './catalog';
import { useShop } from './ShopContext';

export default function HelpWidget() {
    const { props } = usePage();
    const user = props.auth?.user;
    const [isOpen, setIsOpen] = useState(false);
    const { filipino } = useShop();
    const scrollRef = useRef(null);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return filipino ? 'Magandang umaga!' : 'Good morning!';
        if (hour < 18) return filipino ? 'Magandang hapon!' : 'Good afternoon!';
        return filipino ? 'Magandang gabi!' : 'Good evening!';
    };

    const initialOptions = [
        { id: 'order', label: filipino ? 'Suriin ang Order' : 'Check my order' },
        { id: 'faqs', label: filipino ? 'Mga Madalas Itanong' : 'FAQs & Help' },
        { id: 'products', label: filipino ? 'Tingnan ang Produkto' : 'Browse Products', href: marketHref() },
        { id: 'contact', label: filipino ? 'Makipag-ugnayan' : 'Contact Support', href: '/contact' }
    ];

    const faqOptions = [
        { id: 'faq-what', label: filipino ? 'Ano ang AgriFarm?' : 'What is AgriFarm?' },
        { id: 'faq-join', label: filipino ? 'Sino ang maaaring sumali?' : 'Who can join?' },
        { id: 'faq-grow', label: filipino ? 'Ano ang itinatanim?' : 'What is grown?' },
        { id: 'reset', label: filipino ? 'ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Bumalik sa Menu' : 'ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Back to Main Menu' }
    ];

    const [messages, setMessages] = useState([]);
    
    // Initialize greeting only when opened or mounted
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                { 
                    sender: 'bot', 
                    text: `${getGreeting()} ${user ? user.name.split(' ')[0] : ''} \n\n${filipino ? 'Ako ang Kuya Ani. Paano kita matutulungan ngayon?' : 'I am the Kuya Ani. How can I help you today?'}`,
                    options: initialOptions
                }
            ]);
        }
    }, [user, filipino]);

    const [isTyping, setIsTyping] = useState(false);
    const [awaitingInput, setAwaitingInput] = useState(false);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping, awaitingInput]);

    const addMessage = (sender, text, options = null) => {
        setMessages(prev => [...prev, { sender, text, options, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    };

            const formatStatus = (status, orderId, summary) => {
        if (status === 'not_found') {
            return filipino 
                ? 'Paumanhin, wala akong mahanap na order na tumutugma doon.' 
                : 'Sorry, I could not find any order matching that.';
        }
        
        let msg = '';
        if (status === 'active_multiple') {
            msg = filipino 
                ? `Kasalukuyan kang may mga sumusunod na produkto na pinoproseso sa iyong account:\n\n- **${summary}**` 
                : `You currently have the following products actively being processed in your account:\n\n- **${summary}**`;
        } else if (status === 'mixed' || status === 'processing') {
            msg = filipino 
                ? `Ang iyong order na **${orderId}** ay kasalukuyang pinoproseso. Narito ang status ng bawat item:\n\n**${summary}**` 
                : `Your order **${orderId}** is currently being processed. Here is the status of each item:\n\n**${summary}**`;
        } else if (status === 'pending') {
            msg = filipino 
                ? `Ang iyong order na **${orderId}** (**${summary}**) ay kasalukuyang **Nakahanda (Pending)** at sinusuri ng aming mga urban farmers.` 
                : `Your order **${orderId}** (**${summary}**) is currently **Pending** and being reviewed by our urban farmers.`;
        } else if (status === 'preparing') {
            msg = filipino 
                ? `Inihahanda na ang iyong order na **${orderId}** (**${summary}**)!` 
                : `Your order **${orderId}** (**${summary}**) is actively being **Prepared** for you right now!`;
        } else if (status === 'out for delivery' || status === 'out_for_delivery') {
            msg = filipino 
                ? `Nasa biyahe na ang iyong order na **${orderId}** (**${summary}**)! Asahan ang pagdating nito anumang oras.` 
                : `Your order **${orderId}** (**${summary}**) is **Out for delivery**! Expect it to arrive soon.`;
        } else if (status === 'delivered') {
            msg = filipino 
                ? `Matagumpay na nai-deliver ang iyong order na **${orderId}** (**${summary}**). Maraming salamat sa pagsuporta sa lokal!` 
                : `Your order **${orderId}** (**${summary}**) has been **Delivered**. Thank you for supporting local!`;
        } else if (status === 'cancelled') {
            msg = filipino 
                ? `Ang iyong order na **${orderId}** ay nai-**Cancelled**.` 
                : `Your order **${orderId}** has been **Cancelled**.`;
        } else {
            msg = `Status for **${orderId}**: **${status}**.\nItems: **${summary}**`;
        }
        return msg;
    };
const handleOptionClick = async (option) => {
        if (option.href) {
            setIsOpen(false);
            return;
        }

        addMessage('user', option.label); // Remove emoji for chat bubble

        if (option.id === 'faqs') {
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                addMessage('bot', filipino ? 'Narito ang ilang madalas itanong. Ano ang gusto mong malaman?' : 'Here are some common questions. What would you like to know?', faqOptions);
            }, 600);
        }
        else if (option.id === 'faq-what') {
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                addMessage('bot', filipino ? 'Ang AgriFarm Pasig ay isang digital na pamilihan na idinisenyo upang direktang ikonekta ang mga lokal na urban farmers ng Pasig City sa mga mamimili.' : 'AgriFarm Pasig is a digital marketplace designed to directly connect Pasig City\'s local urban farmers with citizens.', faqOptions);
            }, 800);
        }
        else if (option.id === 'faq-join') {
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                addMessage('bot', filipino ? 'Sinumang asosasyon ng komunidad, paaralan, o rehistradong urban farmer sa Pasig City ay maaaring sumali at mag-alok ng kanilang ani.' : 'Any community association, school, or registered urban farmer in Pasig City can join and offer their produce.', faqOptions);
            }, 800);
        }
        else if (option.id === 'faq-grow') {
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                addMessage('bot', filipino ? 'Iba-iba ito depende sa panahon, ngunit karaniwang kasama rito ang Pechay, Mustasa, Kamatis, Talong, at iba\'t ibang herbal na halaman.' : 'It varies by season, but typically includes Pechay, Mustard greens, Tomatoes, Eggplants, and various culinary herbs.', faqOptions);
            }, 800);
        }
        else if (option.id === 'order') {
            setIsTyping(true);
            
            if (user) {
                addMessage('bot', filipino ? `Tinitingnan ko ang pinakabagong order sa iyong account, sandali lamang...` : `Pulling up the latest order on your account, one moment...`);
                
                try {
                    const response = await fetch('/api/chatbot/latest-order');
                    const data = await response.json();
                    
                    setIsTyping(false);
                    if (data.status === 'not_found') {
                        addMessage('bot', filipino ? 'Wala kang anumang kamakailang order sa system.' : 'You do not have any recent orders in the system.', [{ id: 'reset', label: filipino ? 'Bumalik' : 'Go Back' }]);
                    } else {
                        addMessage('bot', formatStatus(data.status, data.reference, data.summary), [{ id: 'reset', label: filipino ? 'Bumalik sa Menu' : 'Back to Menu' }]);
                    }
                } catch (e) {
                    setIsTyping(false);
                    addMessage('bot', filipino ? 'Nagkaroon ng problema sa pagkuha ng iyong order.' : 'There was a problem retrieving your order.', [{ id: 'reset', label: filipino ? 'Bumalik' : 'Go Back' }]);
                }
            } else {
                setTimeout(() => {
                    setIsTyping(false);
                    addMessage('bot', filipino ? 'Pakibigay ang iyong Order ID (hal. ORD-12345):' : 'Please type or paste your exact Order ID below:');
                    setAwaitingInput(true);
                }, 600);
            }
        }
        else if (option.id === 'reset') {
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                addMessage('bot', filipino ? 'Ano pa ang maitutulong ko sa iyo?' : 'What else can I help you with?', initialOptions);
            }, 500);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const orderId = inputValue.trim().toUpperCase();
        addMessage('user', orderId);
        setInputValue('');
        setAwaitingInput(false);
        
        setIsTyping(true);
        addMessage('bot', filipino ? `Hinahanap ang ${orderId}...` : `Searching for ${orderId}...`);
        
        try {
            const response = await fetch(`/api/chatbot/order-status?reference=${orderId}`);
            const data = await response.json();
            
            setIsTyping(false);
            addMessage('bot', formatStatus(data.status, data.reference || orderId, data.summary), [{ id: 'reset', label: filipino ? 'Bumalik sa Menu' : 'Back to Menu' }]);
        } catch (e) {
            setIsTyping(false);
            addMessage('bot', filipino ? 'Paumanhin, nagkaroon ng error sa system.' : 'Sorry, there was a system error.', [{ id: 'reset', label: filipino ? 'Bumalik' : 'Go Back' }]);
        }
    };

    return (
        <div className="help-widget-container">
            {isOpen && (
                <div className="help-widget-window">
                    <div className="help-widget-header">
                        <div className="help-widget-avatar-small">
                            <img src="/images/farmer-mascot-final.jpg" alt="Mascot" />
                        </div>
                        <div className="help-widget-header-text">
                            <h4>Kuya Ani</h4>
                            <span>{filipino ? 'Online' : 'Online'}</span>
                        </div>
                        <button className="help-widget-close" onClick={() => setIsOpen(false)} aria-label="Close assistant">
                            <Icon name="close" size={18} />
                        </button>
                    </div>
                    
                    <div className="help-widget-body" ref={scrollRef}>
                        <div className="chat-messages">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`chat-message ${msg.sender}`}>
                                    <div className="chat-bubble">
                                        {msg.text.split('\n').map((line, i) => (
                                            <span key={i}>
                                                {line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                                                {i !== msg.text.split('\n').length - 1 && <br />}
                                            </span>
                                        ))}
                                    </div>
                                    {msg.time && <div className="chat-time">{msg.time}</div>}
                                    
                                    {msg.options && !isTyping && (
                                        <div className="chat-options-pills">
                                            {msg.options.map(opt => (
                                                opt.href ? (
                                                    <Link key={opt.id} href={opt.href} onClick={() => setIsOpen(false)} className="chat-pill">
                                                        {opt.label}
                                                    </Link>
                                                ) : (
                                                    <button key={opt.id} onClick={() => handleOptionClick(opt)} className="chat-pill">
                                                        {opt.label}
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {isTyping && (
                                <div className="chat-message bot typing">
                                    <div className="chat-bubble">
                                        <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {awaitingInput && !isTyping && (
                            <form className="chat-input-form" onSubmit={handleFormSubmit}>
                                <input 
                                    type="text" 
                                    placeholder={filipino ? "Ilagay ang Order ID..." : "Enter Order ID..."}
                                    value={inputValue} 
                                    onChange={(e) => setInputValue(e.target.value)} 
                                    autoFocus
                                />
                                <button type="submit" disabled={!inputValue.trim()} aria-label="Send"><Icon name="send" size={16} /></button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <button className={`help-widget-fab ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)} aria-label="Open Help Assistant">
                <div className="help-widget-avatar">
                    <img src="/images/farmer-mascot-final.jpg" alt="Mascot" />
                </div>
                
            </button>
        </div>
    );
}