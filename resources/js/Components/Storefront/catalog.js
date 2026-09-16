// Design fixtures only. These listings are not connected to sellers or inventory.
export const products = [
    { id: 'pechay', name: 'Fresh Pechay', barangay: 'Rosario', price: 35, unit: 'bunch', category: 'Vegetables', photo: 0, listedAt: '2026-09-01', salesRankScore: 120, interestGrowthScore: 12, stock: 32, isBestSeller: true },
    { id: 'tomatoes', name: 'Native Tomatoes', barangay: 'Maybunga', price: 60, unit: 'kg', category: 'Fruits', photo: 1, listedAt: '2026-09-02', salesRankScore: 95, interestGrowthScore: 85, stock: 24, isTrending: true },
    { id: 'eggplant', name: 'Fresh Eggplant', barangay: 'Sto. Tomas', price: 70, unit: 'kg', category: 'Vegetables', photo: 2, listedAt: '2026-09-03', salesRankScore: 72, interestGrowthScore: 18, stock: 18 },
    { id: 'cucumber', name: 'Crisp Cucumber', barangay: 'Rosario', price: 55, unit: 'kg', category: 'Vegetables', photo: 3, listedAt: '2026-09-10', salesRankScore: 38, interestGrowthScore: 25, stock: 26, isNew: true },
    { id: 'carrots', name: 'Fresh Carrots', barangay: 'Maybunga', price: 80, unit: 'kg', category: 'Vegetables', photo: 4, listedAt: '2026-09-09', salesRankScore: 45, interestGrowthScore: 20, stock: 20, isNew: true },
    { id: 'lettuce', name: 'Green Lettuce', barangay: 'Sto. Tomas', price: 45, unit: 'head', category: 'Vegetables', photo: 5, listedAt: '2026-09-08', salesRankScore: 40, interestGrowthScore: 22, stock: 16, isNew: true },
    { id: 'kangkong', name: 'Fresh Kangkong', barangay: 'Rosario', price: 25, unit: 'bunch', category: 'Vegetables', photo: 6, listedAt: '2026-09-04', salesRankScore: 88, interestGrowthScore: 70, stock: 35, isTrending: true },
    { id: 'okra', name: 'Fresh Okra', barangay: 'Maybunga', price: 60, unit: 'kg', category: 'Vegetables', photo: 7, listedAt: '2026-09-05', salesRankScore: 54, interestGrowthScore: 15, stock: 22 },
    { id: 'beans', name: 'String Beans', barangay: 'Sto. Tomas', price: 50, unit: 'bunch', category: 'Beans', photo: 8, listedAt: '2026-09-06', salesRankScore: 48, interestGrowthScore: 10, stock: 28 },
    { id: 'basil', name: 'Sweet Basil', barangay: 'Rosario', price: 30, unit: 'bunch', category: 'Herbs', photo: 9, listedAt: '2026-09-11', salesRankScore: 20, interestGrowthScore: 16, stock: 12, isNew: true },
    { id: 'calamansi', name: 'Fresh Calamansi', barangay: 'Maybunga', price: 65, unit: 'kg', category: 'Fruits', photo: 10, listedAt: '2026-09-07', salesRankScore: 62, interestGrowthScore: 14, stock: 30 },
    { id: 'squash', name: 'Golden Squash', barangay: 'Sto. Tomas', price: 40, unit: 'kg', category: 'Vegetables', photo: 11, listedAt: '2026-09-02', salesRankScore: 50, interestGrowthScore: 11, stock: 15 },
];

export const communities = [
    { name: 'Rosario', description: 'Lush gardens, stronger together.' },
    { name: 'Maybunga', description: 'Fresh produce, brighter days.' },
    { name: 'Sto. Tomas', description: 'Local harvests, local pride.' },
];

export const marketHref = (barangay, sort) => `/?page=marketplace${barangay ? `&barangay=${encodeURIComponent(barangay)}` : ''}${sort ? `&sort=${encodeURIComponent(sort)}` : ''}`;
export const productHref = (id) => `/?page=product&product=${encodeURIComponent(id)}`;
export const sellerHref = (id) => `/?page=seller&seller=${encodeURIComponent(id)}`;
export const reviewHref = (id, rating = null, page = 1) => `${productHref(id)}${rating ? `&review_rating=${rating}` : ''}${page > 1 ? `&review_page=${page}` : ''}#product-reviews`;
export const money = (value) => `₱${value.toLocaleString('en-PH', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;
export const stockUnit = (unit, count) => unit === 'kg' ? 'kg' : count === 1 ? unit : ({ bunch: 'bunches', piece: 'pieces', head: 'heads', pack: 'packs' }[unit] || unit);

export function getProductBadge(product) {
    if (product.isBestSeller) return { label: 'Best Seller', style: 'bestseller', icon: 'trophy', description: 'Among the most ordered products from delivered sales' };
    if (product.isTrending) return { label: 'Trending', style: 'trending', icon: 'trend', description: 'Delivered walk-in orders rose this week' };
    if (product.isNew) return { label: 'New', style: 'new', icon: 'sprout', description: 'Listed within the last 7 days' };
    return null;
}

// Sample ordering signals only; replace with measured backend values when available.
export function compareProducts(a, b, sort, reviewStats = {}) {
    if (sort === 'trending') return b.interestGrowthScore - a.interestGrowthScore;
    if (sort === 'latest') return b.listedAt.localeCompare(a.listedAt);
    if (sort === 'best-selling') return (b.salesRankScore || 0) - (a.salesRankScore || 0) || a.name.localeCompare(b.name);
    if (sort === 'rating') return (reviewStats[b.id]?.average || 0) - (reviewStats[a.id]?.average || 0) || (reviewStats[b.id]?.count || 0) - (reviewStats[a.id]?.count || 0);
    if (sort === 'name') return a.name.localeCompare(b.name);
    return 0;
}
