import { usePage } from '@inertiajs/react';
import { useShop } from './ShopContext';
import Icon from './Icon';
import '../../../css/urban-gardens.css';

const barangays = ['Rosario', 'Maybunga', 'Sto. Tomas'];

export default function UrbanGardens() {
    const { urbanGardens = [], gardenMapEmbedUrl = null, gardenMapUrl = null } = usePage().props;
    const { filipino } = useShop();
    const text = (english, tagalog) => filipino ? tagalog : english;

    return <section className="store-container urban-gardens" aria-labelledby="urban-gardens-heading">
        <div className="urban-gardens-heading">
            <div><p className="about-eyebrow">{text('GROWING IN PASIG', 'LUMALAGO SA PASIG')}</p><h2 id="urban-gardens-heading">{text('Gardens in our partner barangays', 'Mga hardin sa ating mga katuwang na barangay')}</h2><p>{text('Explore 12 CENRO-listed gardens across Rosario, Maybunga, and Sto. Tomas.', 'Kilalanin ang 12 hardin sa tala ng CENRO sa Rosario, Maybunga, at Sto. Tomas.')}</p></div>
            {gardenMapUrl && <a className="urban-gardens-full-map" href={gardenMapUrl} target="_blank" rel="noopener noreferrer">{text('Open full map', 'Buksan ang buong mapa')}<Icon name="arrow" size={17} /></a>}
        </div>
        <div className="urban-gardens-layout">
            <div className="urban-gardens-map">
                {gardenMapEmbedUrl ? <iframe src={gardenMapEmbedUrl} title={text('Map of urban gardens in partner barangays', 'Mapa ng mga hardin sa mga katuwang na barangay')} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                    : <div className="urban-gardens-map-fallback"><Icon name="pin" size={34} /><h3>{text('Find a garden near you', 'Kilalanin ang mga hardin sa inyong lugar')}</h3><p>{text('Choose a garden from the directory to view its listed location in Google Maps.', 'Pumili ng hardin sa talaan para makita sa Google Maps ang nakatalang lokasyon nito.')}</p></div>}
            </div>
            <div className="urban-gardens-directory" aria-label={text('Garden directory', 'Talaan ng mga hardin')}>
                {barangays.map((barangay, index) => {
                    const gardens = urbanGardens.filter(garden => garden.barangay === barangay);
                    return <details key={barangay} name="garden-barangay" open={index === 0} className="urban-gardens-group">
                        <summary><Icon name="pin" size={18} /><strong>{barangay}</strong><span>{gardens.length} {text('gardens', 'hardin')}</span><Icon name="chevron" size={17} /></summary>
                        <ul>{gardens.map(garden => <li key={garden.id}><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(garden.address)}`} target="_blank" rel="noopener noreferrer" aria-label={`${text('View', 'Tingnan ang')} ${garden.name} ${text('in Google Maps', 'sa Google Maps')}`}><span><strong>{garden.name}</strong><span>{garden.address}</span><small>{filipino ? ({ 'Community garden': 'Hardin ng komunidad', 'Government facility garden': 'Hardin sa pasilidad ng pamahalaan', 'School garden': 'Hardin sa paaralan' })[garden.category] : garden.category}</small></span><Icon name="arrow" size={17} /></a></li>)}</ul>
                    </details>;
                })}
            </div>
        </div>
        <p className="urban-gardens-source">{text('Source: CENRO List of Urban Gardens. Garden labels describe the listed addresses or facilities.', 'Batayan: CENRO List of Urban Gardens. Ang mga pangalan dito ay batay sa nakatalang address o pasilidad.')}</p>
    </section>;
}
