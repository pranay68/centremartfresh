import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import ProductCard from '../components/ProductGrid/ProductCard';
import ProductDetailPanel from '../components/ProductDetailPanel';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import toast from 'react-hot-toast';
import '../pages/SearchResults.css';
import PowerSearch from '../components/PowerSearch';

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
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [compareList, setCompareList] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState(queryParam);

  const { user } = useAuth();
  const { cart, setCart } = useCart();
  const { wishlist, setWishlist } = useWishlist();

  const ITEMS_PER_PAGE = 20;

  // Load recently viewed products and compare list
  useEffect(() => {
    const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    const compareData = JSON.parse(localStorage.getItem('compareList') || '[]');
    setRecentlyViewed(viewed);
    setCompareList(compareData);
  }, []);

  // Fetch all products for PowerSearch
  useEffect(() => {
    const fetchProducts = async () => {
      const productsCol = collection(db, 'products');
      const productsSnapshot = await getDocs(productsCol);
      const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsList);
    };
    fetchProducts();
  }, []);

  // Search products when query changes
  useEffect(() => {
    if (!queryParam.trim()) {
      setResults([]);
      return;
    }

    const searchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const productsRef = collection(db, 'products');
        const q = query(productsRef);
        const snapshot = await getDocs(q);
        
        const allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Simple search filtering
        const searchTerm = queryParam.toLowerCase();
        const filteredProducts = allProducts.filter(product => {
          if (!product || !product.name) return false;
          
          const name = product.name.toLowerCase();
          const category = (product.category || '').toLowerCase();
          const brand = (product.brand || '').toLowerCase();
          
          return name.includes(searchTerm) || 
                 category.includes(searchTerm) || 
                 brand.includes(searchTerm);
        });

        // Add simple scoring
        const scoredResults = filteredProducts.map(product => ({
          ...product,
          score: 80, // Simple score
          matchType: 'fuzzy'
        }));
        
        scoredResults.sort((a, b) => b.score - a.score);
        
        setResults(scoredResults);
        setCurrentPage(1);
        setHasMore(scoredResults.length > ITEMS_PER_PAGE);
        
      } catch (error) {
        console.error('Search error:', error);
        setError('Failed to search products. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    searchProducts();
  }, [queryParam]);

  // Pagination
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return results.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [results, currentPage]);

  // Get unique categories and brands for filters
  const categories = useMemo(() => {
    const cats = [...new Set(results.map(r => r.category))];
    return cats.filter(cat => cat);
  }, [results]);

  const brands = useMemo(() => {
    const brnds = [...new Set(results.map(r => r.brand))];
    return brnds.filter(brand => brand);
  }, [results]);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setCurrentPage(1);
    // Simple filtering - just update the results
    const filtered = results.filter(product => {
      if (filterType === 'category' && value) {
        return product.category === value;
      }
      if (filterType === 'brand' && value) {
        return product.brand === value;
      }
      return true;
    });
    setResults(filtered);
  };

  const handleSortChange = (sortBy) => {
    setCurrentPage(1);
    
    const sortedResults = [...results];
    switch (sortBy) {
      case 'name':
        sortedResults.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-low':
        sortedResults.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sortedResults.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        sortedResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        // Keep original order
        break;
    }
    setResults(sortedResults);
  };

  // Event handlers
  const handleProductClick = useCallback((product) => {
    setSelectedProduct(product);
    
    // Add to recently viewed
    const newViewed = [product, ...recentlyViewed.filter(p => p.id !== product.id)].slice(0, 10);
    setRecentlyViewed(newViewed);
    localStorage.setItem('recentlyViewed', JSON.stringify(newViewed));
  }, [recentlyViewed]);

  const handleCloseProductDetail = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const handleQuickAddToCart = useCallback((product) => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    const newCart = existingItem 
      ? cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cart, { ...product, quantity: 1 }];
    
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    toast.success(`${product.name} added to cart!`);
  }, [cart, user, setCart]);

  const handleAddToWishlist = useCallback((product) => {
    if (!user) {
      toast.error('Please sign in to add items to wishlist');
      return;
    }

    const isInWishlist = wishlist.find(item => item.id === product.id);
    const newWishlist = isInWishlist 
      ? wishlist.filter(item => item.id !== product.id)
      : [...wishlist, product];
    
    setWishlist(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
    toast.success(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist!');
  }, [wishlist, user, setWishlist]);

  const handleAddToCompare = useCallback((product) => {
    if (!user) {
      toast.error('Please sign in to add items to compare');
      return;
    }

    const isInCompare = compareList.find(item => item.id === product.id);
    const newCompare = isInCompare 
      ? compareList.filter(item => item.id !== product.id)
      : compareList.length < 4 ? [...compareList, product] : compareList;
    
    setCompareList(newCompare);
    localStorage.setItem('compareList', JSON.stringify(newCompare));
    
    if (!isInCompare && compareList.length >= 4) {
      toast.error('You can only compare up to 4 products');
    } else {
      toast.success(isInCompare ? 'Removed from compare' : 'Added to compare!');
    }
  }, [compareList, user]);

  const handleQuickView = useCallback((product) => {
    if (!user) {
      toast.error('Please sign in to view product details');
      return;
    }
    // For now, just open the product detail panel
    setSelectedProduct(product);
  }, [user]);

  const handleAuthRequired = useCallback(() => {
    toast.error('Please sign in to continue');
  }, []);

  if (!queryParam.trim()) {
    return (
      <div className="search-results-container">
        <div className="search-header">
          <div className="search-stats">
            <span>🔍 Enter a search term to find products</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results-container">
      {/* Mainstream PowerSearch Bar */}
      <div className="search-header">
        <PowerSearch
          products={products}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSearch={(term) => {
            setSearchTerm(term);
            navigate(`/search?query=${encodeURIComponent(term)}`);
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
              {compareList.length > 0 && (
                <button className="compare-btn">
                  Compare ({compareList.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters Sidebar */}
      <div className="search-content">
        <div className="filters-sidebar">
          <h3>Filters</h3>
          
          {/* Categories */}
          <div className="filter-group">
            <label>Categories</label>
            <select 
              onChange={(e) => handleFilterChange('category', e.target.value)}
              defaultValue=""
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Brands */}
          <div className="filter-group">
            <label>Brands</label>
            <select 
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              defaultValue=""
            >
              <option value="">All Brands</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="filter-group">
            <label>Sort By</label>
            <select onChange={(e) => handleSortChange(e.target.value)}>
              <option value="relevance">Best Match</option>
              <option value="name">Name A-Z</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Rating</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="filter-group">
            <label>Price Range</label>
            <select defaultValue="">
              <option value="">Any Price</option>
              <option value="0-100">Under ₹100</option>
              <option value="100-500">₹100 - ₹500</option>
              <option value="500-1000">₹500 - ₹1000</option>
              <option value="1000+">Over ₹1000</option>
            </select>
          </div>

          <button className="clear-filters-btn">
            🗑️ Clear All Filters
          </button>
        </div>

        {/* Results */}
        <div className="results-main">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Searching for products...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>❌ {error}</p>
              <button onClick={() => window.location.reload()}>Try Again</button>
            </div>
          ) : results.length === 0 ? (
            <div className="no-results">
              <h2>😕 No Results Found</h2>
              <p>Try adjusting your search terms or filters</p>
              <button onClick={() => navigate('/')}>Back to Home</button>
            </div>
          ) : (
            <>
              {/* Results Summary */}
              <div className="results-summary">
                <p>
                  Showing {Math.min(currentPage * ITEMS_PER_PAGE, results.length)} of {results.length} results
                </p>
              </div>

              {/* Results Grid */}
              <div className="results-grid">
                {paginatedResults.map((product, index) => (
                  <div key={`${product.id}-${index}`} className="result-item">
                    <ProductCard 
                      product={product}
                      showMatchScore={true}
                      matchScore={product.score}
                      matchType={product.matchType}
                      onProductClick={handleProductClick}
                      onQuickAdd={handleQuickAddToCart}
                      onWishlist={handleAddToWishlist}
                      onCompare={handleAddToCompare}
                      onQuickView={handleQuickView}
                      isInWishlist={wishlist.find(item => item.id === product.id)}
                      isInCompare={compareList.find(item => item.id === product.id)}
                      onAuthRequired={handleAuthRequired}
                      compact={true}
                      className="mobile-product-card"
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {results.length > ITEMS_PER_PAGE && (
                <div className="pagination">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span>Page {currentPage} of {Math.ceil(results.length / ITEMS_PER_PAGE)}</span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(results.length / ITEMS_PER_PAGE), prev + 1))}
                    disabled={currentPage >= Math.ceil(results.length / ITEMS_PER_PAGE)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Product Detail Panel */}
      {selectedProduct && (
        <ProductDetailPanel 
          product={selectedProduct}
          onClose={handleCloseProductDetail}
          onQuickAdd={handleQuickAddToCart}
          onWishlist={handleAddToWishlist}
          onCompare={handleAddToCompare}
          isInWishlist={wishlist.find(item => item.id === selectedProduct.id)}
          isInCompare={compareList.find(item => item.id === selectedProduct.id)}
        />
      )}
    </div>
  );
};

export default SearchResults; 
 