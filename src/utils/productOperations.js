import products from '../data/products.json';

// Ensure products is an array
const productArray = Array.isArray(products) ? products : 
                    Array.isArray(products.products) ? products.products : 
                    [];

// Process the products and normalize the data
export const getAllProducts = () => {
    return productArray.map(product => ({
        id: product.id,
        name: product.Description,
        price: Math.round(Number(product["Last CP"])) || 0,
        sp: Number(product.SP) || 0,
        mrp: Number(product.MRP) || 0,
        stock: Number(product.Stock) || 0,
        category: product["Group Name"] || "Uncategorized",
        unit: product["Base Unit"],
        margin: Number(product["Margin %"]) || 0,
        lastPurchaseDate: product["Last Purc Miti"],
        lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
        salesQty: Number(product["Sales Qty"]) || 0,
        supplierName: product["Supplier Name"],
        inStock: Number(product.Stock) > 0
    }));
};

export const getProductById = (productId) => {
    const product = productArray.find(p => p.id === productId);
    if (!product) return null;
    
    return {
        id: product.id,
        name: product.Description,
        price: Math.round(Number(product["Last CP"])) || 0,
        sp: Number(product.SP) || 0,
        mrp: Number(product.MRP) || 0,
        stock: Number(product.Stock) || 0,
        category: product["Group Name"] || "Uncategorized",
        unit: product["Base Unit"],
        margin: Number(product["Margin %"]) || 0,
        lastPurchaseDate: product["Last Purc Miti"],
        lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
        salesQty: Number(product["Sales Qty"]) || 0,
        supplierName: product["Supplier Name"],
        inStock: Number(product.Stock) > 0
    };
};

export const getProductsByCategory = (categoryName) => {
    return productArray
        .filter(product => product["Group Name"] === categoryName)
        .map(product => ({
            id: product.id,
            name: product.Description,
            price: Number(product["Last CP"]) || 0,
            sp: Number(product.SP) || 0,
            mrp: Number(product.MRP) || 0,
            stock: Number(product.Stock) || 0,
            category: product["Group Name"] || "Uncategorized",
            unit: product["Base Unit"],
            margin: Number(product["Margin %"]) || 0,
            lastPurchaseDate: product["Last Purc Miti"],
            lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
            salesQty: Number(product["Sales Qty"]) || 0,
            supplierName: product["Supplier Name"],
            inStock: Number(product.Stock) > 0
        }));
};

export const searchProducts = (searchTerm) => {
    const term = searchTerm.toLowerCase();
    return productArray
        .filter(product => 
            product.Description.toLowerCase().includes(term) ||
            product["Group Name"].toLowerCase().includes(term) ||
            product["Supplier Name"].toLowerCase().includes(term)
        )
        .map(product => ({
            id: product.id,
            name: product.Description,
            price: Number(product["Last CP"]) || 0,
            sp: Number(product.SP) || 0,
            mrp: Number(product.MRP) || 0,
            stock: Number(product.Stock) || 0,
            category: product["Group Name"] || "Uncategorized",
            unit: product["Base Unit"],
            margin: Number(product["Margin %"]) || 0,
            lastPurchaseDate: product["Last Purc Miti"],
            lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
            salesQty: Number(product["Sales Qty"]) || 0,
            supplierName: product["Supplier Name"],
            inStock: Number(product.Stock) > 0
        }));
};

export const getTopSellingProducts = (limit = 10) => {
    return products
        .sort((a, b) => Number(b["Sales Qty"]) - Number(a["Sales Qty"]))
        .slice(0, limit)
        .map(product => ({
            id: product.id,
            name: product.Description,
            price: Number(product["Last CP"]) || 0,
            sp: Number(product.SP) || 0,
            mrp: Number(product.MRP) || 0,
            stock: Number(product.Stock) || 0,
            category: product["Group Name"] || "Uncategorized",
            unit: product["Base Unit"],
            margin: Number(product["Margin %"]) || 0,
            lastPurchaseDate: product["Last Purc Miti"],
            lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
            salesQty: Number(product["Sales Qty"]) || 0,
            supplierName: product["Supplier Name"],
            inStock: Number(product.Stock) > 0
        }));
};

export const getAllCategories = () => {
    return [...new Set(products.map(product => product["Group Name"]))];
};

// Get products with low stock (less than or equal to 5)
export const getLowStockProducts = () => {
    return products
        .filter(product => Number(product.Stock) <= 5)
        .map(product => ({
            id: product.id,
            name: product.Description,
            price: Number(product["Last CP"]) || 0,
            sp: Number(product.SP) || 0,
            mrp: Number(product.MRP) || 0,
            stock: Number(product.Stock) || 0,
            category: product["Group Name"] || "Uncategorized",
            unit: product["Base Unit"],
            margin: Number(product["Margin %"]) || 0,
            lastPurchaseDate: product["Last Purc Miti"],
            lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
            salesQty: Number(product["Sales Qty"]) || 0,
            supplierName: product["Supplier Name"],
            inStock: Number(product.Stock) > 0
        }));
};

// Get products with high margin (greater than 30%)
export const getHighMarginProducts = () => {
    return products
        .filter(product => Number(product["Margin %"]) > 30)
        .map(product => ({
            id: product.id,
            name: product.Description,
            price: Number(product["Last CP"]) || 0,
            sp: Number(product.SP) || 0,
            mrp: Number(product.MRP) || 0,
            stock: Number(product.Stock) || 0,
            category: product["Group Name"] || "Uncategorized",
            unit: product["Base Unit"],
            margin: Number(product["Margin %"]) || 0,
            lastPurchaseDate: product["Last Purc Miti"],
            lastPurchaseQty: Number(product["Last Purc Qty"]) || 0,
            salesQty: Number(product["Sales Qty"]) || 0,
            supplierName: product["Supplier Name"],
            inStock: Number(product.Stock) > 0
        }));
};
