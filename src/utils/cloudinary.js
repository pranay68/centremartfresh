// Cloudinary upload helpers (client-side, unsigned uploads)
// Requires in .env.local (at project root):
//   REACT_APP_CLOUDINARY_CLOUD=<cloud_name>
//   REACT_APP_CLOUDINARY_PRESET=<unsigned_upload_preset>

// Support multiple env var names: REACT_APP_CLOUDINARY_CLOUD, REACT_APP_CLOUDINARY_CLOUD_NAME
// Default to known values for local dev if env not provided
const ENV_CLOUD = process.env.REACT_APP_CLOUDINARY_CLOUD || process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD || 'deelzdh9k';
const ENV_PRESET = process.env.REACT_APP_CLOUDINARY_PRESET || process.env.CLOUDINARY_PRESET || process.env.REACT_APP_CLOUDINARY_UNSIGNED_PRESET || 'product_upload';

function assertConfigured() {
    const { cloudName, preset } = getRuntimeCloudinaryConfig();
    const missing = [];
    if (!cloudName) missing.push('REACT_APP_CLOUDINARY_CLOUD_NAME or REACT_APP_CLOUDINARY_CLOUD');
    if (!preset) missing.push('REACT_APP_CLOUDINARY_PRESET or REACT_APP_CLOUDINARY_UNSIGNED_PRESET');
    if (missing.length) {
        if (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname.includes('localhost')) {
            // interactive local dev: prompt user once to supply values and store to localStorage
            try {
                const existingCloud = localStorage.getItem('CLOUDINARY_CLOUD');
                const existingPreset = localStorage.getItem('CLOUDINARY_PRESET');
                const cloud = existingCloud || window.prompt('Enter Cloudinary cloud name (REACT_APP_CLOUDINARY_CLOUD_NAME):');
                const presetVal = existingPreset || window.prompt('Enter Cloudinary unsigned upload preset (REACT_APP_CLOUDINARY_PRESET):');
                if (cloud) localStorage.setItem('CLOUDINARY_CLOUD', cloud);
                if (presetVal) localStorage.setItem('CLOUDINARY_PRESET', presetVal);
                const ncfg = getRuntimeCloudinaryConfig();
                if (!ncfg.cloudName || !ncfg.preset) {
                    // eslint-disable-next-line no-console
                    console.error('[Cloudinary] Still missing config after prompt:', missing.join(', '));
                    throw new Error('Cloudinary not configured (after prompt)');
                }
                return;
            } catch (e) {
                // fallthrough to error
            }
        }
        if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.debug('[Cloudinary] resolved envs', { ENV_CLOUD: ENV_CLOUD || null, ENV_PRESET_present: Boolean(ENV_PRESET), local_overrides: !!localStorage.getItem('CLOUDINARY_CLOUD') });
        }
        // eslint-disable-next-line no-console
        console.error('[Cloudinary] Missing env vars:', missing.join(', '));
        throw new Error('Cloudinary not configured (check REACT_APP_CLOUDINARY_CLOUD_NAME and REACT_APP_CLOUDINARY_PRESET)');
    }
}

export async function uploadImage(file, options = {}) {
    assertConfigured();
    if (!file) throw new Error('No file provided');
    const { cloudName, preset } = getRuntimeCloudinaryConfig();
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', preset);
    if (options.folder) form.append('folder', options.folder);
    if (options.tags) form.append('tags', Array.isArray(options.tags) ? options.tags.join(',') : String(options.tags));
    if (options.context && typeof options.context === 'object') {
        // Context must be key=value|key2=value2
        const ctx = Object.entries(options.context).map(([k, v]) => `${k}=${v}`).join('|');
        form.append('context', ctx);
    }
    try {
        const res = await fetch(endpoint, { method: 'POST', body: form });
        if (!res.ok) {
            let text = null;
            try { text = await res.text(); } catch (_) { text = null; }
            try {
                const parsed = text ? JSON.parse(text) : null;
                if (parsed && parsed.error && parsed.error.message) text = parsed.error.message;
            } catch (_) {}
            throw new Error(`Cloudinary upload failed: ${res.status} ${res.statusText} ${text || ''}`);
        }
        const json = await res.json();
        return {
            url: json.secure_url || json.url,
            publicId: json.public_id,
            width: json.width,
            height: json.height,
            format: json.format,
            resourceType: json.resource_type,
            bytes: json.bytes,
            raw: json,
        };
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Cloudinary] uploadImage error', err, { endpoint, cloudName, preset });
        // Throw with additional hint for common causes (network/CORS/misconfig)
        throw new Error(`Cloudinary upload failed (network/CORS or misconfig). ${err.message}`);
    }
}

export async function uploadRaw(file, options = {}) {
    assertConfigured();
    if (!file) throw new Error('No file provided');
    const { cloudName, preset } = getRuntimeCloudinaryConfig();
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', preset);
    if (options.folder) form.append('folder', options.folder);
    if (options.tags) form.append('tags', Array.isArray(options.tags) ? options.tags.join(',') : String(options.tags));
    const res = await fetch(endpoint, { method: 'POST', body: form });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Cloudinary raw upload failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return {
        url: json.secure_url || json.url,
        publicId: json.public_id,
        bytes: json.bytes,
        raw: json,
    };
}

export function getCloudinaryConfig() {
    return { cloudName: ENV_CLOUD, preset: ENV_PRESET };
}

export function setCloudinaryConfig({ cloudName, preset }) {
    if (cloudName) localStorage.setItem('CLOUDINARY_CLOUD', cloudName);
    if (preset) localStorage.setItem('CLOUDINARY_PRESET', preset);
}

export function getRuntimeCloudinaryConfig() {
    const cloudName = ENV_CLOUD || localStorage.getItem('CLOUDINARY_CLOUD') || null;
    const preset = ENV_PRESET || localStorage.getItem('CLOUDINARY_PRESET') || null;
    return { cloudName, preset };
}