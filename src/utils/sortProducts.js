export const sortByStock = (products) => {
    if (!Array.isArray(products)) return [];

    return [...products].sort((a, b) => {
        // First priority: Out of stock items go to bottom
        if (a.stock === 0 && b.stock !== 0) return 1;
        if (a.stock !== 0 && b.stock === 0) return -1;

        // Second priority: Low stock (≤2) items after in-stock items
        if (a.stock > 2 && b.stock <= 2) return -1;
        if (a.stock <= 2 && b.stock > 2) return 1;

        // If both are in same stock category, maintain original order
        return 0;
    });
};

export const getStockStatus = (stock) => {
    if (stock === 0) return 'out_of_stock';
    if (stock <= 2) return 'low_stock';
    return 'in_stock';
};