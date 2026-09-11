import { Link } from '@inertiajs/react';
import Icon from './Icon';
import { marketHref } from './catalog';

export default function CollectionPage({ title, children }) {
    return <div className="store-container collection-page">
        <div className="collection-heading"><h1>{title}</h1></div>
        {children}
    </div>;
}

export function CollectionEmpty({ icon, title, children }) {
    return <div className="collection-empty"><span className="collection-empty-icon"><Icon name={icon} size={34} /></span><h2>{title}</h2><p>{children}</p><Link href={marketHref()} className="store-button">Explore marketplace <Icon name="arrow" size={18} /></Link></div>;
}
