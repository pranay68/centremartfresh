// Supabase admin helpers for product media (client-side writes)
import { createClient } from '@supabase/supabase-js';
// Clear client-side cache after writes so UI reflects new images
import { clearSupabaseCache } from './supabaseProducts';
import { auth as firebaseAuth } from '../firebase/config';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Create client with persistSession disabled to avoid multiple GoTrueClient instances in-browser
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }) : null;

function assertSupabase() {
    if (!supabase) throw new Error('Supabase not configured');
}

// Prefer a server endpoint for privileged admin ops. Configure via REACT_APP_API_ENDPOINT or REACT_APP_IMAGE_ENDPOINT
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || process.env.REACT_APP_IMAGE_ENDPOINT || null;

async function callServerEndpoint(path, body) {
    if (!API_ENDPOINT) throw new Error('Server API endpoint not configured');
    const url = `${API_ENDPOINT.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    const headers = { 'Content-Type': 'application/json' };
    try {
        // Attach Firebase ID token if available (so server can verify admin)
        if (firebaseAuth && firebaseAuth.currentUser && typeof firebaseAuth.currentUser.getIdToken === 'function') {
            const token = await firebaseAuth.currentUser.getIdToken();
            if (token) headers.Authorization = `Bearer ${token}`;
        }
    } catch (_) {}
    // allow manual override via body.__authToken
    if (body && body.__authToken) headers.Authorization = `Bearer ${body.__authToken}`;

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server endpoint ${url} responded ${res.status}: ${txt}`);
    }
    return res.json();
}

// Try preferred table 'product_images' (product_id text, url text),
// fall back to products.image_urls (jsonb) or products.image_url (text)
export async function addProductImage(productId, url) {
    // If a secure server endpoint is configured, prefer calling it so the service-role key
    // remains secret on the server. This is configured via REACT_APP_API_ENDPOINT / REACT_APP_IMAGE_ENDPOINT.
    if (API_ENDPOINT) {
        try {
            const data = await callServerEndpoint('add-product-image', { productId: String(productId), url: String(url) });
            try { clearSupabaseCache(); } catch (_) {}
            try { localStorage.setItem('supabase_products_refresh_signal', String(Date.now())); } catch (_) {}
            try { window.dispatchEvent(new Event('supabase_products_refresh')); } catch (_) {}
            // verify persistence in Supabase (best-effort)
            try { await verifyImagePersisted(productId, data.url || url); } catch (_) {}
            return { location: 'server-endpoint', url: data.url || url };
        } catch (e) {
            // fallback to direct client-side supabase ops
            // eslint-disable-next-line no-console
            console.warn('[supabaseAdmin] server endpoint failed, falling back to direct supabase:', e);
        }
    }
    assertSupabase();
    // Directly update products.image_urls (single source of truth)
    try {
        const { data: row, error: selErr } = await supabase.from('products').select('image_urls').eq('id', String(productId)).single();
        const arr = Array.isArray(row && row.image_urls) ? row.image_urls : [];
        const next = [...arr.filter((u) => u !== url), url];
        const { error: updErr } = await supabase.from('products').update({ image_urls: next, image_url: String(url) }).eq('id', String(productId));
        if (updErr) throw updErr;
        try { clearSupabaseCache(); } catch (_) {}
        try { localStorage.setItem('supabase_products_refresh_signal', String(Date.now())); } catch (_) {}
        try { window.dispatchEvent(new Event('supabase_products_refresh')); } catch (_) {}
        return { location: 'products.image_urls', url };
    } catch (e) {
        // fallback: try products.image_url (single)
        // eslint-disable-next-line no-console
        console.warn('[supabaseAdmin] products.image_urls update failed, falling back:', e);
    }
    // 2) Try products.image_urls (jsonb array)
    try {
        // fetch existing value
        const { data: row, error: selErr } = await supabase
            .from('products')
            .select('image_urls')
            .eq('id', String(productId))
            .single();
        if (selErr) throw selErr;
        const arr = Array.isArray(row && row.image_urls) ? row.image_urls : [];
        const next = [...arr.filter((u) => u !== url), url];
        const { error: updErr } = await supabase.from('products').update({ image_urls: next }).eq('id', String(productId));
        if (!updErr) {
            try { clearSupabaseCache(); } catch (_) {}
            try { localStorage.setItem('supabase_products_refresh_signal', String(Date.now())); } catch (_) {}
            try { window.dispatchEvent(new Event('supabase_products_refresh')); } catch (_) {}
            return { location: 'products.image_urls', url };
        }
        // eslint-disable-next-line no-console
        console.warn('[Supabase] products.image_urls update failed, falling back:', updErr.message || updErr);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Supabase] products.image_urls fallback exception:', e);
    }
    // 3) Try products.image_url (single)
    const { error: lastErr } = await supabase.from('products').update({ image_url: String(url) }).eq('id', String(productId));
    if (lastErr) throw lastErr;
    try { clearSupabaseCache(); } catch (_) {}
    try { localStorage.setItem('supabase_products_refresh_signal', String(Date.now())); } catch (_) {}
    try { window.dispatchEvent(new Event('supabase_products_refresh')); } catch (_) {}
    try { await verifyImagePersisted(productId, url); } catch (_) {}
    return { location: 'products.image_url', url };
}

// Verify that the given image URL exists for the product in Supabase.
// Polls a few times to allow eventual consistency.
export async function verifyImagePersisted(productId, url, attempts = 3, delayMs = 800) {
    if (!supabase) return false;
    const checkOnce = async() => {
        // 1) check product_images
        try {
            const { data: imgs, error: imErr } = await supabase.from('product_images').select('url').eq('product_id', String(productId)).eq('url', String(url)).limit(1);
            if (!imErr && Array.isArray(imgs) && imgs.length > 0) return true;
        } catch (_) {}
        // 2) check products.image_urls / image_url
        try {
            const { data: prod, error: pErr } = await supabase.from('products').select('image_urls,image_url').eq('id', String(productId)).single();
            if (!pErr && prod) {
                const arr = Array.isArray(prod.image_urls) ? prod.image_urls : [];
                if ((prod.image_url && prod.image_url === url) || arr.includes(url)) return true;
            }
        } catch (_) {}
        return false;
    };
    for (let i = 0; i < attempts; i++) {
        try {
            const ok = await checkOnce();
            if (ok) return true;
        } catch (_) {}
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, delayMs));
    }
    return false;
}

export async function removeProductImage(productId, url) {
    assertSupabase();
    // Call server endpoint if configured to handle Cloudinary deletion and DB cleanup
    const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || process.env.REACT_APP_IMAGE_ENDPOINT || null;
    if (API_ENDPOINT) {
        try {
            // Server will verify admin token automatically (client attaches Firebase token)
            const res = await callServerEndpoint('remove-product-image', { productId: String(productId), url: String(url) });
            try { clearSupabaseCache(); } catch (_) {}
            try { localStorage.setItem('supabase_products_refresh_signal', String(Date.now())); } catch (_) {}
            try { window.dispatchEvent(new Event('supabase_products_refresh')); } catch (_) {}
            return { location: 'server-endpoint', removed: res.ok ? 1 : 0, cloudDeleted: res.cloudDeleted || false };
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[supabaseAdmin] server endpoint remove failed, falling back to direct supabase:', e);
        }
    }

    // Fallback to client-side Supabase ops
    // Directly update products.image_urls (product_images table deprecated)
    try {
        const { data: row, error: selErr } = await supabase
            .from('products')
            .select('image_urls,image_url')
            .eq('id', String(productId))
            .single();
        if (!selErr && row) {
            const arr = Array.isArray(row.image_urls) ? row.image_urls.filter(u => u !== url) : [];
            const updates = { image_urls: arr };
            if (row.image_url === url) updates.image_url = arr.length > 0 ? arr[0] : null;
            const { error: updErr } = await supabase.from('products').update(updates).eq('id', String(productId));
            if (!updErr) {
                try { clearSupabaseCache(); } catch (_) {}
                try { localStorage.setItem('supabase_products_refresh_signal', String(Date.now())); } catch (_) {}
                try { window.dispatchEvent(new Event('supabase_products_refresh')); } catch (_) {}
                return { location: 'products.image_urls', removed: 1 };
            }
            // eslint-disable-next-line no-console
            console.warn('[Supabase] products.image_urls update failed, falling back:', updErr && updErr.message ? updErr.message : updErr);
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Supabase] products.image_urls remove exception:', e);
    }
    // 2) Try products.image_urls array remove
    try {
        const { data: row, error: selErr } = await supabase
            .from('products')
            .select('image_urls,image_url')
            .eq('id', String(productId))
            .single();
        if (!selErr && row) {
            const arr = Array.isArray(row.image_urls) ? row.image_urls.filter(u => u !== url) : [];
            const updates = { image_urls: arr };
            if (row.image_url === url) updates.image_url = arr.length > 0 ? arr[0] : null;
            const { error: updErr } = await supabase.from('products').update(updates).eq('id', String(productId));
            if (!updErr) {
                try { clearSupabaseCache(); } catch (_) {}
                try { localStorage.setItem('supabase_products_refresh_signal', String(Date.now())); } catch (_) {}
                try { window.dispatchEvent(new Event('supabase_products_refresh')); } catch (_) {}
                return { location: 'products.image_urls', removed: 1 };
            }
            // eslint-disable-next-line no-console
            console.warn('[Supabase] products.image_urls update failed, falling back:', updErr && updErr.message ? updErr.message : updErr);
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Supabase] products.image_urls remove exception:', e);
    }
    return { location: 'none', removed: 0 };
}

export async function getProductImages(productIds = []) {
    assertSupabase();
    const idList = (productIds || []).map(String);
    const resultMap = new Map(idList.map((id) => [id, []]));
    // 1) Try product_images
    try {
        if (idList.length > 0) {
            const { data, error } = await supabase
                .from('product_images')
                .select('product_id,url')
                .in('product_id', idList);
            if (!error && Array.isArray(data)) {
                data.forEach((row) => {
                    if (!resultMap.has(row.product_id)) resultMap.set(row.product_id, []);
                    resultMap.get(row.product_id).push(row.url);
                });
                return resultMap;
            }
            // eslint-disable-next-line no-console
            if (error) console.warn('[Supabase] product_images select failed, falling back:', error.message || error);
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Supabase] product_images select exception, falling back:', e);
    }
    // 2) Fall back to products.image_urls / image_url
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id,image_urls,image_url')
            .in('id', idList);
        if (error) throw error;
        (data || []).forEach((row) => {
            const urls = Array.isArray(row.image_urls) ? row.image_urls : [];
            if (row.image_url) urls.unshift(row.image_url);
            resultMap.set(row.id, urls);
        });
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Supabase] products image columns select failed:', e);
    }
    return resultMap;
}

export async function deleteProductRow(productId) {
    assertSupabase();
    const { error } = await supabase.from('products').delete().eq('id', String(productId));
    if (error) throw error;
    return true;
}

// Generic update for a product row
export async function updateProductRow(productId, updates) {
    assertSupabase();
    if (!productId || !updates || typeof updates !== 'object') throw new Error('Invalid args');
    const { error } = await supabase.from('products').update(updates).eq('id', String(productId));
    if (error) throw error;
    return true;
}

/**
 * Update a product's stock in Supabase (normalized column `stock`).
 * Returns true on success.
 */
export async function updateProductStock(productId, newStock) {
    assertSupabase();
    const value = Number(newStock) || 0;
    const { error } = await supabase.from('products').update({ stock: value }).eq('id', String(productId));
    if (error) throw error;
    return true;
}