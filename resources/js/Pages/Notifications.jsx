import CollectionPage, { CollectionEmpty } from '../Components/Storefront/CollectionPage';

export default function Notifications() {
    return <CollectionPage title="Notifications">
        <CollectionEmpty icon="bell" title="No notifications yet">When marketplace updates are available, you will find them here.</CollectionEmpty>
        <p className="collection-footnote">Notifications will be connected when the marketplace opens.</p>
    </CollectionPage>;
}
