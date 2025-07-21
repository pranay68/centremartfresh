import { useSearchParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductGrid/ProductCard';
import ProductDetailPanel from '../components/ProductDetailPanel';
import PowerSearch from '../components/PowerSearch';
import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const ITEMS_PER_PAGE = 20;

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryParam = searchParams.get('q') || searchParams.get('query') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [allProducts, setAllProducts] = useState([]);

  // Search products when query changes
  useEffect(() => {
    if (!queryParam.trim()) {
      setResults([]);
      return;
    }
    const doSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        // In PowerSearch, set products to all products (from Firestore or context), and update results in onSearch
        // For now, we'll just set the search term and let PowerSearch handle the search
        setSearchTerm(queryParam);
      } catch (error) {
        setError('Failed to search products. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    doSearch();
  }, [queryParam]);

  // Fetch all products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllProducts(products);
      } catch (error) {
        setError('Failed to load products.');
      }
    };
    fetchProducts();
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
            setHasMore((filteredProducts || []).length > ITEMS_PER_PAGE);
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