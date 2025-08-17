// Usage: node src/utils/publishToSupabase.js
// Loads environment from centremartfresh/.env.local via dotenv
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
// Publishes local src/data/products.json into Supabase table `products` (replace existing rows)

const fs = require('fs');
const { getSupabaseAdmin } = require('./supabaseClient');

async function main() {
    try {
        const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!adminKey) {
            console.error('Set SUPABASE_SERVICE_ROLE_KEY in environment');
            process.exit(1);
        }

        const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
        if (!supabaseUrl) {
            console.error('Set SUPABASE_URL in environment');
            process.exit(1);
        }

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, adminKey);

        const file = path.resolve(__dirname, '../data/products.json');
        if (!fs.existsSync(file)) {
            console.error('products.json not found at', file);
            process.exit(2);
        }
        const raw = fs.readFileSync(file, 'utf8');
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) {
            console.error('products.json must be an array');
            process.exit(3);
        }

        console.log(`Publishing ${arr.length} products to Supabase...`);

        // Truncate table (dangerous) then insert in batches
        const { data: trunc, error: truncErr } = await supabase.rpc('truncate_products');
        if (truncErr) {
            console.error('truncate_products RPC failed:', truncErr.message || truncErr);
            // fallback: attempt delete
            const { error: delErr } = await supabase.from('products').delete().neq('id', -1);
            if (delErr) console.error('Delete fallback failed', delErr.message || delErr);
        }

        const batchSize = 400;
        for (let i = 0; i < arr.length; i += batchSize) {
            const chunk = arr.slice(i, i + batchSize).map(p => ({ id: String(p.id || p['Item Code'] || `${i}`), raw: p }));
            const { error } = await supabase.from('products').insert(chunk);
            if (error) {
                console.error('Insert chunk failed at', i, error.message || error);
                process.exit(4);
            }
            console.log(`Inserted ${i + chunk.length}/${arr.length}`);
        }

        console.log('Publish complete');
        process.exit(0);
    } catch (err) {
        console.error('Publish failed', err);
        process.exit(1);
    }
}

main();