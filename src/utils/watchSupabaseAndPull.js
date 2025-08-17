// Watches Supabase `products` table for changes and writes a local products.json snapshot
// Usage: node src/utils/watchSupabaseAndPull.js

const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPaths = [
        path.resolve(__dirname, '../../.env.local'),
        path.resolve(__dirname, '../../env'),
    ];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            try {
                const content = fs.readFileSync(p, 'utf8');
                content.split(/\r?\n/).forEach((line) => {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) return;
                    const idx = trimmed.indexOf('=');
                    if (idx === -1) return;
                    const key = trimmed.slice(0, idx).trim();
                    const val = trimmed.slice(idx + 1).trim();
                    if (key && !(key in process.env)) process.env[key] = val;
                });
            } catch (e) {}
            break;
        }
    }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY in env before running watchSupabaseAndPull.js');
    process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { realtime: { eventsPerSecond: 10 } });

async function fetchAllProducts() {
    const pageSize = 1000;
    let offset = 0;
    const allRows = [];
    while (true) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true })
            .range(offset, offset + pageSize - 1);
        if (error) throw new Error(error.message || String(error));
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
    }
    return allRows;
}

function rowToRawObject(row) {
    if (row && row.raw && typeof row.raw === 'object') return row.raw;
    const get = (a, b, c) => (row[a] != null ? row[a] : row[b] != null ? row[b] : row[c] != null ? row[c] : undefined);
    const coerceNum = (v) => (v === '' || v == null ? undefined : Number(v));
    const coerceInt = (v) => (v === '' || v == null ? undefined : parseInt(v, 10));
    return {
        id: row.id != null ? row.id : undefined,
        'Item Code': get('Item Code', 'item_code', 'itemCode') != null ? get('Item Code', 'item_code', 'itemCode') : String(row.id != null ? row.id : ''),
        Description: get('Description', 'description'),
        'Base Unit': get('Base Unit', 'base_unit', 'baseUnit'),
        'Group ID': get('Group ID', 'group_id', 'groupId'),
        'Group Name': get('Group Name', 'group_name', 'groupName'),
        'Sub Group': get('Sub Group', 'sub_group', 'subGroup'),
        'Supplier Name': get('Supplier Name', 'supplier_name', 'supplierName'),
        'Last CP': coerceNum(get('Last CP', 'last_cp', 'lastCp')),
        'Taxable CP': coerceNum(get('Taxable CP', 'taxable_cp', 'taxableCp')),
        SP: coerceNum(get('SP', 'sp')),
        Stock: coerceInt(get('Stock', 'stock')),
        'Last Purc Miti': get('Last Purc Miti', 'last_purc_miti', 'lastPurcMiti'),
        'Last Purc Qty': coerceInt(get('Last Purc Qty', 'last_purc_qty', 'lastPurcQty')),
        'Sales Qty': coerceInt(get('Sales Qty', 'sales_qty', 'salesQty')),
        '#': get('#', 'hash'),
        'Margin %': coerceNum(get('Margin %', 'margin_percent', 'marginPercent')),
        MRP: coerceNum(get('MRP', 'mrp')),
        // include image fields if present
        imageUrl: row.image_url || row.imageUrl || row.image || null,
        image_urls: row.image_urls || null,
        images: row.images || null,
    };
}

// Write to public so the running app can fetch the JSON at runtime without rebuild
const target = path.resolve(__dirname, '../../public/data/products.json');

async function writeSnapshot(rows) {
    const products = rows.map(rowToRawObject);
    try {
        // ensure target directory exists
        const dir = path.dirname(target);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        // backup existing file if present
        if (fs.existsSync(target)) {
            const backupDir = path.resolve(__dirname, '../data');
            if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
            const backup = path.resolve(backupDir, `products.backup.${Date.now()}.json`);
            fs.copyFileSync(target, backup);
            console.log('Backup created:', path.basename(backup));
        }
        // Write atomically: write to temp file then rename to replace existing snapshot
        const tmp = `${target}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(products, null, 2), 'utf8');
        fs.renameSync(tmp, target);
        console.log(new Date().toISOString(), 'Wrote products snapshot (atomic):', products.length);
    } catch (e) {
        console.error('Failed to write snapshot', e);
    }
}

async function initialLoad() {
    try {
        console.log('Initial fetch...');
        const rows = await fetchAllProducts();
        await writeSnapshot(rows);
    } catch (e) {
        console.error('Initial load failed', e && e.message ? e.message : e);
    }
}

async function startWatcher() {
    await initialLoad();
    console.log('Subscribing to products changes...');
    const channel = supabase.channel('realtime-products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
        console.log('Change detected:', payload.eventType || payload.type, payload.record ? payload.record.id : payload);
        // Debounce writes: slight delay to batch rapid events
        if (startWatcher.pending) clearTimeout(startWatcher.pending);
        startWatcher.pending = setTimeout(async() => {
            try {
                const rows = await fetchAllProducts();
                await writeSnapshot(rows);
            } catch (e) {
                console.error('Fetch after change failed', e && e.message ? e.message : e);
            }
        }, 800);
    }).subscribe();

    channel.on('subscription_error', (status) => {
        console.warn('Realtime subscription error', status);
    });

    process.on('SIGINT', async() => {
        try { await supabase.removeChannel(channel); } catch (_) {}
        process.exit(0);
    });
}

startWatcher();