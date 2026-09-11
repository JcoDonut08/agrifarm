import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import GuestLayout from '../Layouts/GuestLayout';
import { ShopProvider } from '../Components/Storefront/ShopContext';
import Icon from '../Components/Storefront/Icon';
import FormField from '../Components/FormField';

const topics = [
    { value: 'inquiry', label: 'General inquiry', description: 'Questions about AgriFarm', icon: 'message' },
    { value: 'report', label: 'Report a concern', description: 'Something needs attention', icon: 'flag' },
    { value: 'account', label: 'Account help', description: 'Help accessing your account', icon: 'user' },
    { value: 'other', label: 'Other', description: 'Anything else on your mind', icon: 'people' },
];

export default function Contact() {
    const { auth, contactEmail, contactSuccess } = usePage().props;
    const form = useForm({ name: auth?.user?.name || '', email: auth?.user?.email || '', category: 'inquiry', subject: '', reference: '', message: '' });
    const feedback = useRef(null);
    useEffect(() => { if (contactSuccess) feedback.current?.focus(); }, [contactSuccess]);

    function submit(event) {
        event.preventDefault();
        form.post('/contact', {
            preserveScroll: true,
            onSuccess: () => form.reset('subject', 'reference', 'message'),
            onError: (errors) => {
                const field = Object.keys(errors)[0];
                if (field === 'submission') feedback.current?.focus();
                else document.getElementById(field)?.focus();
            },
        });
    }

    return <ShopProvider><GuestLayout storefront><Head title="Contact AgriFarm" />
        <div className="store-container contact-page">
            <div className="contact-heading"><h1>Contact AgriFarm</h1><p>Questions, feedback, or a concern. Get in touch.</p></div>
            <div className="contact-layout">
                <aside className="contact-details">
                    <div className="contact-support-label"><Icon name="sprout" size={20} />AgriFarm support</div>
                    <h2>We’re here to help.</h2>
                    <p>Connect with the team behind your local marketplace. Every inquiry and report goes directly to our admin inbox.</p>
                    {contactEmail && <div className="contact-email"><Icon name="mail" size={22} /><div><span>Email us directly</span><a href={`mailto:${contactEmail}`}>{contactEmail}</a></div></div>}
                    <div className="contact-report-tip"><Icon name="flag" size={21} /><div><h3>Reporting a concern?</h3><p>Include the product or seller name, what happened, and when. Please leave out passwords and payment details.</p></div></div>
                    <p className="contact-privacy">We’ll use your contact details to respond to your message. <Link href="/privacy">Privacy policy</Link></p>
                </aside>
                <section className="contact-form-panel" aria-labelledby="contact-form-heading">
                    <div className="contact-form-heading"><div><h2 id="contact-form-heading">Send a message</h2><p>Choose a topic and tell us a little more.</p></div><Icon name="send" size={24} /></div>
                    {contactSuccess && <div ref={feedback} tabIndex={-1} className="contact-feedback contact-success" role="status"><Icon name="check" size={23} /><div><strong>Your message has been sent.</strong><p>The AgriFarm team can reply to the email you provided.</p><small>Reference: {contactSuccess}</small></div></div>}
                    {form.errors.submission && <div ref={feedback} tabIndex={-1} className="contact-feedback contact-error" role="alert"><Icon name="flag" /><p>{form.errors.submission}</p></div>}
                    <form onSubmit={submit} noValidate>
                        <fieldset className="contact-topics" disabled={form.processing}><legend>How can we help?</legend><div>{topics.map((topic) => <label key={topic.value}><input type="radio" id={topic.value === 'inquiry' ? 'category' : undefined} name="category" aria-label={topic.label} value={topic.value} checked={form.data.category === topic.value} onChange={() => form.setData('category', topic.value)} /><span><Icon name={topic.icon} size={20} /><span className="contact-topic-copy"><strong>{topic.label}</strong><small>{topic.description}</small></span><span className="contact-topic-check" aria-hidden="true"><Icon name="check" size={12} /></span></span></label>)}</div>{form.errors.category && <p className="contact-field-error">{form.errors.category}</p>}</fieldset>
                        <div className="contact-name-fields"><FormField id="name" label="Your name" autoComplete="name" maxLength={100} required value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} /><FormField id="email" label="Email address" type="email" autoComplete="email" maxLength={254} required value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} error={form.errors.email} /></div>
                        <FormField id="subject" label="Subject" placeholder={form.data.category === 'report' ? 'Briefly describe the concern' : 'What would you like help with?'} maxLength={150} required value={form.data.subject} onChange={(event) => form.setData('subject', event.target.value)} error={form.errors.subject} />
                        <FormField id="reference" label="Product, seller, or order reference (optional)" maxLength={300} value={form.data.reference} onChange={(event) => form.setData('reference', event.target.value)} error={form.errors.reference} />
                        <div className="contact-message"><label htmlFor="message">Message</label><textarea id="message" name="message" rows={7} minLength={20} maxLength={5000} required placeholder="Share the details so our team can help you." value={form.data.message} onChange={(event) => form.setData('message', event.target.value)} aria-invalid={Boolean(form.errors.message)} aria-describedby={form.errors.message ? 'message-error' : 'message-hint'} />{form.errors.message ? <p id="message-error" role="alert" className="contact-field-error">{form.errors.message}</p> : <p id="message-hint">At least 20 characters. <span>{form.data.message.length.toLocaleString()} / 5,000</span></p>}</div>
                        <div className="contact-submit-row"><p><Icon name="mail" size={16} />Replies go to your email.</p><button type="submit" className="store-button contact-submit" disabled={form.processing}><Icon name="send" size={18} />{form.processing ? 'Sending message…' : 'Send message'}</button></div>
                    </form>
                </section>
            </div>
        </div>
    </GuestLayout></ShopProvider>;
}
