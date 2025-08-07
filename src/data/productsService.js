// Basic product service for demo purposes
// You should replace this with your real product fetching logic

const products = [{
        id: '1',
        name: 'Demo Product',
        price: 100,
        description: 'A demo product.'
    },
    // Add more products as needed
];

export function getAllProducts() {
    return products;
}

export function getProductById(id) {
    return products.find(p => p.id === id);
}

// Get products by category (dummy implementation)
export function getProductsByCategory(category) {
    // If products had a 'category' field, filter by it
    // For now, return all for demo
    return products;
}

// Get products by array of IDs
export function getProductsByIds(ids) {
    return products.filter(p => ids.includes(p.id));
}