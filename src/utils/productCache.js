// Cache management for products
class ProductCache {
    constructor(timeout = 5 * 60 * 1000) { // 5 minutes default
        this.cache = new Map();
        this.timeout = timeout;
        this.lastFetch = null;
    }

    set(products) {
        this.cache.clear();
        products.forEach(product => {
            this.cache.set(product.id, {
                data: product,
                timestamp: Date.now()
            });
        });
        this.lastFetch = Date.now();
    }

    get(id) {
        const item = this.cache.get(id);
        if (!item) return null;
        if (Date.now() - item.timestamp > this.timeout) {
            this.cache.delete(id);
            return null;
        }
        return item.data;
    }

    getAll() {
        if (!this.lastFetch || Date.now() - this.lastFetch > this.timeout) {
            return null;
        }
        return Array.from(this.cache.values())
            .map(item => item.data)
            .filter(item => Date.now() - this.cache.get(item.id).timestamp <= this.timeout);
    }

    isCacheValid() {
        return this.lastFetch && (Date.now() - this.lastFetch <= this.timeout);
    }

    clear() {
        this.cache.clear();
        this.lastFetch = null;
    }
}

export const productCache = new ProductCache();