import ProductCard from '../Components/Storefront/ProductCard';
import CollectionPage, { CollectionEmpty } from '../Components/Storefront/CollectionPage';
import { useShop } from '../Components/Storefront/ShopContext';

export default function Favorites() {
    const { favorites, products } = useShop();
    const items = products.filter((product) => favorites.includes(product.id));
    return <CollectionPage title="Favorites">
        {items.length ? <><p className="collection-count">{items.length} saved {items.length === 1 ? 'product' : 'products'}</p><div className="market-product-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div><p className="collection-footnote">Your favorites are saved on this device.</p></> : <CollectionEmpty icon="heart" title="A place for your favorites">Tap the heart on any product to save it here. Items you save for later from your cart will appear here too.</CollectionEmpty>}
    </CollectionPage>;
}
