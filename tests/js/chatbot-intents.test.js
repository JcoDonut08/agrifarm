import test from 'node:test';
import assert from 'node:assert/strict';
import { chatbotIntent } from '../../resources/js/Components/Storefront/chatbotIntents.js';

test('common English and Filipino questions reach the correct supported help flow', () => {
    for (const [message, id] of [
        ['What is AgriFarm?', 'faq-what'], ['Ano po ang AgriFarm?', 'faq-what'],
        ['Can I pay with GCash?', 'faq-payment'], ['Paano ako magbabayad?', 'faq-payment'],
        ['How do I order?', 'faq-ordering'], ['Paano po umorder?', 'faq-ordering'], ['Paano po mag-order?', 'faq-ordering'],
        ['How can I become a seller?', 'faq-join'], ['Paano sumali?', 'faq-join'],
        ['What vegetables are grown?', 'faq-grow'], ['Anong mga gulay ang meron?', 'faq-grow'],
        ['Where is my order?', 'order'], ['Nasaan na ang order ko?', 'order'],
        ['Contact support', 'contact'], ['Kailangan ko ng tulong', 'contact'],
        ['Browse products', 'products'], ['Hanap ako ng pechay', 'products'],
        ['Common questions', 'faqs'], ['Mga tanong', 'faqs'],
        ['Hello!', 'greeting'], ['Kumusta?', 'greeting'], ['Back to menu', 'reset'],
    ]) assert.equal(chatbotIntent(message).id, id, message);
});

test('references inside messages are extracted and normalized without overriding payment questions', () => {
    assert.deepEqual(chatbotIntent('Please check agfrm-a1abcdefghij for me'), { id: 'reference', reference: 'AgFrm-A1ABCDEFGHIJ' });
    assert.equal(chatbotIntent('Cash on delivery please').id, 'faq-payment');
    assert.equal(chatbotIntent('Can I pay for my order with cash?').id, 'faq-payment');
});

test('unsupported and oversized references receive a fallback instead of inventing an answer', () => {
    for (const message of ['Tell me the weather tomorrow', '', 'AgFrm-' + 'A'.repeat(65)]) {
        assert.equal(chatbotIntent(message).id, 'unknown');
    }
});
