import ThemeToggle from '../../Components/ThemeToggle';
import Icon from '../../Components/Storefront/Icon';

const notificationOptions = [
    {
        key: 'newOrders',
        icon: 'cart',
        english: ['New orders', 'Show an alert when an order needs your attention.'],
        filipino: ['Mga bagong order', 'Magpakita ng abiso kapag may order na kailangan mong asikasuhin.'],
    },
    {
        key: 'lowStock',
        icon: 'box',
        english: ['Low stock', 'Warn me when a product reaches its stock threshold.'],
        filipino: ['Kaunti na ang stock', 'Magbigay ng babala kapag umabot ang produkto sa itinakdang minimum na stock.'],
    },
    {
        key: 'weatherAlerts',
        icon: 'bell',
        english: ['Weather alerts', 'Show important rain and storm updates for Pasig City.'],
        filipino: ['Mga abiso sa panahon', 'Ipakita ang mahahalagang update tungkol sa ulan at bagyo sa Pasig City.'],
    },
];

export default function Settings({ language, onLanguageChange, notifications, onNotificationChange }) {
    const filipino = language === 'filipino';

    return <section className="seller-panel seller-preferences">
        <header className="seller-preferences-header">
            <div className="seller-preferences-icon"><Icon name="settings" size={24} /></div>
            <div>
                <h1>{filipino ? 'Mga Setting' : 'Settings'}</h1>
                <p>{filipino ? 'Iangkop ang wika, itsura, at mga abiso sa device na ito.' : 'Customize how the seller dashboard works on this device.'}</p>
            </div>
        </header>

        <div className="seller-preference-group">
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

        <fieldset className="seller-preference-group seller-language-settings">
            <legend>{filipino ? 'Wika' : 'Language'}</legend>
            <p>{filipino ? 'Piliin ang wikang gagamitin sa seller workspace.' : 'Choose the language used in the seller workspace.'}</p>
            <div className="seller-language-options">
                <button type="button" aria-pressed={language === 'english'} onClick={() => onLanguageChange('english')}>English</button>
                <button type="button" aria-pressed={language === 'filipino'} onClick={() => onLanguageChange('filipino')}>Filipino <small>Malinaw na Taglish</small></button>
            </div>
        </fieldset>

        <fieldset className="seller-preference-group seller-notification-settings">
            <legend>{filipino ? 'Mga Abiso' : 'Notifications'}</legend>
            <p>{filipino ? 'Piliin kung aling mahahalagang abiso ang gusto mong makita.' : 'Choose which important alerts you want to see.'}</p>
            <div className="seller-notification-options">
                {notificationOptions.map(option => {
                    const [title, description] = filipino ? option.filipino : option.english;
                    return <div className="seller-notification-option" key={option.key}>
                        <span><Icon name={option.icon} size={20} /></span>
                        <div><strong>{title}</strong><small>{description}</small></div>
                        <button
                            type="button"
                            role="switch"
                            aria-label={title}
                            aria-checked={notifications[option.key]}
                            onClick={() => onNotificationChange(option.key, !notifications[option.key])}
                        ><span /></button>
                    </div>;
                })}
            </div>
        </fieldset>

        <p className="seller-preferences-note"><Icon name="check" size={16} />{filipino ? 'Awtomatikong nase-save ang mga pagbabago sa device na ito.' : 'Changes are saved automatically on this device.'}</p>
    </section>;
}
