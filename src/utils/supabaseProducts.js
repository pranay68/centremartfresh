// Supabase-backed product operations (client-side)
// Provides chunked loading, search, and category filter similar to optimizedProductOperations

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // eslint-disable-next-line no-console
    console.warn('Supabase env not set (REACT_APP_SUPABASE_URL/REACT_APP_SUPABASE_ANON_KEY).');
}

// Create client with persistSession disabled to avoid multiple GoTrueClient instances
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ?
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }) :
    null;

// Prefer canonical view if present; fallback to base table
const PRIMARY_VIEW = 'products_canonical';
const BASE_TABLE = 'products';

async function selectWithFallback(selectArgsFn) {
    if (!supabase) {
        const err = new Error('Supabase not configured');
        // eslint-disable-next-line no-console
        console.error('[Supabase] Client not configured. Check REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
        return { data: null, error: err };
    }
    // Try the view first
    try {
        const query = selectArgsFn(PRIMARY_VIEW);
        const { data, error, count } = await query;
        if (!error) {
            // eslint-disable-next-line no-console
            console.debug(`[Supabase] Using relation: ${PRIMARY_VIEW}, count: ${typeof count !== 'undefined' ? count : 'n/a'}`);
            return { data, error, count };
        }
        // eslint-disable-next-line no-console
        console.warn(`[Supabase] Primary view failed (${PRIMARY_VIEW}). Falling back to ${BASE_TABLE}. Error:`, (error && error.message) ? error.message : error);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[Supabase] Exception querying ${PRIMARY_VIEW}. Falling back.`, e);
    }
    // Fallback to table - handle network exceptions explicitly
    try {
        const fallbackQuery = selectArgsFn(BASE_TABLE);
        const fallbackResult = await fallbackQuery;
        if (fallbackResult && fallbackResult.error) {
            // eslint-disable-next-line no-console
            console.error(`[Supabase] Fallback ${BASE_TABLE} also failed:`, (fallbackResult.error && fallbackResult.error.message) ? fallbackResult.error.message : fallbackResult.error);
        } else {
            // eslint-disable-next-line no-console
            console.debug(`[Supabase] Using relation: ${BASE_TABLE}`);
        }
        return fallbackResult;
    } catch (e) {
        // Network or unexpected error
        // eslint-disable-next-line no-console
        console.error(`[Supabase] Exception during fallback query on ${BASE_TABLE}:`, e);
        return { data: null, error: e };
    }
}

// Internal cache of processed products (to enable fast search/filter on the client)
let cachedProducts = [];
let cachedTotal = 0;
let cacheFullyLoaded = false;

// Local storage cache keys (shared with other modules)
const CACHE_KEY = 'supabase_products_snapshot_v1';
const CACHE_UPDATED_KEY = 'supabase_products_snapshot_updated_at_v1';

export function clearSupabaseCache() {
    cachedProducts = [];
    cachedTotal = 0;
    cacheFullyLoaded = false;
    try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_UPDATED_KEY);
    } catch (_) {}
}

// Load public snapshot from /data/products.json and populate cachedProducts.
async function loadPublicSnapshot() {
    if (cacheFullyLoaded && cachedProducts && cachedProducts.length > 0) return cachedProducts;
    if (typeof window === 'undefined') return null;
    try {
        const res = await fetch('/data/products.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('Public snapshot not available');
        const json = await res.json();
        const rawArr = Array.isArray(json) ? json : (Array.isArray(json.products) ? json.products : []);
        const raws = rawArr.map(rowToRaw);
        const processed = raws.map(mapRawToProcessed);
        cachedProducts = processed.slice();
        cachedTotal = processed.length;
        cacheFullyLoaded = true;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(processed)); } catch (_) {}
        return cachedProducts;
    } catch (e) {
        // public snapshot not available
        return null;
    }
}

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
        // price should come from SP
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
        // image handling: accept multiple possible column names and array fields
        imageUrl: raw.imageUrl != null ? raw.imageUrl : (raw.image_url != null ? raw.image_url : (raw.image != null ? raw.image : null)),
        additionalImages: Array.isArray(raw.image_urls) && raw.image_urls.length > 0 ? raw.image_urls : (Array.isArray(raw.images) && raw.images.length > 0 ? raw.images.slice(1) : []),
    };
}

function rowToRaw(row) {
    if (row && row.raw && typeof row.raw === 'object') return row.raw;
    const r = row || {};
    return {
        id: r.id,
        'Item Code': r['Item Code'] != null ? r['Item Code'] : (r.item_code != null ? r.item_code : r.itemCode),
        Description: r.Description != null ? r.Description : r.description,
        'Base Unit': r['Base Unit'] != null ? r['Base Unit'] : (r.base_unit != null ? r.base_unit : r.baseUnit),
        'Group ID': r['Group ID'] != null ? r['Group ID'] : (r.group_id != null ? r.group_id : r.groupId),
        'Group Name': r['Group Name'] != null ? r['Group Name'] : (r.group_name != null ? r.group_name : r.groupName),
        'Sub Group': r['Sub Group'] != null ? r['Sub Group'] : (r.sub_group != null ? r.sub_group : r.subGroup),
        'Supplier Name': r['Supplier Name'] != null ? r['Supplier Name'] : (r.supplier_name != null ? r.supplier_name : r.supplierName),
        'Last CP': r['Last CP'] != null ? r['Last CP'] : (r.last_cp != null ? r.last_cp : r.lastCp),
        'Taxable CP': r['Taxable CP'] != null ? r['Taxable CP'] : (r.taxable_cp != null ? r.taxable_cp : r.taxableCp),
        SP: r.SP != null ? r.SP : r.sp,
        Stock: r.Stock != null ? r.Stock : r.stock,
        'Last Purc Miti': r['Last Purc Miti'] != null ? r['Last Purc Miti'] : (r.last_purc_miti != null ? r.last_purc_miti : r.lastPurcMiti),
        'Last Purc Qty': r['Last Purc Qty'] != null ? r['Last Purc Qty'] : (r.last_purc_qty != null ? r.last_purc_qty : r.lastPurcQty),
        'Sales Qty': r['Sales Qty'] != null ? r['Sales Qty'] : (r.sales_qty != null ? r.sales_qty : r.salesQty),
        '#': r['#'] != null ? r['#'] : r.hash,
        'Margin %': r['Margin %'] != null ? r['Margin %'] : (r.margin_percent != null ? r.margin_percent : r.marginPercent),
        MRP: r.MRP != null ? r.MRP : r.mrp,
        // preserve common image fields so mapping can pick them up
        imageUrl: r.imageUrl != null ? r.imageUrl : (r.image_url != null ? r.image_url : (r.image != null ? r.image : null)),
        image_urls: r.image_urls != null ? r.image_urls : (r.additionalImages != null ? r.additionalImages : null),
        images: r.images != null ? r.images : null,
    };
}

export async function getSupabaseProductCount() {
    // Prefer public snapshot when available
    if (typeof window !== 'undefined') {
        if (cachedTotal && cachedTotal > 0) return cachedTotal;
        const pub = await loadPublicSnapshot();
        if (pub && Array.isArray(pub)) return cachedTotal || pub.length || 0;
    }
    if (!supabase) return cachedTotal || 0;
    const { count, error } = await selectWithFallback((relation) =>
        supabase.from(relation).select('*', { count: 'exact', head: true })
    );
    if (error) {
        // eslint-disable-next-line no-console
        console.error('[Supabase] Count error:', error.message || error);
        return cachedTotal || 0;
    }
    // eslint-disable-next-line no-console
    console.debug('[Supabase] Total products:', count || 0);
    cachedTotal = count || 0;
    return cachedTotal;
}

/**
 * Returns the latest updated_at timestamp from the products relation (view or table), if available.
 * Falls back to null if the column doesn't exist.
 */
export async function getSupabaseLastUpdate() {
    if (!supabase) return null;
    try {
        // Try updated_at first
        let res = await selectWithFallback((relation) =>
            supabase.from(relation).select('updated_at').order('updated_at', { ascending: false }).limit(1)
        );
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            return res.data[0].updated_at || null;
        }

        // Fallback: try created_at if updated_at doesn't exist
        res = await selectWithFallback((relation) =>
            supabase.from(relation).select('created_at').order('created_at', { ascending: false }).limit(1)
        );
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            return res.data[0].created_at || null;
        }

        // Final fallback: do a head query to ensure relation exists, but no timestamp available
        await selectWithFallback((relation) => supabase.from(relation).select('*', { head: true, count: 'exact' }));
        return null;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Supabase] getSupabaseLastUpdate failed', e);
        return null;
    }
}

// Fetch all products and detect duplicates. Cache snapshot in localStorage for quick loads.
export async function fetchAndCacheAllProducts( /* options = {} */ ) {
    // Reading now prefers public snapshot at /data/products.json; options currently unused
    // Instead of reading from Supabase, read the public snapshot at /data/products.json
    // Writes still go to Supabase via admin endpoints; reads are served from the public file.
    try {
        const res = await fetch('/data/products.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('Failed to fetch /data/products.json');
        const json = await res.json();
        const rawArr = Array.isArray(json) ? json : (Array.isArray(json.products) ? json.products : []);
        const raws = rawArr.map(rowToRaw);
        const processed = raws.map(mapRawToProcessed);

        // detect duplicates
        const seen = new Map();
        const duplicates = [];
        for (const p of processed) {
            const key = (p.itemCode || p['Item Code'] || p.id || '').toString().trim();
            if (!key) continue;
            if (seen.has(key)) duplicates.push({ key, existing: seen.get(key), row: p });
            else seen.set(key, p);
        }

        if (duplicates.length > 0) {
            // cache anyway but report duplicates
            try { localStorage.setItem(CACHE_KEY, JSON.stringify(processed)); } catch (_) {}
            cachedProducts = processed.slice();
            cachedTotal = processed.length;
            cacheFullyLoaded = true;
            return { products: processed, duplicates, fromCache: false, lastUpdate: null };
        }

        // save snapshot
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(processed)); } catch (_) {}
        cachedProducts = processed.slice();
        cachedTotal = processed.length;
        cacheFullyLoaded = true;
        return { products: processed, duplicates: [], fromCache: false, lastUpdate: null };
    } catch (err) {
        // Fallback to Supabase if public snapshot unavailable
        // eslint-disable-next-line no-console
        console.warn('[supabaseProducts] public snapshot fetch failed, falling back to Supabase:', err);
        const all = await getAllSupabaseProducts();
        cachedProducts = all.slice();
        cachedTotal = all.length;
        cacheFullyLoaded = true;
        return { products: all, duplicates: [], fromCache: false, lastUpdate: null };
    }
}

export async function getSupabaseProductsChunk(startIndex = 0, chunkSize = 100) {
    // Prefer public snapshot
    if (typeof window !== 'undefined') {
        const pub = await loadPublicSnapshot();
        if (pub && Array.isArray(cachedProducts) && cachedProducts.length > 0) {
            const total = cachedTotal || cachedProducts.length;
            const slice = cachedProducts.slice(startIndex, startIndex + chunkSize);
            const endIndex = Math.min(startIndex + chunkSize - 1, total - 1);
            const hasMore = startIndex + chunkSize < total;
            return { products: slice, startIndex, endIndex, hasMore, total };
        }
    }

    if (!supabase) {
        return { products: [], startIndex, endIndex: startIndex, hasMore: false, total: 0 };
    }

    const endIndex = startIndex + chunkSize - 1;
    const { data, error } = await selectWithFallback((relation) =>
        supabase
        .from(relation)
        .select('*')
        .order('id', { ascending: true })
        .range(startIndex, endIndex)
    );

    if (error) {
        // eslint-disable-next-line no-console
        console.error('[Supabase] Chunk fetch error:', error.message || error, { startIndex, endIndex });
        return { products: [], startIndex, endIndex: startIndex, hasMore: false, total: cachedTotal };
    }

    const raws = (data || []).map(rowToRaw);
    const processed = raws.map(mapRawToProcessed);
    // eslint-disable-next-line no-console
    console.debug('[Supabase] Fetched chunk size:', processed.length, { startIndex, endIndex });

    // Update cache
    // Extend cachedProducts to hold up to endIndex
    if (processed.length > 0) {
        if (cachedProducts.length < startIndex) {
            cachedProducts.length = startIndex; // create sparse if needed
        }
        for (let i = 0; i < processed.length; i += 1) {
            cachedProducts[startIndex + i] = processed[i];
        }
    }

    const total = cachedTotal || (await getSupabaseProductCount());
    const hasMore = endIndex + 1 < total;
    if (!hasMore) cacheFullyLoaded = true;

    return { products: processed, startIndex, endIndex: Math.min(endIndex, total), hasMore, total };
}

async function ensureAllCached() {
    if (cacheFullyLoaded) return;
    // Try public snapshot first
    const pub = await loadPublicSnapshot();
    if (pub && Array.isArray(cachedProducts) && cachedProducts.length > 0) return;
    if (!supabase) return;
    const total = cachedTotal || (await getSupabaseProductCount());
    const pageSize = 1000;
    for (let start = 0; start < total; start += pageSize) {
        // eslint-disable-next-line no-await-in-loop
        await getSupabaseProductsChunk(start, pageSize);
    }
    cacheFullyLoaded = true;
}

export async function searchSupabaseProductsChunk(searchTerm, startIndex = 0, chunkSize = 100) {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) {
        return getSupabaseProductsChunk(startIndex, chunkSize);
    }
    await ensureAllCached();
    const list = cachedProducts.filter((p) => {
        const hay = [
            p.name || '',
            p.itemCode || '',
            p.category || '',
            p.supplierName || '',
        ].join(' ').toLowerCase();
        return hay.includes(term);
    });
    const end = Math.min(startIndex + chunkSize, list.length);
    return {
        products: list.slice(startIndex, end),
        startIndex,
        endIndex: end,
        hasMore: end < list.length,
        total: list.length,
        isFiltered: true,
    };
}

export async function getSupabaseProductsByCategoryChunk(categoryName, startIndex = 0, chunkSize = 100) {
    if (!categoryName || categoryName === 'All Products') {
        return getSupabaseProductsChunk(startIndex, chunkSize);
    }
    await ensureAllCached();
    const list = cachedProducts.filter((p) => (p.category || '').toLowerCase() === categoryName.toLowerCase());
    const end = Math.min(startIndex + chunkSize, list.length);
    return {
        products: list.slice(startIndex, end),
        startIndex,
        endIndex: end,
        hasMore: end < list.length,
        total: list.length,
        isFiltered: true,
    };
}

export async function getAllSupabaseProducts(maxItems = Infinity) {
    // Prefer public snapshot when available
    const pub = await loadPublicSnapshot();
    if (pub && Array.isArray(cachedProducts) && cachedProducts.length > 0) return cachedProducts.slice(0, Number.isFinite(maxItems) ? maxItems : cachedProducts.length);
    if (!supabase) return [];
    // Always use chunked fetch to reliably load very large datasets.
    const total = await getSupabaseProductCount();
    const toFetch = Math.min(total, Number.isFinite(maxItems) ? maxItems : total);
    const pageSize = 1000;
    const result = [];
    for (let start = 0; start < toFetch; start += pageSize) {
        // eslint-disable-next-line no-await-in-loop
        const chunk = await getSupabaseProductsChunk(start, Math.min(pageSize, toFetch - start));
        result.push(...(chunk.products || []));
    }
    // mark cache as fully loaded
    cacheFullyLoaded = result.length >= total;
    cachedProducts = result.slice();
    cachedTotal = cachedProducts.length;
    return result;
}

export function getCachedSupabaseProducts() {
    return cachedProducts.filter(Boolean);
}

export async function upsertSupabaseRawRows(rawRows = []) {
    if (!supabase) throw new Error('Supabase not configured');
    if (!Array.isArray(rawRows) || rawRows.length === 0) return { inserted: 0 };
    const batchSize = 400;
    let inserted = 0;
    for (let i = 0; i < rawRows.length; i += batchSize) {
        const chunk = rawRows.slice(i, i + batchSize).map((raw, idx) => {
            const idCandidate = raw.id || raw.ID || raw.Id || raw['Item Code'] || `${Date.now()}_${i}_${idx}`;
            return { id: String(idCandidate), raw };
        });
        // Upsert on id
        const { error, count } = await supabase
            .from(BASE_TABLE)
            .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false, count: 'estimated' });
        if (error) throw error;
        inserted += count || chunk.length;
    }
    // Invalidate local cache so next read reflects new data
    cachedProducts = [];
    cachedTotal = 0;
    cacheFullyLoaded = false;
    return { inserted };
}

export async function upsertSupabaseSingleRaw(raw) {
    const res = await upsertSupabaseRawRows([raw]);
    return res.inserted === 1;
}

// Debug helper: returns visibility into configuration and relation availability
export async function getSupabaseDebugSnapshot() {
    const host = (() => {
        try {
            return SUPABASE_URL ? new URL(SUPABASE_URL).host : null;
        } catch (_) {
            return SUPABASE_URL || null;
        }
    })();
    if (!supabase) {
        return {
            hasClient: false,
            urlHost: host,
            keyPresent: Boolean(SUPABASE_ANON_KEY),
            viewCount: null,
            tableCount: null,
            viewError: 'Supabase client not configured',
            tableError: 'Supabase client not configured',
        };
    }
    let viewCount = null;
    let tableCount = null;
    let viewError = null;
    let tableError = null;
    try {
        const { count, error } = await supabase.from(PRIMARY_VIEW).select('*', { count: 'exact', head: true });
        if (error) viewError = error.message || String(error);
        else viewCount = count || 0;
    } catch (e) {
        viewError = e.message || String(e);
    }
    try {
        const { count, error } = await supabase.from(BASE_TABLE).select('*', { count: 'exact', head: true });
        if (error) tableError = error.message || String(error);
        else tableCount = count || 0;
    } catch (e) {
        tableError = e.message || String(e);
    }
    return {
        hasClient: true,
        urlHost: host,
        keyPresent: Boolean(SUPABASE_ANON_KEY),
        viewCount,
        tableCount,
        viewError,
        tableError,
        usingViewPreferred: true,
    };
}