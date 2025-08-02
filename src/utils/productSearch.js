import { searchProducts as search } from './productOperations';

export const searchProducts = (query) => {
    if (!query) return [];
    return search(query);
};

export const searchByCategory = (category) => {
    if (!category) return [];
    return search(category);
};
