// src/services/productsService.js
// Unified product service that reads from local JSON database via productOperations

export {
    getAllProducts,
    getProductById,
    getProductsByCategory,
    searchProducts,
    getTopSellingProducts,
    getAllCategories,
    getProductsByIds
}
from '../utils/productOperations';