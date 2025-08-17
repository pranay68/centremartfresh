export function getUnitPrice(product) {
    if (!product) return 0;
    const candidates = [
        'unitPrice', 'price', 'sp', 'sellingPrice', 'mrp', 'originalPrice'
    ];
    for (const key of candidates) {
        const v = product[key];
        if (v !== undefined && v !== null && v !== '') {
            const n = Number(v);
            if (!Number.isNaN(n)) return n;
        }
    }
    // fallback to nested raw values
    if (product.raw && product.raw.price) {
        const n = Number(product.raw.price);
        if (!Number.isNaN(n)) return n;
    }
    return 0;
}

export default getUnitPrice;