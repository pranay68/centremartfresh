import products from '../data/products.json';

// Ensure products is an array
const productArray = Array.isArray(products) ? products :
    Array.isArray(products.products) ? products.products : [];

// Process the products and normalize the data
export const getAllProducts = () => {
    return productArray.map(product => ({
        id: product.id,
        name: product.Description,
        price: Math.round(Number(product["Last CP"])) || 0,
        sp: Number(product.SP) || 0,
        mrp: Number(product.MRP) || 0,
        stock: Number(product.Stock) || 0,
        category: product["Group Name"] || "Uncategorized",
        unit: product["Base Unit"],
        margin: Number(product["Margin %"]) || 0,
        lastPurchaseDate: product["Last Purc Miti"],
        lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
        salesQty: Number(product["Sales Qty"]) || 0,
        supplierName: product["Supplier Name"],
        inStock: Number(product.Stock) > 0
    }));
};

export const getProductById = (productId) => {
    const product = productArray.find(p => p.id === productId);
    if (!product) return null;

    return {
        id: product.id,
        name: product.Description,
        price: Math.round(Number(product["Last CP"])) || 0,
        sp: Number(product.SP) || 0,
        mrp: Number(product.MRP) || 0,
        stock: Number(product.Stock) || 0,
        category: product["Group Name"] || "Uncategorized",
        unit: product["Base Unit"],
        margin: Number(product["Margin %"]) || 0,
        lastPurchaseDate: product["Last Purc Miti"],
        lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
        salesQty: Number(product["Sales Qty"]) || 0,
        supplierName: product["Supplier Name"],
        inStock: Number(product.Stock) > 0
    };
};

export const getProductsByCategory = (categoryName) => {
    return productArray
        .filter(product => product["Group Name"] === categoryName)
        .map(product => ({
            id: product.id,
            name: product.Description,
            price: Number(product["Last CP"]) || 0,
            sp: Number(product.SP) || 0,
            mrp: Number(product.MRP) || 0,
            stock: Number(product.Stock) || 0,
            category: product["Group Name"] || "Uncategorized",
            unit: product["Base Unit"],
            margin: Number(product["Margin %"]) || 0,
            lastPurchaseDate: product["Last Purc Miti"],
            lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
            salesQty: Number(product["Sales Qty"]) || 0,
            supplierName: product["Supplier Name"],
            inStock: Number(product.Stock) > 0
        }));
};

export const searchProducts = (searchTerm) => {
    const term = searchTerm.toLowerCase();
    return productArray
        .filter(product =>
            product.Description.toLowerCase().includes(term) ||
            product["Group Name"].toLowerCase().includes(term) ||
            product["Supplier Name"].toLowerCase().includes(term)
        )
        .map(product => ({
            id: product.id,
            name: product.Description,
            price: Number(product["Last CP"]) || 0,
            sp: Number(product.SP) || 0,
            mrp: Number(product.MRP) || 0,
            stock: Number(product.Stock) || 0,
            category: product["Group Name"] || "Uncategorized",
            unit: product["Base Unit"],
            margin: Number(product["Margin %"]) || 0,
            lastPurchaseDate: product["Last Purc Miti"],
            lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
            salesQty: Number(product["Sales Qty"]) || 0,
            supplierName: product["Supplier Name"],
            inStock: Number(product.Stock) > 0
        }));
};

export const getTopSellingProducts = (limit = 10) => {
    return products
        .sort((a, b) => Number(b["Sales Qty"]) - Number(a["Sales Qty"]))
        .slice(0, limit)
        .map(product => ({
            id: product.id,
            name: product.Description,
            price: Number(product["Last CP"]) || 0,
            sp: Number(product.SP) || 0,
            mrp: Number(product.MRP) || 0,
            stock: Number(product.Stock) || 0,
            category: product["Group Name"] || "Uncategorized",
            unit: product["Base Unit"],
            margin: Number(product["Margin %"]) || 0,
            lastPurchaseDate: product["Last Purc Miti"],
            lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
            salesQty: Number(product["Sales Qty"]) || 0,
            supplierName: product["Supplier Name"],
            inStock: Number(product.Stock) > 0
        }));
};

export const getAllCategories = () => {
    return [...new Set(products.map(product => product["Group Name"]))];
};

export const getProductsByIds = (ids) => {
    const idSet = new Set(ids);
    return getAllProducts().filter(p => idSet.has(p.id));
};

// Get products with low stock (less than or equal to 5)
export const getLowStockProducts = () => {
    return products
        .filter(product => Number(product.Stock) <= 5)
        .map(product => ({
            id: product.id,
            name: product.Description,
            price: Number(product["Last CP"]) || 0,
            sp: Number(product.SP) || 0,
            mrp: Number(product.MRP) || 0,
            stock: Number(product.Stock) || 0,
            category: product["Group Name"] || "Uncategorized",
            unit: product["Base Unit"],
            margin: Number(product["Margin %"]) || 0,
            lastPurchaseDate: product["Last Purc Miti"],
            lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
            salesQty: Number(product["Sales Qty"]) || 0,
            supplierName: product["Supplier Name"],
            inStock: Number(product.Stock) > 0
        }));
};

// Get products with high margin (greater than 30%)
export const getHighMarginProducts = () => {
    return products
        .filter(product => Number(product["Margin %"]) > 30)
        .map(product => ({
            id: product.id,
            name: product.Description,
            price: Number(product["Last CP"]) || 0,
            sp: Number(product.SP) || 0,
            mrp: Number(product.MRP) || 0,
            stock: Number(product.Stock) || 0,
            category: product["Group Name"] || "Uncategorized",
            unit: product["Base Unit"],
            margin: Number(product["Margin %"]) || 0,
            lastPurchaseDate: product["Last Purc Miti"],
            lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
            salesQty: Number(product["Sales Qty"]) || 0,
            supplierName: product["Supplier Name"],
            inStock: Number(product.Stock) > 0
        }));
};

// --- Local stock overrides (persisted in localStorage) ---
const STOCK_OVERRIDES_KEY = 'cm_local_stock_overrides_v1';

function loadStockOverrides() {
    try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STOCK_OVERRIDES_KEY) : null;
        return raw ? JSON.parse(raw) : {};
    } catch (_) {
        return {};
    }
}

function saveStockOverrides(overrides) {
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STOCK_OVERRIDES_KEY, JSON.stringify(overrides));
        }
    } catch (_) {}
}

export function getProductStock(productId) {
    const overrides = loadStockOverrides();
    if (overrides[productId] != null) return overrides[productId];
    const raw = productArray.find(p => p.id === productId);
    return raw ? Number(raw.Stock) || 0 : 0;
}

export function setProductStock(productId, newStock) {
    const overrides = loadStockOverrides();
    overrides[productId] = Math.max(0, parseInt(newStock, 10) || 0);
    saveStockOverrides(overrides);
    return overrides[productId];
}

export function adjustProductStock(productId, delta) {
    const current = getProductStock(productId);
    return setProductStock(productId, current + (parseInt(delta, 10) || 0));
}

export function getAllProductsWithOverrides() {
    const overrides = loadStockOverrides();
    return getAllProducts().map(p => ({
        ...p,
        stock: overrides[p.id] != null ? overrides[p.id] : p.stock
    }));
}