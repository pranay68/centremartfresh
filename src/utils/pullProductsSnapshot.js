// Node script: pull latest products snapshot from Firebase Storage
// Usage: node src/utils/pullProductsSnapshot.js /path/to/serviceAccount.json

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
                storageBucket: process.env.FB_BUCKET || 'centre-mart.appspot.com'
            });
        }

        const db = admin.firestore();
        const pointerRef = db.doc('system/productsSnapshot');
        const snap = await pointerRef.get();
        if (!snap.exists) {
            console.error('No snapshot pointer found');
            process.exit(2);
        }
        const { collection: collectionName, version, total } = snap.data();
        if (!collectionName) {
            console.error('Pointer missing collection name');
            process.exit(3);
        }
        console.log(`Fetching snapshot v${version} (${total} items) from collection ${collectionName}`);

        const querySnap = await db.collection(collectionName).get();
        const items = querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const jsonStr = JSON.stringify(items);

        const target = path.resolve(__dirname, '../data/products.json');
        const backup = path.resolve(__dirname, `../data/products.backup.${Date.now()}.json`);

        try {
            fs.copyFileSync(target, backup);
            console.log('Backed up previous products.json to', backup);
        } catch (_) {}

        fs.writeFileSync(target, jsonStr, 'utf8');
        console.log('Replaced products.json successfully');
        process.exit(0);
    } catch (err) {
        console.error('Pull snapshot failed', err);
        process.exit(1);
    }
}

main();