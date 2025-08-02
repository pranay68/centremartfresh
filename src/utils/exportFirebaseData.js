const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = {
    "type": "service_account",
    "project_id": "fresh-mart-clean",
    "private_key_id": "your-private-key-id",
    "private_key": "your-private-key",
    "client_email": "firebase-adminsdk-xxxxx@fresh-mart-clean.iam.gserviceaccount.com",
    "client_id": "your-client-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "your-cert-url"
};

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const exportProducts = async() => {
    try {
        console.log('Fetching products from Firebase...');
        const productsSnapshot = await db.collection('products').get();
        const products = productsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                price: data.sp || data.price || 0, // Use sp as price if available, fallback to price, or 0
                originalPrice: data.price || data.sp || 0, // Keep original price
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
            };
        });

        // Split products into two files based on category or any other criteria
        const halfLength = Math.ceil(products.length / 2);
        const products1 = products.slice(0, halfLength);
        const products2 = products.slice(halfLength);

        // Create data directory if it doesn't exist
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        // Write to JSON files
        fs.writeFileSync(
            path.join(dataDir, 'products1.json'),
            JSON.stringify(products1, null, 2)
        );
        fs.writeFileSync(
            path.join(dataDir, 'products2.json'),
            JSON.stringify(products2, null, 2)
        );

        console.log(`Successfully exported ${products.length} products to JSON files`);
        console.log('products1.json:', products1.length, 'items');
        console.log('products2.json:', products2.length, 'items');
    } catch (error) {
        console.error('Error exporting products:', error);
    }
};

exportProducts();