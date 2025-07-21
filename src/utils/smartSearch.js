import productData from '../product_database.json';

class SmartSearchEngine {
    constructor() {
        this.products = productData.products;
        this.index = this.buildSearchIndex();
        this.synonyms = this.buildSynonyms();
        this.brands = this.buildBrandIndex();
    }

    buildSearchIndex() {
        const index = {
            exact: {},
            fuzzy: {},
            semantic: {},
            categories: {},
            brands: {}
        };

        this.products.forEach(product => {
            // Exact match index
            const exactKey = product.name.toLowerCase();
            if (!index.exact[exactKey]) index.exact[exactKey] = [];
            index.exact[exactKey].push(product);

            // Brand index
            if (product.brand) {
                const brandKey = product.brand.toLowerCase();
                if (!index.brands[brandKey]) index.brands[brandKey] = [];
                index.brands[brandKey].push(product);
            }

            // Category index
            const categoryKey = product.category.toLowerCase();
            if (!index.categories[categoryKey]) index.categories[categoryKey] = [];
            index.categories[categoryKey].push(product);

            // Keywords index
            if (product.search_keywords) {
                product.search_keywords.forEach(keyword => {
                    const key = keyword.toLowerCase();
                    if (!index.fuzzy[key]) index.fuzzy[key] = [];
                    index.fuzzy[key].push(product);
                });
            }
        });

        return index;
    }

    buildSynonyms() {
        return {
            // Beauty & Personal Care
            'soap': ['cleanser', 'wash', 'bar', 'hand wash'],
            'shampoo': ['hair wash', 'hair cleanser', 'hair care'],
            'face wash': ['facial cleanser', 'face cleanser', 'fw'],
            'cream': ['lotion', 'moisturizer', 'balm', 'ointment'],
            'perfume': ['fragrance', 'deodorant', 'spray', 'body spray'],
            'makeup': ['cosmetics', 'beauty', 'foundation', 'lipstick'],
            'hair oil': ['hair care oil', 'scalp oil', 'hair treatment'],
            'sunscreen': ['sun cream', 'sun protection', 'spf'],
            'powder': ['talc', 'face powder', 'body powder'],
            'nail polish': ['nail color', 'nail paint', 'nail lacquer'],

            // Food & Groceries
            'rice': ['chawal', 'basmati', 'grain', 'cereal'],
            'oil': ['tel', 'cooking oil', 'vegetable oil'],
            'flour': ['atta', 'maida', 'baking powder'],
            'spice': ['masala', 'seasoning', 'condiment'],
            'tea': ['chai', 'beverage', 'hot drink'],
            'snack': ['chips', 'namkeen', 'crackers'],
            'pasta': ['noodles', 'macaroni', 'penne'],
            'sugar': ['sweetener', 'gur', 'jaggery'],
            'salt': ['namak', 'table salt', 'cooking salt'],

            // Home & Kitchen
            'towel': ['bath towel', 'hand towel', 'kitchen towel'],
            'bottle': ['water bottle', 'container', 'jug'],
            'brush': ['cleaning brush', 'scrubber', 'broom'],
            'container': ['storage', 'box', 'jar', 'can'],
            'utensil': ['cookware', 'kitchenware', 'pan', 'pot'],
            'cleaning': ['detergent', 'soap', 'cleaner', 'wash'],
            'mop': ['floor cleaner', 'swab', 'cleaning tool']
        };
    }

    buildBrandIndex() {
        const brands = {};
        this.products.forEach(product => {
            if (product.brand) {
                const brand = product.brand.toLowerCase();
                if (!brands[brand]) brands[brand] = [];
                brands[brand].push(product);
            }
        });
        return brands;
    }

    search(query, options = {}) {
        const {
            limit = 50,
                category = null,
                brand = null,
                exactMatch = false
        } = options;

        const results = [];
        const queryLower = query.toLowerCase().trim();

        if (!queryLower) return [];

        // 1. EXACT MATCH (Highest Priority)
        if (exactMatch) {
            const exactResults = this.index.exact[queryLower] || [];
            results.push(...exactResults.map(p => ({...p, score: 100, matchType: 'exact' })));
        }

        // 2. BRAND MATCH (High Priority)
        const brandResults = this.searchByBrand(queryLower);
        results.push(...brandResults);

        // 3. FUZZY MATCH (Medium Priority)
        const fuzzyResults = this.searchFuzzy(queryLower);
        results.push(...fuzzyResults);

        // 4. SEMANTIC MATCH (Lower Priority)
        const semanticResults = this.searchSemantic(queryLower);
        results.push(...semanticResults);

        // 5. SYNONYM MATCH (Lower Priority)
        const synonymResults = this.searchSynonyms(queryLower);
        results.push(...synonymResults);

        // Remove duplicates and rank results
        const uniqueResults = this.removeDuplicates(results);
        const rankedResults = this.rankResults(uniqueResults, queryLower);

        // Apply filters
        let filteredResults = rankedResults;
        if (category) {
            filteredResults = filteredResults.filter(p =>
                p.category.toLowerCase().includes(category.toLowerCase())
            );
        }
        if (brand) {
            filteredResults = filteredResults.filter(p =>
                p.brand && p.brand.toLowerCase().includes(brand.toLowerCase())
            );
        }

        return filteredResults.slice(0, limit);
    }

    searchByBrand(query) {
        const results = [];

        // Direct brand match
        if (this.index.brands[query]) {
            results.push(...this.index.brands[query].map(p => ({
                ...p,
                score: 90,
                matchType: 'brand'
            })));
        }

        // Partial brand match
        Object.keys(this.index.brands).forEach(brand => {
            if (brand.includes(query) || query.includes(brand)) {
                results.push(...this.index.brands[brand].map(p => ({
                    ...p,
                    score: 85,
                    matchType: 'brand_partial'
                })));
            }
        });

        return results;
    }

    searchFuzzy(query) {
        const results = [];

        // Search in product names
        this.products.forEach(product => {
            const nameLower = product.name.toLowerCase();
            const words = nameLower.split(' ');

            words.forEach(word => {
                if (word.includes(query) || query.includes(word)) {
                    const score = this.calculateFuzzyScore(word, query);
                    if (score > 0) {
                        results.push({...product, score, matchType: 'fuzzy' });
                    }
                }
            });
        });

        // Search in keywords
        Object.keys(this.index.fuzzy).forEach(keyword => {
            if (keyword.includes(query) || query.includes(keyword)) {
                const score = this.calculateFuzzyScore(keyword, query);
                if (score > 0) {
                    results.push(...this.index.fuzzy[keyword].map(p => ({
                        ...p,
                        score,
                        matchType: 'keyword'
                    })));
                }
            }
        });

        return results;
    }

    searchSemantic(query) {
        const results = [];
        const queryWords = query.split(' ');

        this.products.forEach(product => {
            const nameLower = product.name.toLowerCase();
            let semanticScore = 0;

            // Check if query words appear in product name
            queryWords.forEach(word => {
                if (nameLower.includes(word)) {
                    semanticScore += 20;
                }
            });

            // Check category relevance
            if (product.category) {
                const categoryLower = product.category.toLowerCase();
                queryWords.forEach(word => {
                    if (categoryLower.includes(word)) {
                        semanticScore += 15;
                    }
                });
            }

            if (semanticScore > 0) {
                results.push({...product, score: semanticScore, matchType: 'semantic' });
            }
        });

        return results;
    }

    searchSynonyms(query) {
        const results = [];

        Object.keys(this.synonyms).forEach(synonym => {
            if (query.includes(synonym) || synonym.includes(query)) {
                // Find products that match the synonym
                this.products.forEach(product => {
                    const nameLower = product.name.toLowerCase();
                    const keywords = this.synonyms[synonym];

                    keywords.forEach(keyword => {
                        if (nameLower.includes(keyword)) {
                            results.push({...product, score: 30, matchType: 'synonym' });
                        }
                    });
                });
            }
        });

        return results;
    }

    calculateFuzzyScore(word, query) {
        if (word === query) return 100;
        if (word.includes(query) || query.includes(word)) return 80;
        if (word.startsWith(query) || query.startsWith(word)) return 70;
        if (this.levenshteinDistance(word, query) <= 2) return 60;
        return 0;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    removeDuplicates(results) {
        const seen = new Set();
        return results.filter(result => {
            const key = result.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    rankResults(results, query) {
        return results.sort((a, b) => {
            // Primary sort by score
            if (b.score !== a.score) return b.score - a.score;

            // Secondary sort by brand relevance
            const aBrand = a.brand ? a.brand.toLowerCase() : '';
            const bBrand = b.brand ? b.brand.toLowerCase() : '';
            const queryLower = query.toLowerCase();

            const aBrandMatch = aBrand.includes(queryLower) || queryLower.includes(aBrand);
            const bBrandMatch = bBrand.includes(queryLower) || queryLower.includes(bBrand);

            if (aBrandMatch && !bBrandMatch) return -1;
            if (!aBrandMatch && bBrandMatch) return 1;

            // Tertiary sort by name length (shorter names first)
            return a.name.length - b.name.length;
        });
    }

    // Get search suggestions
    getSuggestions(query, limit = 10) {
        const suggestions = new Set();
        const queryLower = query.toLowerCase();

        // Brand suggestions
        Object.keys(this.index.brands).forEach(brand => {
            if (brand.includes(queryLower) && suggestions.size < limit) {
                suggestions.add(brand);
            }
        });

        // Category suggestions
        Object.keys(this.index.categories).forEach(category => {
            if (category.includes(queryLower) && suggestions.size < limit) {
                suggestions.add(category);
            }
        });

        // Popular keywords
        Object.keys(this.index.fuzzy).forEach(keyword => {
            if (keyword.includes(queryLower) && suggestions.size < limit) {
                suggestions.add(keyword);
            }
        });

        return Array.from(suggestions).slice(0, limit);
    }

    // Get trending searches
    getTrendingSearches() {
        const popularKeywords = [
            'LAKME', 'DOVE', 'POND', 'INDIA GATE', 'SPARTAN',
            'shampoo', 'face wash', 'rice', 'oil', 'towel',
            'perfume', 'cream', 'soap', 'powder'
        ];

        return popularKeywords.slice(0, 10);
    }

    // Get products by category
    getProductsByCategory(category, limit = 20) {
        const categoryLower = category.toLowerCase();
        const results = this.products.filter(product =>
            product.category.toLowerCase().includes(categoryLower)
        );
        return results.slice(0, limit);
    }

    // Get products by brand
    getProductsByBrand(brand, limit = 20) {
        const brandLower = brand.toLowerCase();
        const results = this.products.filter(product =>
            product.brand && product.brand.toLowerCase().includes(brandLower)
        );
        return results.slice(0, limit);
    }
}

// Create singleton instance
const smartSearch = new SmartSearchEngine();

export default smartSearch;