// CSV → Supabase importer for products
// - Parses CSV text on the client
// - Upserts existing products by matching on "Item Code" (via id mapping)
// - Inserts new products when "Item Code" not found
// - Sanitizes numeric fields

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Prefer service role if provided (user gave permission). Falls back to anon key.
const supabase = SUPABASE_URL && (SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY) ?
    createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY) :
    null;

function assertSupabase() {
    if (!supabase) throw new Error('Supabase not configured');
}

function parseCsvText(csvText) {
    const lines = (csvText || '').trim().split(/\r?\n/);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
        if (!lines[i]) continue;
        const values = lines[i].split(',');
        const obj = {};
        for (let c = 0; c < headers.length; c += 1) {
            obj[headers[c]] = (values[c] || '').trim();
        }
        rows.push(obj);
    }
    return rows;
}

function toNumberOrNull(value) {
    if (value == null) return null;
    const s = String(value).replace(/[\s,]/g, '').trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

function sanitizeRow(raw) {
    // Ensure exact CSV headers; fallback to snake_case if provided
    const get = (k1, k2) => (raw[k1] != null ? raw[k1] : raw[k2]);
    return {
        'Item Code': get('Item Code', 'item_code') || get('Code', 'code') || '',
        'Description': get('Description', 'description') || '',
        'Base Unit': get('Base Unit', 'base_unit') || '',
        'Group ID': get('Group ID', 'group_id') || '',
        'Group Name': get('Group Name', 'group_name') || get('Category', 'category') || '',
        'Sub Group': get('Sub Group', 'sub_group') || '',
        'Supplier Name': get('Supplier Name', 'supplier_name') || '',
        'Last CP': toNumberOrNull(get('Last CP', 'last_cp')),
        'Taxable CP': toNumberOrNull(get('Taxable CP', 'taxable_cp')),
        'SP': toNumberOrNull(get('SP', 'sp')),
        'Stock': toNumberOrNull(get('Stock', 'stock')),
        'Last Purc Miti': get('Last Purc Miti', 'last_purc_miti') || '',
        'Last Purc Qty': toNumberOrNull(get('Last Purc Qty', 'last_purc_qty')),
        'Sales Qty': toNumberOrNull(get('Sales Qty', 'sales_qty')),
        '#': get('#', 'item_number') || '',
        'Margin %': toNumberOrNull(get('Margin %', 'margin_percent')),
        'MRP': toNumberOrNull(get('MRP', 'mrp')),
    };
}

async function buildItemCodeToIdMap() {
    assertSupabase();
    const map = new Map();
    let from = 0;
    const page = 1000;
    // Fetch in pages until no more rows. Avoid relying on count (can be null when RLS/head disabled).
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-await-in-loop
        const { data, error } = await supabase
            .from('products')
            .select('id,"Item Code"')
            .order('id')
            .range(from, from + page - 1);
        if (error) throw error;
        const rows = data || [];
        if (rows.length === 0) break;
        rows.forEach((row) => {
            if (row && row['Item Code']) {
                map.set(String(row['Item Code']), String(row.id));
            }
        });
        if (rows.length < page) break;
        from += page;
    }
    return map;
}

export async function importProductsCsvText(csvText, { batchSize = 500, onProgress = null } = {}) {
    // By default prefer server endpoint if configured, but allow forcing client-side import
    const importEndpoint = process.env.REACT_APP_IMPORT_PRODUCTS_ENDPOINT || process.env.IMPORT_PRODUCTS_ENDPOINT;
    const forceClient = (process.env.REACT_APP_FORCE_CLIENT_CSV_IMPORT === 'true') || Boolean(SUPABASE_SERVICE_ROLE);
    if (importEndpoint && !forceClient) {
        try {
            const res = await fetch(importEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csvText })
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Import endpoint failed: ${res.status} ${text}`);
            }
            const data = await res.json();
            return data;
        } catch (e) {
            // If server-side import fails, fall back to client-side import as a last resort
            // eslint-disable-next-line no-console
            console.warn('[CSV Import] server endpoint failed, falling back to client import', e);
        }
    }

    // Client-side import using anon key (fallback). This is less secure and should only be used
    // when no server import endpoint is available. Keep robust error handling and progress.
    assertSupabase();
    const parsed = parseCsvText(csvText);
    if (parsed.length === 0) return { inserted: 0, updated: 0, total: 0 };
    const sanitized = parsed.map(sanitizeRow).filter((r) => r['Item Code']);

    // Dedupe by Item Code (keep last occurrence from the CSV)
    const latestByCode = new Map();
    for (let i = 0; i < sanitized.length; i += 1) {
        const row = sanitized[i];
        const code = String(row['Item Code']);
        if (code) {
            latestByCode.set(code, row);
        }
    }
    const dedupedRows = Array.from(latestByCode.values());

    const codeToId = await buildItemCodeToIdMap();
    // Build updates/inserts with a second layer of dedupe to guarantee unique conflict targets per batch
    const updatesById = new Map();
    const insertsByCode = new Map();
    for (const row of dedupedRows) {
        const code = String(row['Item Code']);
        const id = codeToId.get(code);
        if (id) {
            updatesById.set(String(id), { id, ...row });
        } else {
            insertsByCode.set(code, row);
        }
    }
    const updates = Array.from(updatesById.values());
    const inserts = Array.from(insertsByCode.values());

    let updated = 0;
    let inserted = 0;
    const totalOps = updates.length + inserts.length;
    let completedOps = 0;

    const reportProgress = () => {
        completedOps = inserted + updated;
        if (typeof onProgress === 'function') {
            try { onProgress({ completed: completedOps, total: totalOps }); } catch (_) {}
        }
    };

    // Batch updates via upsert on id (ensure each chunk has unique ids)
    for (let i = 0; i < updates.length; i += batchSize) {
        const chunk = updates.slice(i, i + batchSize);
        // Before upserting, preserve existing image fields so CSV can't overwrite them
        const ids = chunk.map((r) => String(r.id));
        let existingMap = new Map();
        try {
            // eslint-disable-next-line no-await-in-loop
            const { data: existRows, error: existErr } = await supabase.from('products').select('id,image_urls,image_url').in('id', ids);
            if (!existErr && Array.isArray(existRows)) {
                existRows.forEach((er) => existingMap.set(String(er.id), er));
            }
        } catch (_) {
            existingMap = new Map();
        }

        // Merge preserved image fields into each update row
        const chunkToUpsert = chunk.map((row) => {
            const id = String(row.id);
            const existing = existingMap.get(id);
            if (existing) {
                // ensure we do not overwrite image_urls/image_url from CSV (CSV won't include them),
                // but explicitly copy them to upsert payload to guarantee no accidental nulling
                return Object.assign({}, row, { image_urls: existing.image_urls || null, image_url: existing.image_url || null });
            }
            return row;
        });

        // eslint-disable-next-line no-await-in-loop
        const { error, count } = await supabase
            .from('products')
            .upsert(chunkToUpsert, { onConflict: 'id', ignoreDuplicates: false, count: 'estimated' });
        if (error) throw error;
        updated += count || chunk.length;
        reportProgress();
    }
    // Batch inserts (no id, let DB default generate)
    for (let i = 0; i < inserts.length; i += batchSize) {
        const chunk = inserts.slice(i, i + batchSize);
        // eslint-disable-next-line no-await-in-loop
        const { error, count } = await supabase
            .from('products')
            .insert(chunk, { count: 'estimated' });
        if (error) throw error;
        inserted += count || chunk.length;
        reportProgress();
    }

    return { inserted, updated, total: inserted + updated };
}

// default export for convenience
export default importProductsCsvText;