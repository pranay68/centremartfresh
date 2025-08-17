// Usage: node src/utils/publishLocalProductsSnapshot.js /path/to/serviceAccount.json
// Reads local src/data/products.json, uploads a versioned snapshot to Firebase Storage,
// and updates Firestore pointer at system/productsSnapshot/current.

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

async function main() {
    try {
        const keyPath = process.argv[2];
        if (!keyPath || !fs.existsSync(keyPath)) {
            console.error('Missing service account key path');
            process.exit(1);
        }
        const serviceAccount = require(path.resolve(keyPath));
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FB_BUCKET || 'centre-mart.appspot.com',
            });
        }

        const productsPath = path.resolve(__dirname, '../data/products.json');
        if (!fs.existsSync(productsPath)) {
            console.error('Local products file not found at', productsPath);
            process.exit(2);
        }
        const jsonStr = fs.readFileSync(productsPath, 'utf8');
        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch (e) {
            console.error('products.json is not valid JSON');
            process.exit(3);
        }
        const total = Array.isArray(data) ? data.length : 0;
        const ts = Date.now();
        const outPath = `bulk-products/snapshots/products-${ts}.json`;

        const db = admin.firestore();
        // Create a new collection per update, e.g., products_snapshot_{{ts}}
        const collectionName = `products_snapshot_${ts}`;
        const arr = JSON.parse(jsonStr);
        const chunks = (a, size) => a.reduce((acc, _, i) => (i % size ? acc : [...acc, a.slice(i, i + size)]), []);
        for (const chunk of chunks(arr, 400)) {
            const batch = db.batch();
            chunk.forEach((p, i) => {
                const id = String(p.id || p['Item Code'] || `${Date.now()}_${i}`);
                const docRef = db.collection(collectionName).doc(id);
                batch.set(docRef, p);
            });
            await batch.commit();
        }

        const pointerRef = db.doc('system/productsSnapshot');
        const previousSnap = await pointerRef.get();
        const previous = previousSnap.exists ? previousSnap.data() : null;
        await pointerRef.set({
            version: ts,
            collection: collectionName,
            total,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            previous: previous ? { version: previous.version, collection: previous.collection } : null,
        });

        console.log(`Uploaded snapshot to collection ${collectionName} and updated pointer (total=${total})`);
        process.exit(0);
    } catch (err) {
        console.error('Publish snapshot failed', err);
        process.exit(1);
    }
}

main();