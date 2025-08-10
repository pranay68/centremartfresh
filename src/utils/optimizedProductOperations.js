import products from '../data/products.json';

// Ensure products is an array
const productArray = Array.isArray(products) ? products :
    Array.isArray(products.products) ? products.products : [];

// Cache for processed products
let processedProductsCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Process a single product
const processProduct = (product) => ({
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
    inStock: Number(product.Stock) > 0,
    itemCode: product["Item Code"]
});

// Get total count without loading all products
export const getProductCount = () => {
    return productArray.length;
};

// Get products in chunks (pagination)
export const getProductsChunk = (startIndex = 0, chunkSize = 100) => {
    const endIndex = Math.min(startIndex + chunkSize, productArray.length);
    const chunk = productArray.slice(startIndex, endIndex);

    return {
        products: chunk.map(processProduct),
        startIndex,
        endIndex,
        hasMore: endIndex < productArray.length,
        total: productArray.length
    };
};

// Search products with pagination
export const searchProductsChunk = (searchTerm, startIndex = 0, chunkSize = 100) => {
    if (!searchTerm.trim()) {
        return getProductsChunk(startIndex, chunkSize);
    }

    const term = searchTerm.toLowerCase();
    const filtered = productArray.filter(product =>
        (product.Description || '').toLowerCase().includes(term) ||
        (product["Item Code"] || '').toLowerCase().includes(term) ||
        (product["Group Name"] || '').toLowerCase().includes(term) ||
        (product["Supplier Name"] || '').toLowerCase().includes(term)
    );

    const endIndex = Math.min(startIndex + chunkSize, filtered.length);
    const chunk = filtered.slice(startIndex, endIndex);

    return {
        products: chunk.map(processProduct),
        startIndex,
        endIndex,
        hasMore: endIndex < filtered.length,
        total: filtered.length,
        isFiltered: true
    };
};

// Get products by category with pagination
export const getProductsByCategoryChunk = (categoryName, startIndex = 0, chunkSize = 100) => {
    if (!categoryName || categoryName === 'All Products') {
        return getProductsChunk(startIndex, chunkSize);
    }

    const filtered = productArray.filter(product =>
        (product["Group Name"] || "").toLowerCase() === categoryName.toLowerCase()
    );

    const endIndex = Math.min(startIndex + chunkSize, filtered.length);
    const chunk = filtered.slice(startIndex, endIndex);

    return {
        products: chunk.map(processProduct),
        startIndex,
        endIndex,
        hasMore: endIndex < filtered.length,
        total: filtered.length,
        isFiltered: true
    };
};

// Get all categories (lightweight operation)
export const getAllCategories = () => {
    const categories = new Set();
    // Sample first 1000 products to get categories (much faster)
    const sampleSize = Math.min(1000, productArray.length);
    for (let i = 0; i < sampleSize; i++) {
        const category = productArray[i]["Group Name"];
        if (category) categories.add(category);
    }
    return Array.from(categories).sort();
};

// Get product by ID (optimized single lookup)
export const getProductById = (productId) => {
    const product = productArray.find(p => p.id === productId);
    return product ? processProduct(product) : null;
};

// Helpers
function isLocalhost() {
    try {
        if (typeof window === 'undefined') return false;
        const host = window.location.hostname;
        return host === 'localhost' || host === '127.0.0.1';
    } catch (_) {
        return false;
    }
}

// Local stock overrides (same as before)
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

// Field overrides (local-only, for dev/localhost)
const FIELD_OVERRIDES_KEY = 'cm_field_overrides_v1';

function loadFieldOverrides() {
    if (!isLocalhost()) return {};
    try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(FIELD_OVERRIDES_KEY) : null;
        return raw ? JSON.parse(raw) : {};
    } catch (_) {
        return {};
    }
}

function saveFieldOverrides(overrides) {
    if (!isLocalhost()) return;
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(FIELD_OVERRIDES_KEY, JSON.stringify(overrides));
        }
    } catch (_) {}
}

export function clearFieldOverrides() {
    if (!isLocalhost()) return;
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(FIELD_OVERRIDES_KEY);
        }
    } catch (_) {}
}

function coerceOverrideTypes(override) {
    const out = {...override };
    if (out.price != null) out.price = Math.round(Number(out.price) || 0);
    if (out.deliveryFee != null) out.deliveryFee = Math.round(Number(out.deliveryFee) || 0);
    if (out.stock != null) out.stock = Math.max(0, parseInt(out.stock, 10) || 0);
    if (out.name != null) out.name = String(out.name);
    if (out.category != null) out.category = String(out.category);
    if (out.offer != null) out.offer = String(out.offer);
    if (out.imageUrl != null) out.imageUrl = String(out.imageUrl);
    return out;
}

let itemCodeToIdCache = null;

function getItemCodeToIdMap() {
    if (itemCodeToIdCache) return itemCodeToIdCache;
    const map = new Map();
    for (const raw of productArray) {
        const code = raw ? (raw['Item Code'] != null ? raw['Item Code'] : raw.itemCode) : undefined;
        const id = raw ? raw.id : undefined;
        if (code != null && id != null) {
            map.set(String(code), String(id));
        }
    }
    itemCodeToIdCache = map;
    return map;
}

// Apply stock + field overrides to a chunk
export function applyStockOverridesToChunk(productsChunk) {
    const stockOverrides = loadStockOverrides();
    const fieldOverrides = loadFieldOverrides();
    return {
        ...productsChunk,
        products: productsChunk.products.map(p => {
            const merged = {...p };
            if (stockOverrides[p.id] != null) {
                merged.stock = stockOverrides[p.id];
            }
            const fo = fieldOverrides[p.id];
            if (fo) {
                const safe = coerceOverrideTypes(fo);
                Object.assign(merged, safe);
            }
            return merged;
        })
    };
}

// Replace/merge field overrides from CSV rows (local-only)
export function replaceFieldOverridesFromCsvRows(rows) {
    if (!isLocalhost()) return { updated: 0, missing: [] };
    const existing = loadFieldOverrides();
    const map = {...existing };
    const idx = getItemCodeToIdMap();
    let updated = 0;
    const missing = [];
    for (const r of rows || []) {
        const possibleId = r.id || r.ID || r.Id;
        const possibleCode = r.itemCode || r['Item Code'] || r.ItemCode || r['Item_Code'] || r['ITEM CODE'];
        const id = possibleId ? String(possibleId).trim() : (possibleCode ? idx.get(String(possibleCode).trim()) : undefined);
        if (!id) {
            if (possibleCode) missing.push(String(possibleCode));
            continue;
        }
        const override = {};
        if (r.name != null || r.Name != null || r.Description != null) override.name = r.name != null ? r.name : (r.Name != null ? r.Name : r.Description);
        if (r.price != null || r.Price != null || r.SP != null || r['SP'] != null || r['Last CP'] != null) override.price = r.price != null ? r.price : (r.Price != null ? r.Price : (r.SP != null ? r.SP : (r['SP'] != null ? r['SP'] : r['Last CP'])));
        if (r.category != null || r.Category != null || r['Group Name'] != null) override.category = r.category != null ? r.category : (r.Category != null ? r.Category : r['Group Name']);
        if (r.stock != null || r.Stock != null) override.stock = r.stock != null ? r.stock : r.Stock;
        if (r.offer != null || r.Offer != null) override.offer = r.offer != null ? r.offer : r.Offer;
        if (r.deliveryFee != null || r['Delivery Fee'] != null) override.deliveryFee = r.deliveryFee != null ? r.deliveryFee : r['Delivery Fee'];
        if (r.imageUrl != null || r.ImageUrl != null || r['Image URL'] != null) override.imageUrl = r.imageUrl != null ? r.imageUrl : (r.ImageUrl != null ? r.ImageUrl : r['Image URL']);
        const safe = coerceOverrideTypes(override);
        map[id] = {...(map[id] || {}), ...safe };
        updated++;
    }
    saveFieldOverrides(map);
    return { updated, missing };
}

// Custom products management (same as before)
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

// Get custom products count
export function getCustomProductsCount() {
    return loadCustomProducts().length;
}

// Get mixed chunk (custom products + JSON products)
export function getMixedProductsChunk(startIndex = 0, chunkSize = 100) {
    const customProducts = loadCustomProducts();
    const totalCustom = customProducts.length;
    const totalJson = productArray.length;
    const totalProducts = totalCustom + totalJson;

    if (startIndex >= totalProducts) {
        return {
            products: [],
            startIndex,
            endIndex: startIndex,
            hasMore: false,
            total: totalProducts
        };
    }

    const endIndex = Math.min(startIndex + chunkSize, totalProducts);
    const products = [];

    // First, add custom products
    if (startIndex < totalCustom) {
        const customStart = startIndex;
        const customEnd = Math.min(endIndex, totalCustom);
        products.push(...customProducts.slice(customStart, customEnd));
    }

    // Then, add JSON products
    if (endIndex > totalCustom) {
        const jsonStart = Math.max(0, startIndex - totalCustom);
        const jsonEnd = Math.min(endIndex - totalCustom, totalJson);
        const jsonChunk = productArray.slice(jsonStart, jsonEnd).map(processProduct);
        products.push(...jsonChunk);
    }

    // Apply stock overrides
    const overrides = loadStockOverrides();
    const processedProducts = products.map(p => ({
        ...p,
        stock: overrides[p.id] != null ? overrides[p.id] : p.stock
    }));

    return {
        products: processedProducts,
        startIndex,
        endIndex,
        hasMore: endIndex < totalProducts,
        total: totalProducts
    };
}