// Usage: node src/utils/pullFromSupabase.js
// Pulls latest products from Supabase table `products` into local src/data/products.json

const fs = require('fs');
const path = require('path');

// Minimal env loader: supports centremartfresh/.env.local or centremartfresh/env
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
            } catch (e) {
                // ignore
            }
            break;
        }
    }
}

loadEnv();

async function fetchAllProducts(supabase) {
    const pageSize = 1000;
    let offset = 0;
    const allRows = [];
    while (true) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true })
            .range(offset, offset + pageSize - 1);

        if (error) {
            throw new Error(`Supabase fetch failed: ${error.message || String(error)}`);
        }

        if (!data || data.length === 0) break;

        allRows.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
    }
    return allRows;
}

function rowToRawObject(row) {
    // If a JSONB `raw` field exists and is an object, prefer it
    if (row && row.raw && typeof row.raw === 'object') {
        return row.raw;
    }
    // Build a raw-like object combining quoted CSV columns and normalized columns
    const get = (a, b, c) => {
        if (row[a] != null) return row[a];
        if (row[b] != null) return row[b];
        if (row[c] != null) return row[c];
        return undefined;
    };
    const coerceNum = (v) => (v === '' || v == null ? undefined : Number(v));
    const coerceInt = (v) => (v === '' || v == null ? undefined : parseInt(v, 10));

    return {
        id: row.id != null ? row.id : undefined,
        'Item Code': get('Item Code', 'item_code', 'itemCode') != null ?
            get('Item Code', 'item_code', 'itemCode') : String(row.id != null ? row.id : ''),
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
        // image fields: prefer explicit columns if present
        imageUrl: row.image_url || row.imageUrl || row.image || null,
        image_urls: row.image_urls || null,
        images: row.images || null,
        // preserve raw JSON if present
        raw: row.raw || null,
    };
}

async function main() {
    try {
        const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
        const ANON = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

        if (!SUPABASE_URL || !ANON) {
            console.error('Set SUPABASE_URL/REACT_APP_SUPABASE_URL and SUPABASE_ANON_KEY/REACT_APP_SUPABASE_ANON_KEY in env');
            process.exit(1);
        }

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, ANON);

        console.log('Fetching products from Supabase...');
        const rows = await fetchAllProducts(supabase);
        console.log(`Fetched ${rows.length} rows`);

        const products = rows.map(rowToRawObject);

        // target the public snapshot so the running app reads it at runtime
        const target = path.resolve(__dirname, '../../public/data/products.json');
        // backup directory inside src so we keep backups in repo workspace
        const backupDir = path.resolve(__dirname, '../data');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backup = path.resolve(backupDir, `products.backup.${Date.now()}.json`);

        // ensure target directory exists
        const tdir = path.dirname(target);
        if (!fs.existsSync(tdir)) fs.mkdirSync(tdir, { recursive: true });

        // atomic replace: write tmp then rename (no backups)
        const tmp = `${target}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(products, null, 2), 'utf8');
        fs.renameSync(tmp, target);
        console.log('Replaced public/data/products.json (atomic) with', products.length, 'items');

        // If S3 config is present, also upload snapshot to S3 so it can be served from object storage
        const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
        const S3_KEY_PREFIX = process.env.S3_KEY_PREFIX || process.env.AWS_S3_KEY_PREFIX || '';
        const AWS_REGION = process.env.AWS_REGION || process.env.S3_REGION;
        const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
        const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
        if (S3_BUCKET && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
            try {
                // lazy require to avoid mandatory dependency if not used
                // NOTE: ensure 'aws-sdk' is installed in your environment when using S3 upload
                // npm install aws-sdk
                // eslint-disable-next-line global-require
                const AWS = require('aws-sdk');
                const s3 = new AWS.S3({ region: AWS_REGION, accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY });
                const key = `${S3_KEY_PREFIX ? `${S3_KEY_PREFIX.replace(/^\/+|\/+$/g, '') + '/'} ` : ''}products.json`.replace(/\s+/g, '');
                const putParams = {
                    Bucket: S3_BUCKET,
                    Key: key,
                    Body: JSON.stringify(products, null, 2),
                    ContentType: 'application/json',
                    ACL: 'public-read',
                };
                await s3.putObject(putParams).promise();
                const publicUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURI(key)}`;
                console.log('Uploaded snapshot to S3:', publicUrl);
            } catch (e) {
                console.error('S3 upload failed:', e && e.message ? e.message : e);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('Pull failed', err && err.message ? err.message : err);
        process.exit(2);
    }
}

main();