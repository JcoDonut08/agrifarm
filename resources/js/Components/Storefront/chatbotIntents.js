export function chatbotIntent(message) {
    const reference = message.match(/\bagfrm-([a-z0-9]+)\b/i);
    if (reference && reference[0].length <= 64) return { id: 'reference', reference: `AgFrm-${reference[1].toUpperCase()}` };
    const text = message.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\b(po|opo)\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (/\b(menu|restart|start over|simula)\b/.test(text)) return { id: 'reset' };
    if (/\b(payment|pay|payments|cod|cash|gcash|bayad|magbayad|magbabayad|pagbabayad)\b/.test(text)) return { id: 'faq-payment' };
    if (/\b(how to order|how do i order|how can i order|place an order|paano umorder|paano mag order|paano bumili)\b/.test(text)) return { id: 'faq-ordering' };
    if (/\b(join|register|registration|sign up|sumali|magbenta|maging seller|become.*(seller|farmer))\b/.test(text)) return { id: 'faq-join' };
    if (/\b(what is agrifarm|what s agrifarm|about agrifarm|ano ang agrifarm|ano yung agrifarm|ano ba ang agrifarm)\b/.test(text)) return { id: 'faq-what' };
    if (/\b(what.*(grow|produce|vegetables)|ano.*(tanim|gulay)|anong.*(produkto|gulay))\b/.test(text)) return { id: 'faq-grow' };
    if (/\b(order|orders|tracking|track|status|delivery|deliver|umorder|nasaan|asan)\b/.test(text)) return { id: 'order' };
    if (/\b(contact|support|customer service|kontak|tulong|cenro)\b/.test(text)) return { id: 'contact' };
    if (/\b(products|product|browse|marketplace|shop|buy|search|find|bili|produkto|mamili|hanap)\b/.test(text)) return { id: 'products' };
    if (/\b(faq|faqs|questions|common questions|tanong)\b/.test(text)) return { id: 'faqs' };
    if (/^(hi|hello|hey|kumusta|kamusta|good morning|good afternoon|good evening|magandang umaga|magandang hapon|magandang gabi)\b/.test(text)) return { id: 'greeting' };
    return { id: 'unknown' };
}
