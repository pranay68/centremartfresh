// Simple Express-like Cloud Function to accept product image URL and write to Supabase
const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
// Accept JSON and urlencoded (Cloudinary sends application/x-www-form-urlencoded for notifications)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || (process.env.FUNCTIONS_SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.FUNCTIONS_SUPABASE_SERVICE_ROLE_KEY);
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Supabase service role not configured for functions; set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;
// Cloudinary secret for verifying webhook signatures (optional but recommended)
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || process.env.FUNCTIONS_CLOUDINARY_API_SECRET || null;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || process.env.FUNCTIONS_CLOUDINARY_API_KEY || null;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.FUNCTIONS_CLOUDINARY_CLOUD_NAME || null;

function isEmulatorEnv() {
    return process.env.FUNCTIONS_EMULATOR === 'true' || !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
}

async function verifyFirebaseAdmin(req) {
    if (isEmulatorEnv()) return { uid: 'emulator' };
    const authz = req.headers.authorization || '';
    if (!authz) throw { code: 401, message: 'Unauthorized: missing Authorization header' };
    const token = authz.startsWith('Bearer ') ? authz.split(' ')[1] : authz;
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        const isAdmin = decoded.admin === true || (process.env.ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean).includes(decoded.uid);
        if (!isAdmin) throw { code: 403, message: 'Forbidden: requires admin' };
        return decoded;
    } catch (err) {
        // normalize error
        if (err && err.code) throw err;
        throw { code: 401, message: 'Unauthorized: token invalid' };
    }
}

app.post('/add-product-image', async(req, res) => {
    try {
        // Cloudinary may POST form-encoded data. Support both JSON and form bodies.
        const payload = req.body || {};
        const { productId, url, uploadedBy } = payload;
        // Verify admin token unless running in emulator
        try { await verifyFirebaseAdmin(req); } catch (e) {
            if (!isEmulatorEnv()) return res.status(e.code || 401).json({ error: e.message || 'Unauthorized' });
        }

        // If Cloudinary sends notification with signature, verify it.
        if (CLOUDINARY_API_SECRET && payload.signature) {
            // Build param string excluding signature and api_key and file/resource_type
            const params = {};
            Object.keys(payload).forEach((k) => {
                if (['signature', 'api_key', 'file', 'resource_type'].includes(k)) return;
                if (payload[k] === undefined || payload[k] === null || payload[k] === '') return;
                params[k] = payload[k];
            });
            const signStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
            const expected = crypto.createHash('sha1').update(signStr + CLOUDINARY_API_SECRET).digest('hex');
            if (expected !== String(payload.signature)) {
                console.warn('Cloudinary signature mismatch', { expected, got: payload.signature });
                return res.status(403).json({ error: 'Invalid signature' });
            }
        }
        if (!productId || !url) return res.status(400).json({ error: 'Missing productId or url' });
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        // First, update products.image_urls (primary source)
        try {
            const { data: prod, error: selErr } = await supabase.from('products').select('image_urls').eq('id', String(productId)).single();
            const arr = Array.isArray(prod && prod.image_urls) ? prod.image_urls : [];
            if (!arr.includes(url)) arr.push(url);
            const { error: updErr } = await supabase.from('products').update({ image_urls: arr, image_url: String(url) }).eq('id', String(productId));
            if (updErr) throw updErr;
        } catch (e) {
            // fallback: try to set image_url only
            try { await supabase.from('products').update({ image_url: String(url) }).eq('id', String(productId)); } catch (_) {}
        }

        // Do NOT write to product_images table — products.image_urls is the single source of truth.

        return res.json({ ok: true, url });
    } catch (err) {
        console.error('Function add-product-image failed', err);
        return res.status(500).json({ error: err.message || String(err) });
    }
});

// Admin-only: remove product image (delete from Cloudinary if publicId supplied, then remove DB rows)
app.post('/remove-product-image', async(req, res) => {
    // allow server-to-server calls with a configured secret header for automation
    const internalSecret = process.env.PULL_SNAPSHOT_SECRET || process.env.FUNCTIONS_PULL_SNAPSHOT_SECRET || null;
    const incomingSecret = (req.headers['x-internal-secret'] || req.headers['x-pull-secret'] || '').toString();
    if (internalSecret && incomingSecret && incomingSecret === internalSecret) {
        // authorized via secret
    } else {
        try {
            await verifyFirebaseAdmin(req);
        } catch (e) {
            return res.status(e.code || 401).json({ error: e.message || 'Unauthorized' });
        }
    }
    const { productId, url, publicId } = req.body || {};
    if (!productId || (!url && !publicId)) return res.status(400).json({ error: 'Provide productId and url or publicId' });
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    let cloudDeleted = false;
    // Try to delete from Cloudinary if we have credentials and a publicId
    if (CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET && CLOUDINARY_CLOUD_NAME && publicId) {
        try {
            const delUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image/upload/${encodeURIComponent(publicId)}`;
            const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
            const resp = await fetch(delUrl, { method: 'DELETE', headers: { Authorization: `Basic ${auth}` } });
            if (resp.ok) cloudDeleted = true;
            else {
                // try to read body for debugging
                try {
                    const txt = await resp.text();
                    console.warn('Cloudinary delete responded', resp.status, txt);
                } catch (_) {}
            }
        } catch (e) {
            console.warn('Cloudinary delete failed', e);
        }
    }

    try {
        // Update products.image_urls and image_url only (product_images table is deprecated)
        try {
            const { data: prod, error: selErr } = await supabase.from('products').select('image_urls,image_url').eq('id', String(productId)).single();
            if (!selErr && prod) {
                const arr = Array.isArray(prod.image_urls) ? prod.image_urls.filter(u => u !== url) : [];
                const updates = { image_urls: arr };
                if (prod.image_url === url) updates.image_url = arr.length > 0 ? arr[0] : null;
                await supabase.from('products').update(updates).eq('id', String(productId));
            }
        } catch (e) {
            console.warn('Failed to update products.image_urls after removal', e);
            try { await supabase.from('products').update({ image_url: null }).eq('id', String(productId)); } catch (_) {}
        }

        return res.json({ ok: true, cloudDeleted });
    } catch (err) {
        console.error('/remove-product-image failed', err);
        return res.status(500).json({ error: err.message || String(err) });
    }
});

// Admin-only: sync product_images table into products.image_urls (single or all)
app.post('/sync-product-images', async(req, res) => {
    try {
        await verifyFirebaseAdmin(req);
    } catch (e) {
        return res.status(e.code || 401).json({ error: e.message || 'Unauthorized' });
    }
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { productId } = req.body || {};
    try {
        let query = supabase.from('product_images').select('product_id,url');
        if (productId) query = query.eq('product_id', String(productId));
        const { data, error } = await query;
        if (error) throw error;
        // Group urls by product_id
        const map = new Map();
        for (const row of data || []) {
            const pid = String(row.product_id);
            if (!map.has(pid)) map.set(pid, []);
            if (row.url && !map.get(pid).includes(row.url)) map.get(pid).push(row.url);
        }
        let updated = 0;
        for (const [pid, urls] of map.entries()) {
            // read existing product.images
            const { data: prod, error: selErr } = await supabase.from('products').select('image_urls,image_url').eq('id', pid).single();
            if (selErr) {
                // if product missing, skip
                continue;
            }
            const existing = Array.isArray(prod.image_urls) ? prod.image_urls : [];
            const merged = [...new Set([...existing, ...urls])];
            const updates = { image_urls: merged, image_url: merged.length > 0 ? merged[0] : null };
            const { error: updErr } = await supabase.from('products').update(updates).eq('id', pid);
            if (!updErr) updated += 1;
        }
        return res.json({ ok: true, updated });
    } catch (err) {
        console.error('/sync-product-images failed', err);
        return res.status(500).json({ error: err.message || String(err) });
    }
});

// Expose as Express handler for serverless platforms
module.exports = app;

// Also export Firebase Functions compatible handlers
try {
    // For Firebase Functions (if available), export as HTTPS function
    exports.api = functions.https.onRequest(app);
} catch (e) {
    // ignore if functions not available at build time
}

// If run directly (for local testing), start Express server on port 5000
if (require.main === module) {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`Image webhook server listening on http://localhost:${port}`);
    });
}

/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { parse } = require('fast-csv');
const { Readable } = require('stream');

admin.initializeApp();
const db = admin.firestore();

// Helper: normalize a CSV row to our product schema
function normalizeRow(row) {
    const toNumber = (v) => {
        const n = Number(String(v == null ? '' : v).toString().trim());
        return isNaN(n) ? 0 : n;
    };
    const pickFirst = (...values) => {
        for (const val of values) {
            if (val !== undefined && val !== null && String(val).trim() !== '') return val;
        }
        return undefined;
    };
    return {
        id: pickFirst(row.id, row.ID, row.Id, String(pickFirst(row['Item Code'], '') || '').trim()),
        'Item Code': pickFirst(row['Item Code'], row.ItemCode, row['ITEM CODE'], row.itemCode, ''),
        Description: pickFirst(row.Description, row.name, row.Name, ''),
        'Base Unit': pickFirst(row['Base Unit'], row.unit, ''),
        'Group ID': pickFirst(row['Group ID'], row.groupId, ''),
        'Group Name': pickFirst(row['Group Name'], row.Category, row.category, ''),
        'Sub Group': pickFirst(row['Sub Group'], row.subGroup, ''),
        'Supplier Name': pickFirst(row['Supplier Name'], row.supplier, ''),
        'Last CP': toNumber(pickFirst(row['Last CP'], row.lastCp, row.price, 0)),
        'Taxable CP': toNumber(pickFirst(row['Taxable CP'], row.taxableCp, 0)),
        SP: toNumber(pickFirst(row.SP, row.sp, row.sellPrice, 0)),
        Stock: toNumber(pickFirst(row.Stock, row.stock, 0)),
        'Last Purc Miti': pickFirst(row['Last Purc Miti'], row.lastPurchaseDate, ''),
        'Last Purc Qty': toNumber(pickFirst(row['Last Purc Qty'], row.lastPurchaseQty, 0)),
        'Sales Qty': toNumber(pickFirst(row['Sales Qty'], row.salesQty, 0)),
        '#': pickFirst(row['#'], row.hash, ''),
        'Margin %': toNumber(pickFirst(row['Margin %'], row.margin, 0)),
        MRP: toNumber(pickFirst(row.MRP, row.mrp, 0)),
        Location1: pickFirst(row.Location1, ''),
        Location2: pickFirst(row.Location2, ''),
        Location3: pickFirst(row.Location3, ''),
        Location4: pickFirst(row.Location4, ''),
        Location5: pickFirst(row.Location5, ''),
        'Image URL': pickFirst(row['Image URL'], row.imageUrl, row.ImageUrl, '')
    };
}

// HTTPS: CSV uploaded from client → parse → write documents into a new collection → update pointer
exports.uploadProductsCsv = functions.https.onRequest(async(req, res) => {
    try {
        if (req.method !== 'POST') return res.status(405).send('Use POST');
        const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
        if (!isEmulator) {
            const authz = req.headers.authorization || '';
            if (!authz) return res.status(401).send('Unauthorized');
        }
        if (!req.body || typeof req.body !== 'string') {
            return res.status(400).send('Send raw CSV text in request body');
        }

        const rows = [];
        await new Promise((resolve, reject) => {
            Readable.from(req.body)
                .pipe(parse({ headers: true, trim: true }))
                .on('error', reject)
                .on('data', (row) => rows.push(row))
                .on('end', resolve);
        });
        const normalized = rows.map(normalizeRow).filter(r => r['Item Code']);
        const ts = Date.now();
        const collectionName = `products_snapshot_${ts}`;

        // Write in batches of 400 to avoid large-batch limits
        const chunks = (arr, size) => arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
        for (const chunk of chunks(normalized, 400)) {
            const batch = db.batch();
            chunk.forEach((p, i) => {
                const id = String(p.id || p['Item Code'] || `${Date.now()}_${i}`);
                batch.set(db.collection(collectionName).doc(id), p);
            });
            await batch.commit();
        }

        const pointerRef = db.doc('system/productsSnapshot');
        const previousSnap = await pointerRef.get();
        const previous = previousSnap.exists ? previousSnap.data() : null;
        await pointerRef.set({
            version: ts,
            collection: collectionName,
            total: normalized.length,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            previous: previous ? { version: previous.version, collection: previous.collection } : null
        });

        return res.status(200).json({ ok: true, collection: collectionName, total: normalized.length });
    } catch (err) {
        functions.logger.error('uploadProductsCsv failed', err);
        return res.status(500).send('Error processing CSV');
    }
});

// Admin-only: sign Cloudinary upload (returns signature + timestamp + api_key for client-side signed uploads)
app.post('/sign-cloudinary', async(req, res) => {
    try {
        await verifyFirebaseAdmin(req);
    } catch (e) {
        return res.status(e.code || 401).json({ error: e.message || 'Unauthorized' });
    }
    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME) return res.status(500).json({ error: 'Cloudinary not configured' });
    const { filename, folder, timestamp } = req.body || {};
    const ts = timestamp ? Number(timestamp) : Math.floor(Date.now() / 1000);
    // build signature string according to Cloudinary spec
    // include folder if provided to lock uploads to a folder
    const paramsToSign = Object.assign({}, folder ? { folder } : {}, { timestamp: ts });
    const signStr = Object.keys(paramsToSign).sort().map(k => `${k}=${paramsToSign[k]}`).join('&');
    const signature = crypto.createHash('sha1').update(signStr + CLOUDINARY_API_SECRET).digest('hex');
    return res.json({ signature, api_key: CLOUDINARY_API_KEY, timestamp: ts, cloud_name: CLOUDINARY_CLOUD_NAME });
});

// Admin-only: update product row (generic)
app.post('/update-product', async(req, res) => {
    try {
        await verifyFirebaseAdmin(req);
    } catch (e) {
        return res.status(e.code || 401).json({ error: e.message || 'Unauthorized' });
    }
    const body = req.body || {};
    const { id, updates } = body;
    if (!id || !updates || typeof updates !== 'object') return res.status(400).json({ error: 'Provide id and updates object' });
    try {
        const { error } = await supabase.from('products').update(updates).eq('id', String(id));
        if (error) throw error;
        return res.json({ ok: true });
    } catch (err) {
        console.error('/update-product failed', err);
        return res.status(500).json({ error: err.message || String(err) });
    }
});

// Admin-only: pull entire Supabase products table and publish snapshot to Firebase Storage
app.post('/pull-and-publish-snapshot', async(req, res) => {
    try {
        await verifyFirebaseAdmin(req);
    } catch (e) {
        return res.status(e.code || 401).json({ error: e.message || 'Unauthorized' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Supabase service credentials not configured' });

    const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
    const sb = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        // fetch all products in pages
        const pageSize = 1000;
        let offset = 0;
        const allRows = [];
        while (true) {
            // eslint-disable-next-line no-await-in-loop
            const { data, error } = await sb.from('products').select('*').order('id', { ascending: true }).range(offset, offset + pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            allRows.push(...data);
            if (data.length < pageSize) break;
            offset += pageSize;
        }

        // reuse normalizeRow if present; fallback to simple identity
        const normalize = typeof normalizeRow === 'function' ? normalizeRow : (r) => r;
        const normalized = allRows.map((r) => normalize(r));

        const ts = Date.now();
        const outPath = `products-snapshots/products-${ts}.json`;

        const bucket = admin.storage().bucket();
        const file = bucket.file(outPath);
        await file.save(JSON.stringify(normalized, null, 2), { contentType: 'application/json' });
        try { await file.makePublic(); } catch (_) { /* ignore if not allowed */ }

        // update pointer in Firestore
        const pointerRef = db.doc('system/productsSnapshot');
        const prevSnap = await pointerRef.get();
        await pointerRef.set({ version: ts, path: outPath, total: normalized.length, createdAt: admin.firestore.FieldValue.serverTimestamp(), previous: prevSnap.exists ? { version: prevSnap.data().version, path: prevSnap.data().path } : null });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURI(outPath)}`;
        return res.json({ ok: true, path: outPath, url: publicUrl, total: normalized.length });
    } catch (err) {
        console.error('/pull-and-publish-snapshot failed', err);
        return res.status(500).json({ error: err.message || String(err) });
    }
});

// Admin-only: delete product
app.post('/delete-product', async(req, res) => {
    try { await verifyFirebaseAdmin(req); } catch (e) { return res.status(e.code || 401).json({ error: e.message || 'Unauthorized' }); }
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Provide id' });
    try {
        const { error } = await supabase.from('products').delete().eq('id', String(id));
        if (error) throw error;
        return res.json({ ok: true });
    } catch (err) {
        console.error('/delete-product failed', err);
        return res.status(500).json({ error: err.message || String(err) });
    }
});

// Admin-only: update stock
app.post('/update-stock', async(req, res) => {
    try { await verifyFirebaseAdmin(req); } catch (e) { return res.status(e.code || 401).json({ error: e.message || 'Unauthorized' }); }
    const { id, stock } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Provide id and stock' });
    const val = Number(stock) || 0;
    try {
        const { error } = await supabase.from('products').update({ stock: val }).eq('id', String(id));
        if (error) throw error;
        return res.json({ ok: true });
    } catch (err) {
        console.error('/update-stock failed', err);
        return res.status(500).json({ error: err.message || String(err) });
    }
});

// Dev helper: create snapshot from JSON payload
exports.createSnapshotFromJson = functions.https.onRequest(async(req, res) => {
    try {
        if (req.method !== 'POST') {
            return res.status(405).send('Use POST');
        }
        const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
        if (!isEmulator) {
            const authz = req.headers.authorization || '';
            if (!authz) return res.status(401).send('Unauthorized');
        }

        const incoming = req.body && (Array.isArray(req.body) ? req.body : req.body.products);
        if (!Array.isArray(incoming) || incoming.length === 0) {
            return res.status(400).send('Provide products array or { products: [] }');
        }

        const normalized = incoming.map(normalizeRow).filter(r => r['Item Code']);
        const ts = Date.now();
        const outPath = `bulk-products/snapshots/products-${ts}.json`;
        await admin.storage().bucket().file(outPath).save(JSON.stringify(normalized), { contentType: 'application/json' });

        const pointerRef = db.doc('system/productsSnapshot');
        const prev = await pointerRef.get();
        await pointerRef.set({
            version: ts,
            path: outPath,
            total: normalized.length,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            previous: prev.exists ? { version: prev.data().version, path: prev.data().path } : null
        });

        return res.status(200).json({ ok: true, version: ts, path: outPath, total: normalized.length });
    } catch (e) {
        functions.logger.error('createSnapshotFromJson failed', e);
        return res.status(500).send('Error creating snapshot');
    }
});

// Scheduled function to send review reminders
exports.sendReviewReminders = functions.pubsub
    .schedule("every 5 minutes")
    .onRun(async(context) => {
        const now = admin.firestore.Timestamp.now();
        const fiveHoursAgo = new Date(
            now.toDate().getTime() - 5 * 60 * 60 * 1000
        );

        // Get orders older than 5 hours, not yet reviewed
        const ordersSnap = await db
            .collection("orders")
            .where(
                "createdAt",
                "<=",
                admin.firestore.Timestamp.fromDate(fiveHoursAgo),
            )
            .where("status", "==", "Delivered") // Only remind for delivered orders
            .get();

        for (const orderDoc of ordersSnap.docs) {
            const order = orderDoc.data();
            if (!order.userId || !order.productId) {
                continue;
            }

            // Check if review exists
            const reviewsSnap = await db
                .collection("productReviews")
                .where("productId", "==", order.productId)
                .where("userId", "==", order.userId)
                .get();
            if (!reviewsSnap.empty) {
                continue; // Already reviewed
            }

            // Check if reminder already sent
            const notifSnap = await db
                .collection("notifications")
                .where("userId", "==", order.userId)
                .where("orderId", "==", orderDoc.id)
                .where("type", "==", "review-reminder")
                .get();
            if (!notifSnap.empty) {
                continue; // Already reminded
            }

            // Send notification
            await db.collection("notifications").add({
                userId: order.userId,
                orderId: orderDoc.id,
                productId: order.productId,
                type: "review-reminder",
                message: "Please rate and review your recent purchase: " +
                    order.productName,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
            });
            functions.logger.info(
                "Sent review reminder to user " +
                order.userId +
                " for order " +
                orderDoc.id
            );
        }
        return null;
    });