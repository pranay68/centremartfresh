import { cleanCorruptedData } from './src/utils/cleanCorruptedData.js';

console.log('🚀 Starting corrupted data cleanup...');

cleanCorruptedData()
    .then((result) => {
        console.log('✅ Cleanup completed successfully!');
        console.log(`📊 Results: ${result.deletedCount} corrupted products deleted out of ${result.totalCount} total.`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    });