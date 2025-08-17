// Runtime product loader: prefer public snapshot at /data/products.json
let productArray = [];
// placeholder flag if needed later
let productsLoaded = false;

async function fetchPublicProducts() {
    try {
        const res = await fetch('/data/products.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('Failed to fetch public products');
        const json = await res.json();
        const arr = Array.isArray(json) ? json : (Array.isArray(json.products) ? json.products : []);
        productArray = arr;
        productsLoaded = true;
        return arr;
    } catch (e) {
        // Fallback to local bundled JSON if present
        try {
            // eslint-disable-next-line global-require, import/no-dynamic-require
            // eslint-disable-next-line no-undef
            const fallback = require('../data/products.json');
            const arr = Array.isArray(fallback) ? fallback : (Array.isArray(fallback.products) ? fallback.products : []);
            productArray = arr;
            productsLoaded = true;
            return arr;
        } catch (_) {
            productArray = [];
            productsLoaded = true;
            return [];
        }
    }
}

// start loading immediately (best-effort)
void fetchPublicProducts();

// Process the products and normalize the data
export const getAllProducts = () => {
    const arr = productArray || [];
    return arr.map(product => ({
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
    const arr = productArray || [];
    const product = arr.find(p => p.id === productId);
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
    const arr = productArray || [];
    return arr
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
    const term = (searchTerm || '').toLowerCase();
    const arr = productArray || [];
    return arr
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
    const arr = productArray || [];
    return arr
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
    const arr = productArray || [];
    return [...new Set(arr.map(product => product["Group Name"]))];
};

export const getProductsByIds = (ids) => {
    const idSet = new Set(ids);
    return getAllProducts().filter(p => idSet.has(p.id));
};

// Get products with low stock (less than or equal to 5)
export const getLowStockProducts = () => {
    const arr = productArray || [];
    return arr
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
    const arr = productArray || [];
    return arr
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

// --- Local product management (for admin panel) ---
const CUSTOM_PRODUCTS_KEY = 'cm_custom_products_v1';

function loadCustomProducts() {
    try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(CUSTOM_PRODUCTS_KEY) : null;
        return raw ? JSON.parse(raw) : [];
    } catch (_) {
        return [];
    }
}

function saveCustomProducts(customProducts) {
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(customProducts));
        }
    } catch (_) {}
}

// Generate next ID for custom products
function generateProductId() {
    const customProducts = loadCustomProducts();
    const maxId = Math.max(
        ...productArray.map(p => parseInt(p.id) || 0),
        ...customProducts.map(p => parseInt(p.id) || 0),
        0
    );
    return String(maxId + 1);
}

// Add a new product (admin only)
export function addProduct(productData) {
    const customProducts = loadCustomProducts();
    const newProduct = {
        id: generateProductId(),
        name: productData.name || '',
        price: parseFloat(productData.price) || 0,
        description: productData.description || '',
        category: productData.category || 'Uncategorized',
        deliveryFee: parseFloat(productData.deliveryFee) || 0,
        offer: productData.offer || '',
        stock: parseInt(productData.stock) || 0,
        imageUrl: productData.imageUrl || 'https://via.placeholder.com/40',
        createdAt: new Date().toISOString(),
        isCustom: true
    };
    customProducts.push(newProduct);
    saveCustomProducts(customProducts);
    return newProduct;
}

// Update a product (admin only)
export function updateProduct(productId, updates) {
    const customProducts = loadCustomProducts();
    const index = customProducts.findIndex(p => p.id === productId);

    if (index !== -1) {
        // Update custom product
        customProducts[index] = {...customProducts[index], ...updates };
        saveCustomProducts(customProducts);
        return customProducts[index];
    } else {
        // For JSON products, we can only update stock via overrides
        // Other fields would need to be handled differently
        if (updates.stock !== undefined) {
            setProductStock(productId, updates.stock);
        }
        return getProductById(productId);
    }
}

// Delete a product (admin only - only custom products can be deleted)
export function deleteProduct(productId) {
    const customProducts = loadCustomProducts();
    const filtered = customProducts.filter(p => p.id !== productId);
    if (filtered.length < customProducts.length) {
        saveCustomProducts(filtered);
        return true;
    }
    return false; // Cannot delete JSON products
}

// Get all products including custom ones
export function getAllProductsIncludingCustom() {
    const jsonProducts = getAllProducts();
    const customProducts = loadCustomProducts();
    const overrides = loadStockOverrides();

    // Merge and apply stock overrides
    const allProducts = [...jsonProducts, ...customProducts].map(p => ({
        ...p,
        stock: overrides[p.id] != null ? overrides[p.id] : p.stock
    }));

    return allProducts;
}