const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load service account from /data
const serviceAccount = require('../../data/centre-mart-firebase-adminsdk-fbsvc-5ee4fcb696.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportAllProducts() {
    try {
        console.log('Fetching all products from Firebase...');
        const snapshot = await db.collection('products').get();
        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt ? .toDate ? .() ? .toISOString() || new Date().toISOString(),
            updatedAt: doc.data().updatedAt ? .toDate ? .() ? .toISOString() || new Date().toISOString()
        }));

        const dataDir = path.join(__dirname, '../../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        fs.writeFileSync(
            path.join(dataDir, 'products.json'),
            JSON.stringify(products, null, 2)
        );
        console.log(`Exported ${products.length} products to /data/products.json`);
    } catch (error) {
        console.error('Error exporting products:', error);
    }
}

exportAllProducts();