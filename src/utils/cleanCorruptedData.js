import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const cleanCorruptedData = async() => {
    try {
        console.log('🔍 Scanning for corrupted products...');

        const productsRef = collection(db, 'products');
        const snapshot = await getDocs(productsRef);

        let deletedCount = 0;
        let totalCount = 0;

        snapshot.forEach((docSnapshot) => {
            const product = docSnapshot.data();
            totalCount++;

            // Check for corrupted data
            const isCorrupted = !product.name ||
                product.name === 'undefined' ||
                product.name === 'null' ||
                product.name.includes('RAHUL ACCOUNT COPY') ||
                product.name.includes('HALDIRAM NAVRATTAN') ||
                product.name.includes('MEDIMIX') ||
                !product.id ||
                product.name.length < 3;

            if (isCorrupted) {
                console.log(`🗑️ Deleting corrupted product: ${product.name || 'Unknown'}`);
                deleteDoc(doc(db, 'products', docSnapshot.id));
                deletedCount++;
            }
        });

        console.log(`✅ Cleanup complete! Deleted ${deletedCount} corrupted products out of ${totalCount} total.`);
        return { deletedCount, totalCount };

    } catch (error) {
        console.error('❌ Error cleaning corrupted data:', error);
        throw error;
    }
};

// Run this function to clean corrupted data
// cleanCorruptedData();