import { Head, useForm, usePage } from '@inertiajs/react';
import StorefrontLayout from '../../Layouts/StorefrontLayout';
import ThemeToggle from '../../Components/ThemeToggle';
import { useShop, ShopProvider } from '../../Components/Storefront/ShopContext';
import Icon from '../../Components/Storefront/Icon';
import FormStatus from '../../Components/FormStatus';

export default function Settings() {
    return (
        <ShopProvider products={[]} persist={false}>
            <SettingsInner />
        </ShopProvider>
    );
}

function SettingsInner() {
    const { filipino, changeLanguage } = useShop();
    const { orderUpdateEmails, flash } = usePage().props;
    const preference = useForm({ order_update_emails: orderUpdateEmails });

    const toggleEmails = () => {
        if (preference.processing) return;
        const next = !preference.data.order_update_emails;
        preference.setData('order_update_emails', next);
        const failed = () => {
            preference.setData('order_update_emails', orderUpdateEmails);
            preference.setError('request', filipino ? 'Hindi ma-save ang setting. Subukan muli.' : 'Could not save your preference. Please try again.');
            return false;
        };
        preference.clearErrors();
        preference.transform(() => ({ order_update_emails: next }));
        preference.patch('/customer/settings', {
            preserveScroll: true,
            onError: () => preference.setData('order_update_emails', orderUpdateEmails),
            onNetworkError: failed,
            onHttpException: failed,
        });
    };

    return (
        <StorefrontLayout>
            <Head title={filipino ? 'Mga Setting' : 'Settings'} />
            <div className="store-container customer-profile-page">
                <div className="customer-profile-panel" style={{ maxWidth: '900px', padding: '0 26px 18px', margin: '0 auto' }}>
                    <header className="customer-settings-header">
                        <div className="customer-settings-icon"><Icon name="settings" size={24} /></div>
                        <div>
                            <h1>{filipino ? 'Mga Setting' : 'Settings'}</h1>
                            <p>{filipino ? 'Piliin ang itsura, wika, at mga email na matatanggap.' : 'Choose your appearance, language, and email preferences.'}</p>
                        </div>
                    </header>

                    <div className="customer-settings-group">
                        <ThemeToggle
                            settings
                            systemOption
                            labels={filipino ? {
                                title: 'Itsura',
                                description: 'Piliin ang maliwanag o madilim na tema, o sundin ang setting ng device.',
                                light: 'Maliwanag',
                                dark: 'Madilim',
                                system: 'Ayon sa system',
                            } : undefined}
                        />
                    </div>

                    <fieldset className="customer-settings-group">
                        <legend>{filipino ? 'Kagustuhan sa wika' : 'Language'}</legend>
                        <p>{filipino ? 'Piliin ang wikang gagamitin sa Agrifarm.' : 'Choose the language used in AgriFarm.'}</p>
                        <div className="customer-language-options">
                            <button type="button" aria-pressed={!filipino} onClick={() => changeLanguage('english')}>
                                <span>English</span>
                            </button>
                            <button type="button" aria-pressed={filipino} onClick={() => changeLanguage('filipino')}>
                                <span>Filipino</span>
                                <small>Malinaw na Taglish</small>
                            </button>
                        </div>
                    </fieldset>

                    <fieldset className="customer-settings-group">
                        <legend>{filipino ? 'Mga Notipikasyon' : 'Notifications'}</legend>
                        <p>{filipino ? 'Palaging makikita ang mga update sa order sa Mga Notipikasyon at Mga Order.' : 'Order updates always remain available in Notifications and Orders.'}</p>
                        <FormStatus dismissible messageId={flash?.id}>{filipino && flash?.status === 'Notification preference saved.' ? 'Na-save ang kagustuhan sa mga abiso.' : flash?.status}</FormStatus>
                        <FormStatus tone="error">{preference.errors.request || preference.errors.order_update_emails}</FormStatus>
                        <div className="customer-notification-options">
                            <div className="customer-notification-item">
                                <span><Icon name="bell" size={20} /></span>
                                <div>
                                    <strong>{filipino ? 'Mga email sa update ng order' : 'Order update emails'}</strong>
                                    <small>{filipino ? 'Makatanggap ng email kapag inihahanda, ipinapadala, naihatid, o kinansela ang iyong order.' : 'Receive an email when your order is being prepared, out for delivery, delivered, or cancelled.'}</small>
                                </div>
                                <button type="button" role="switch" disabled={preference.processing} aria-busy={preference.processing} aria-checked={preference.data.order_update_emails} onClick={toggleEmails} aria-label={filipino ? 'Mga email sa update ng order' : 'Order update emails'}><span /></button>
                            </div>
                        </div>
                        <p>{filipino ? 'Naka-save sa iyong account ang kagustuhan sa email.' : 'Your email preference is saved to your account.'}</p>
                    </fieldset>

                    <p className="customer-settings-note"><Icon name="check" size={16} />{filipino ? 'Naka-save sa device na ito ang tema at wika.' : 'Appearance and language are saved on this device.'}</p>
                </div>
            </div>
        </StorefrontLayout>
    );
}
