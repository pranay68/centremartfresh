import { useSearchParams, useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { sortByStock } from '../utils/sortProducts';
import ProductCard from '../components/ProductGrid/ProductCard';
import ProductDetailPanel from '../components/ProductDetailPanel';
import PowerSearch from '../components/PowerSearch';
import { useEffect, useState, useMemo } from 'react';
import { getAllProducts } from '../utils/productData';

const ITEMS_PER_PAGE = 20;

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryParam = searchParams.get('q') || searchParams.get('query') || '';

  const [results, setResults] = useState([]);
  const [loading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [allProducts, setAllProducts] = useState([]);

  // Fuse.js options to match PowerSearch configuration
  const fuseOptions = useMemo(() => ({
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'description', weight: 0.3 },
      { name: 'category', weight: 0.5 },
    ],
    threshold: 0.3,
    includeScore: false,
  }), []);

  // Run initial search when queryParam or allProducts change
  useEffect(() => {
    if (!queryParam.trim() || allProducts.length === 0) return;

    const fuse = new Fuse(allProducts, fuseOptions);
    let filtered = fuse.search(queryParam).map(r => r.item);

    // Fallback to simple keyword includes if no fuzzy matches
    if (filtered.length === 0) {
      const q = queryParam.toLowerCase();
      filtered = allProducts.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    setResults(sortByStock(filtered));
    setCurrentPage(1);
  }, [queryParam, allProducts, fuseOptions]);

  // Fetch all products from Firestore
  useEffect(() => {
    try {
      const products = getAllProducts();
      setAllProducts(products);
    } catch (error) {
      setError('Failed to load products.');
    }
  }, []);

  // Pagination
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return results.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [results, currentPage]);

  // UI rendering
  return (
    <div className="search-results-container">
      <div className="search-header" style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '24px 0 16px 0' }}>
        <PowerSearch
          products={allProducts}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSearch={(term, filteredProducts) => {
            setSearchTerm(term);
            setResults(filteredProducts || []);
            setCurrentPage(1);
          }}
        />
        <div className="search-stats">
          {loading ? (
            <span>🔍 Searching...</span>
          ) : error ? (
            <span>❌ {error}</span>
          ) : (
            <div className="results-info">
              <span>📊 Found {results.length} results for "{queryParam}"</span>
            </div>
          )}
        </div>
      </div>
      <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {loading && Array(12).fill(null).map((_, i) => (
          <ProductCard key={i} loading={true} />
        ))}
        {!loading && paginatedResults.length === 0 && (
          <div className="no-results">
            <h2>😕 No Results Found</h2>
            <p>Try adjusting your search terms or filters</p>
            <button onClick={() => navigate('/')}>Back to Home</button>
          </div>
        )}
        {paginatedResults.map((product, index) => (
          <div key={product.id || index} className="result-item">
            <ProductCard product={product} compact={true} onProductClick={setSelectedProduct} />
          </div>
        ))}
      </div>
      {results.length > ITEMS_PER_PAGE && (
        <div className="load-more-section">
          <button className="load-more-btn" onClick={() => setCurrentPage(prev => prev + 1)}>
            Load More
          </button>
        </div>
      )}
      {selectedProduct && (
        <ProductDetailPanel
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default SearchResults; 