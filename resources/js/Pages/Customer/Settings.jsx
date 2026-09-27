import { Head, usePage } from '@inertiajs/react';
import StorefrontLayout from '../../Layouts/StorefrontLayout';
import ThemeToggle from '../../Components/ThemeToggle';
import { useShop, ShopProvider } from '../../Components/Storefront/ShopContext';
import Icon from '../../Components/Storefront/Icon';
import { useState } from 'react';

export default function Settings() {
    return (
        <ShopProvider products={[]} persist={false}>
            <SettingsInner />
        </ShopProvider>
    );
}

function SettingsInner() {
    const { filipino, changeLanguage } = useShop();
    const { auth } = usePage().props;
    const user = auth.user;

    const [notifications, setNotifications] = useState({
        orderUpdates: true,
        promotions: false,
        communityNews: true
    });

    const toggleNotification = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
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
                            <p>{filipino ? 'Iangkop ang wika, itsura, at mga abiso sa device na ito.' : 'Customize how the dashboard works on this device.'}</p>
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
                        <p>{filipino ? 'Piliin kung aling mahahalagang abiso ang gusto mong makita.' : 'Choose which important alerts you want to see.'}</p>
                        <div className="customer-notification-options">
                            <div className="customer-notification-item">
                                <span><Icon name="cart" size={20} /></span>
                                <div>
                                    <strong>{filipino ? 'Mga update sa order' : 'Order updates'}</strong>
                                    <small>{filipino ? 'Makatanggap ng alerto kapag ang iyong order ay inihahanda, naipalaot, o naihatid.' : 'Get alerted when your order is prepared, out for delivery, or delivered.'}</small>
                                </div>
                                <button type="button" role="switch" aria-checked={notifications.orderUpdates} onClick={() => toggleNotification('orderUpdates')} aria-label="Order updates"><span /></button>
                            </div>
                            <div className="customer-notification-item">
                                <span><Icon name="tag" size={20} /></span>
                                <div>
                                    <strong>{filipino ? 'Mga promosyon at alok' : 'Promotions and offers'}</strong>
                                    <small>{filipino ? 'Paminsan-minsang mensahe tungkol sa mga seasonal na ani at diskwento mula sa mga lokal na nagtitinda.' : 'Occasional messages about seasonal harvests and local seller discounts.'}</small>
                                </div>
                                <button type="button" role="switch" aria-checked={notifications.promotions} onClick={() => toggleNotification('promotions')} aria-label="Promotions and offers"><span /></button>
                            </div>
                            <div className="customer-notification-item">
                                <span><Icon name="bell" size={20} /></span>
                                <div>
                                    <strong>{filipino ? 'Mga balita sa komunidad' : 'Community news'}</strong>
                                    <small>{filipino ? 'Makatanggap ng mga update tungkol sa mga bagong ani at kaganapan sa iyong barangay.' : 'Receive updates about new harvests and events in your barangay.'}</small>
                                </div>
                                <button type="button" role="switch" aria-checked={notifications.communityNews} onClick={() => toggleNotification('communityNews')} aria-label="Community news"><span /></button>
                            </div>
                        </div>
                    </fieldset>

                    <p className="customer-settings-note"><Icon name="check" size={16} />{filipino ? 'Awtomatikong nase-save ang mga pagbabago sa device na ito.' : 'Changes are saved automatically on this device.'}</p>
                </div>
            </div>
        </StorefrontLayout>
    );
}
