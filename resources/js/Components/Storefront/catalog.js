// Design fixtures only. These listings are not connected to sellers or inventory.
export const products = [
    { id: 'pechay', name: 'Fresh Pechay', barangay: 'Rosario', price: 35, unit: 'bunch', category: 'Vegetables', rating: 4.9, reviews: 120, photo: 0, listedAt: '2026-09-01', salesRankScore: 120, interestGrowthScore: 12, stock: 32, isBestSeller: true },
    { id: 'tomatoes', name: 'Native Tomatoes', barangay: 'Maybunga', price: 60, unit: 'kg', category: 'Fruits', rating: 4.8, reviews: 93, photo: 1, listedAt: '2026-09-02', salesRankScore: 95, interestGrowthScore: 85, stock: 24, isTrending: true },
    { id: 'eggplant', name: 'Fresh Eggplant', barangay: 'Sto. Tomas', price: 70, unit: 'kg', category: 'Vegetables', rating: 4.7, reviews: 76, photo: 2, listedAt: '2026-09-03', salesRankScore: 72, interestGrowthScore: 18, stock: 18 },
    { id: 'cucumber', name: 'Crisp Cucumber', barangay: 'Rosario', price: 55, unit: 'kg', category: 'Vegetables', rating: 4.8, reviews: 54, photo: 3, listedAt: '2026-09-10', salesRankScore: 38, interestGrowthScore: 25, stock: 26, isNew: true },
    { id: 'carrots', name: 'Fresh Carrots', barangay: 'Maybunga', price: 80, unit: 'kg', category: 'Vegetables', rating: 4.9, reviews: 68, photo: 4, listedAt: '2026-09-09', salesRankScore: 45, interestGrowthScore: 20, stock: 20, isNew: true },
    { id: 'lettuce', name: 'Green Lettuce', barangay: 'Sto. Tomas', price: 45, unit: 'head', category: 'Vegetables', rating: 4.8, reviews: 52, photo: 5, listedAt: '2026-09-08', salesRankScore: 40, interestGrowthScore: 22, stock: 16, isNew: true },
    { id: 'kangkong', name: 'Fresh Kangkong', barangay: 'Rosario', price: 25, unit: 'bunch', category: 'Vegetables', rating: 4.8, reviews: 41, photo: 6, listedAt: '2026-09-04', salesRankScore: 88, interestGrowthScore: 70, stock: 35, isTrending: true },
    { id: 'okra', name: 'Fresh Okra', barangay: 'Maybunga', price: 60, unit: 'kg', category: 'Vegetables', rating: 4.7, reviews: 38, photo: 7, listedAt: '2026-09-05', salesRankScore: 54, interestGrowthScore: 15, stock: 22 },
    { id: 'beans', name: 'String Beans', barangay: 'Sto. Tomas', price: 50, unit: 'bunch', category: 'Beans', rating: 4.8, reviews: 32, photo: 8, listedAt: '2026-09-06', salesRankScore: 48, interestGrowthScore: 10, stock: 28 },
    { id: 'basil', name: 'Sweet Basil', barangay: 'Rosario', price: 30, unit: 'bunch', category: 'Herbs', rating: 4.9, reviews: 24, photo: 9, listedAt: '2026-09-11', salesRankScore: 20, interestGrowthScore: 16, stock: 12, isNew: true },
    { id: 'calamansi', name: 'Fresh Calamansi', barangay: 'Maybunga', price: 65, unit: 'kg', category: 'Fruits', rating: 4.8, reviews: 47, photo: 10, listedAt: '2026-09-07', salesRankScore: 62, interestGrowthScore: 14, stock: 30 },
    { id: 'squash', name: 'Golden Squash', barangay: 'Sto. Tomas', price: 40, unit: 'kg', category: 'Vegetables', rating: 4.7, reviews: 29, photo: 11, listedAt: '2026-09-02', salesRankScore: 50, interestGrowthScore: 11, stock: 15 },
];

export const communities = [
    { name: 'Rosario', description: 'Lush gardens, stronger together.' },
    { name: 'Maybunga', description: 'Fresh produce, brighter days.' },
    { name: 'Sto. Tomas', description: 'Local harvests, local pride.' },
];

export const marketHref = (barangay) => `/?page=marketplace${barangay ? `&barangay=${encodeURIComponent(barangay)}` : ''}`;
export const money = (value) => `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

// Preview flags represent separate sales and interest signals, never ratings.
// Future backend eligibility: completed sales for Best Seller; rising interest for Trending.
export function getProductBadge(product) {
    if (product.isBestSeller) return { label: 'Best Seller', style: 'bestseller', icon: 'trophy' };
    if (product.isTrending) return { label: 'Trending', style: 'trending', icon: 'trend' };
    if (product.isNew) return { label: 'New', style: 'new', icon: 'sprout' };
    return null;
}

// Sample ordering signals only; replace with measured backend values when available.
export function compareProducts(a, b, sort) {
    if (sort === 'trending') return b.interestGrowthScore - a.interestGrowthScore;
    if (sort === 'latest') return b.listedAt.localeCompare(a.listedAt);
    if (sort === 'best-selling') return b.salesRankScore - a.salesRankScore;
    if (sort === 'rating') return b.rating - a.rating;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return 0;
}
