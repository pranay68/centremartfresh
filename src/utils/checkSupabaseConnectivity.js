// Usage: node src/utils/checkSupabaseConnectivity.js
// Tests direct connectivity to Supabase REST API using anon key

const fs = require('fs');
const path = require('path');
const https = require('https');

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
            } catch {}
            break;
        }
    }
}

function main() {
    loadEnv();
    const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.error('Missing SUPABASE URL or ANON KEY in env');
        process.exit(1);
    }
    const endpoint = new URL('/rest/v1/products?select=id&limit=1', url);
    const options = {
        method: 'GET',
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
        },
        timeout: 20000,
    };
    const req = https.request(endpoint, options, (res) => {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            console.log('Status:', res.statusCode);
            console.log('Headers:', JSON.stringify(res.headers, null, 2));
            console.log('Body:', body);
            process.exit(0);
        });
    });
    req.on('timeout', () => {
        console.error('Request timed out');
        req.destroy(new Error('timeout'));
    });
    req.on('error', (err) => {
        console.error('HTTPS error:', err.message);
        if (err.code) console.error('Code:', err.code);
        if (err.stack) console.error(err.stack);
        process.exit(2);
    });
    req.end();
}

main();