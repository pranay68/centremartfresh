// Central loader for public product snapshot (/data/products.json)
// Exposes synchronous getters backed by a background fetch that populates the cache.

let cached = [];
let loading = null;

function mapRawToProcessed(raw) {
    const description = raw.Description != null ? raw.Description : raw.description;
    const groupName = raw['Group Name'] != null ? raw['Group Name'] : (raw.group_name != null ? raw.group_name : raw.groupName);
    const spValue = Number(raw.SP != null ? raw.SP : raw.sp);
    const mrpValue = Number(raw.MRP != null ? raw.MRP : raw.mrp);
    const stockValue = Number(raw.Stock != null ? raw.Stock : raw.stock);
    const marginValue = Number(raw['Margin %'] != null ? raw['Margin %'] : (raw.margin_percent != null ? raw.margin_percent : raw.marginPercent));
    const lastPurcQty = Number(raw['Last Purc Qty'] != null ? raw['Last Purc Qty'] : (raw.last_purc_qty != null ? raw.last_purc_qty : raw.lastPurcQty));
    const salesQtyVal = Number(raw['Sales Qty'] != null ? raw['Sales Qty'] : (raw.sales_qty != null ? raw.sales_qty : raw.salesQty));
    const stockNum = Number.isFinite(stockValue) ? stockValue : 0;
    const spNum = Number.isFinite(spValue) ? spValue : 0;
    const mrpNum = Number.isFinite(mrpValue) ? mrpValue : 0;
    const marginNum = Number.isFinite(marginValue) ? marginValue : 0;
    const lastPurcQtyNum = Number.isFinite(lastPurcQty) ? lastPurcQty : 0;
    const salesQtyNum = Number.isFinite(salesQtyVal) ? salesQtyVal : 0;

    return {
        id: raw.id,
        name: description || '',
        price: spNum,
        sp: spNum,
        mrp: mrpNum,
        stock: stockNum,
        category: groupName || 'Uncategorized',
        unit: raw['Base Unit'] != null ? raw['Base Unit'] : (raw.base_unit != null ? raw.base_unit : raw.baseUnit),
        margin: marginNum,
        lastPurchaseDate: raw['Last Purc Miti'] != null ? raw['Last Purc Miti'] : (raw.last_purc_miti != null ? raw.last_purc_miti : raw.lastPurcMiti),
        lastPurchaseQty: lastPurcQtyNum,
        salesQty: salesQtyNum,
        supplierName: raw['Supplier Name'] != null ? raw['Supplier Name'] : (raw.supplier_name != null ? raw.supplier_name : raw.supplierName),
        inStock: stockNum > 0,
        itemCode: raw['Item Code'] != null ? raw['Item Code'] : (raw.item_code != null ? raw.item_code : raw.itemCode),
        imageUrl: raw.imageUrl != null ? raw.imageUrl : (raw.image_url != null ? raw.image_url : (raw.image != null ? raw.image : null)),
        // expose full image arrays so UI can use image_urls directly
        image_urls: Array.isArray(raw.image_urls) ?
            raw.image_urls :
            (Array.isArray(raw.images) ? raw.images.slice() : (raw.image_urls ? [raw.image_urls] : (raw.image_url ? [raw.image_url] : (raw.image ? [raw.image] : [])))),
        images: Array.isArray(raw.images) ? raw.images.slice() : (Array.isArray(raw.image_urls) ? raw.image_urls.slice() : (raw.image ? [raw.image] : (raw.image_url ? [raw.image_url] : []))),
        additionalImages: Array.isArray(raw.image_urls) && raw.image_urls.length > 0 ? raw.image_urls.slice(1) : (Array.isArray(raw.images) && raw.images.length > 1 ? raw.images.slice(1) : []),
        raw,
    };
}

async function loadPublic() {
    if (loading) return loading;
    loading = (async() => {
        try {
            const res = await fetch('/data/products.json', { cache: 'no-cache' });
            if (!res.ok) throw new Error('Public snapshot not available');
            const json = await res.json();
            const arr = Array.isArray(json) ? json : (Array.isArray(json.products) ? json.products : []);
            const processed = arr.map(r => mapRawToProcessed(r));
            cached = processed;
            try { localStorage.setItem('public_products_snapshot', JSON.stringify(processed)); } catch (_) {}
            return cached;
        } catch (e) {
            // Try local bundled fallback
            try {
                // eslint-disable-next-line global-require
                const fallback = require('../data/products.json');
                const arr = Array.isArray(fallback) ? fallback : (Array.isArray(fallback.products) ? fallback.products : []);
                const processed = arr.map(r => mapRawToProcessed(r));
                cached = processed;
                return cached;
            } catch (_) {
                cached = [];
                return cached;
            }
        }
    })();
    return loading;
}

// Start loading immediately (best-effort)
void loadPublic();

export function getAllCached() {
    return cached.slice();
}

export function getTotalCount() {
    return cached.length;
}

export function getChunk(start = 0, size = 100) {
    return cached.slice(start, start + size);
}

export function getById(id) {
    return cached.find(p => String(p.id) === String(id)) || null;
}

export function getByCategory(category) {
    if (!category) return [];
    const normalized = String(category).trim().toLowerCase();
    return cached.filter(p => (p.category || '').toString().trim().toLowerCase() === normalized);
}

export async function ensureLoaded() {
    await loadPublic();
    return cached.slice();
}

export async function refresh() {
    loading = null;
    return loadPublic();
}

const publicProducts = {
    getAllCached,
    getTotalCount,
    getChunk,
    getById,
    getByCategory,
    ensureLoaded,
    refresh,
};

export default publicProducts;