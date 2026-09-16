import { createContext, useContext, useEffect, useState } from 'react';
import { products as previewProducts } from './catalog';

const ShopContext = createContext(null);
const storageKey = 'agrifarm-marketplace-preview-v1';

function readSaved(products) {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey)) || {};
        const ids = new Set(products.map((product) => product.id));
        return {
            favorites: Array.isArray(saved.favorites) ? [...new Set(saved.favorites.filter((id) => ids.has(id)))] : [],
            cart: Object.fromEntries(Object.entries(saved.cart || {}).filter(([id, quantity]) => ids.has(id) && Number.isInteger(quantity) && quantity > 0).map(([id, quantity]) => [id, Math.min(quantity, products.find((product) => product.id === id).stock)])),
        };
    } catch {
        return { favorites: [], cart: {} };
    }
}

export function ShopProvider({ children, products = previewProducts }) {
    const [saved, setSaved] = useState(() => readSaved(products));
    const [panel, setPanel] = useState(null);
    const [notice, setNotice] = useState('');
    const [noticeId, setNoticeId] = useState(0);
    const [noticeTarget, setNoticeTarget] = useState(null);
    const [noticePaused, setNoticePaused] = useState(false);

    function notify(message, target = null) {
        setNotice(message);
        setNoticeTarget(target);
        setNoticeId((id) => id + 1);
    }

    useEffect(() => {
        try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* The preview still works when browser storage is unavailable. */ }
    }, [saved]);

    useEffect(() => {
        const available = new Map(products.map((product) => [product.id, product]));
        setSaved((previous) => {
            const favorites = previous.favorites.filter((id) => available.has(id));
            const cart = Object.fromEntries(Object.entries(previous.cart).map(([id, quantity]) => [id, Math.min(quantity, available.get(id)?.stock || 0)]).filter(([, quantity]) => quantity > 0));
            return favorites.length === previous.favorites.length && JSON.stringify(cart) === JSON.stringify(previous.cart) ? previous : { favorites, cart };
        });
    }, [products]);

    useEffect(() => {
        if (!notice || noticePaused) return;
        const timeout = window.setTimeout(() => setNotice(''), 8000);
        return () => window.clearTimeout(timeout);
    }, [notice, noticeId, noticePaused]);

    function changeQuantity(id, change) {
        setSaved((previous) => {
            const cart = { ...previous.cart };
            const next = Math.min(products.find((product) => product.id === id)?.stock || 0, Math.max(0, (cart[id] || 0) + change));
            if (next) cart[id] = next;
            else delete cart[id];
            return { ...previous, cart };
        });
    }

    function addQuantity(product, quantity) {
        if ((saved.cart[product.id] || 0) + quantity > product.stock) {
            notify('You have added all available stock for this item.');
            return false;
        }
        changeQuantity(product.id, quantity);
        notify(`${quantity} ${quantity === 1 ? 'unit' : 'units'} of ${product.name} added to your cart.`, 'cart');
        return true;
    }

    function clearPurchased(ids) {
        setSaved((previous) => {
            const cart = { ...previous.cart };
            ids.forEach((id) => { delete cart[id]; });
            return { ...previous, cart };
        });
    }

    function add(product) {
        return addQuantity(product, 1);
    }

    function saveForLater(id) {
        setSaved((previous) => {
            const cart = { ...previous.cart };
            delete cart[id];
            return { ...previous, cart, favorites: [...new Set([...previous.favorites, id])] };
        });
        notify(`${products.find((product) => product.id === id)?.name || 'Item'} moved to your favorites.`, 'favorites');
    }

    function toggleFavorite(id) {
        const product = products.find((item) => item.id === id);
        if (!product) return;
        notify(`${product.name} ${saved.favorites.includes(id) ? 'removed from' : 'saved to'} favorites.`, 'favorites');
        setSaved((previous) => ({ ...previous, favorites: previous.favorites.includes(id) ? previous.favorites.filter((item) => item !== id) : [...previous.favorites, id] }));
    }

    const value = { ...saved, products, panel, setPanel, notice, noticeId, noticeTarget, dismissNotice: () => setNotice(''), setNoticePaused, add, addQuantity, saveForLater, changeQuantity, clearPurchased, toggleFavorite, count: Object.values(saved.cart).reduce((total, quantity) => total + quantity, 0) };
    return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export const useShop = () => useContext(ShopContext);
