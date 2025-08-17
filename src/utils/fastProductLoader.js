// Lightweight helper to load a small initial set of products for the homepage
// and kick off a background fetch for the rest without blocking render.
import publicProducts from './publicProducts';

/**
 * Load products optimized for Home page: fast initial slice + background full load.
 * @param {Object} opts
 * @param {number} opts.initial - number of products to fetch immediately (default 24)
 * @param {number} opts.backgroundChunk - chunk size used by background loader (informational)
 * @returns {Promise<{initialProducts: Array, backgroundPromise: Promise}>}
 */
export async function loadProductsForHome(opts = {}) {
    const { initial = 24 } = opts;

    // Try to get a small initial chunk fast. If it fails, fall back to a full fetch.
    let initialProducts = [];
    try {
        await publicProducts.ensureLoaded();
        const chunk = publicProducts.getChunk(0, Math.max(1, initial));
        initialProducts = chunk || [];
    } catch (e) {
        // If chunk fetch fails, continue and try a full fetch later
        // eslint-disable-next-line no-console
        console.warn('[fastProductLoader] initial chunk failed, will try full fetch later', e);
        initialProducts = [];
    }

    // Kick off background fetch (do not await) to warm cache and get all products
    const backgroundPromise = (async() => {
        try {
            await publicProducts.ensureLoaded();
            return publicProducts.getAllCached();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[fastProductLoader] background full fetch failed', e);
            throw e;
        }
    })();

    return { initialProducts, backgroundPromise };
}

export default loadProductsForHome;