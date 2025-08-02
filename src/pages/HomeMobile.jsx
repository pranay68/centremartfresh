import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingCart, Bell, User, Home, MessageCircle } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import './HomeMobile.css';
import { getAllProducts } from '../utils/productData';

// const PRODUCTS_PER_PAGE = 10; // Removed as it is unused
const BUFFER_SIZE = 30; // Maximum products to keep in memory
const SCROLL_THRESHOLD = 0.8; // Load more when 80% scrolled

const HomeMobile = () => {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const navigate = useNavigate();
  
  // Product management states
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [productPositions, setProductPositions] = useState({}); // Track scroll positions
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: BUFFER_SIZE });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Refs
  const scrollRef = useRef(null);
  const loadingRef = useRef(false);
  // Fetch all products from local data
  const fetchProducts = useCallback(() => {
    setLoading(true);
    try {
      const allProducts = getAllProducts();
      setProducts(allProducts);
      // Set product positions for virtualization
      const positions = {};
      allProducts.forEach((p, idx) => {
        positions[p.id] = idx;
      });
      setProductPositions(positions);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Initialize scroll observer
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver(entries => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loadingRef.current) {
        fetchProducts(lastDoc);
      }
    }, options);

    const loadingElement = document.querySelector('.loading-trigger');
    if (loadingElement) {
      observer.observe(loadingElement);
    }

    return () => observer.disconnect();
  }, [fetchProducts, hasMore, lastDoc]);

  // Handle scroll position and memory management
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // Calculate visible range based on scroll position
    const totalProducts = products.length;
    const currentIndex = Math.floor((scrollTop / scrollHeight) * totalProducts);
    
    let start = Math.max(0, currentIndex - BUFFER_SIZE / 2);
    let end = Math.min(totalProducts, currentIndex + BUFFER_SIZE / 2);
    
    // Update visible range
    if (start !== visibleRange.start || end !== visibleRange.end) {
      setVisibleRange({ start, end });
      
      // Cache products that will be removed
      const newCache = {...productCache.current};
      products.forEach((product, idx) => {
        if (idx < start || idx > end) {
          newCache[product.id] = product;
        }
      });
      productCache.current = newCache;
    }
    
    // Check if we need to load more
    if (scrollPercentage > SCROLL_THRESHOLD && hasMore && !loadingRef.current) {
      fetchProducts(lastDoc);
    }
  }, [products, hasMore, lastDoc, fetchProducts, visibleRange]);

  // Restore products when scrolling up
  const restoreProducts = useCallback((start) => {
    if (start === 0 || !productCache.current) return;
    
    const productsToRestore = Object.values(productCache.current)
      .filter(p => productPositions[p.id] < start)
      .sort((a, b) => productPositions[a.id] - productPositions[b.id]);
    
    if (productsToRestore.length > 0) {

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Get visible products
  const visibleProducts = products.slice(visibleRange.start, visibleRange.end);

  if (!isMobile) {
    return null; // Don't render on non-mobile devices
  }

  return (
    <div className="mobile-view">
      <div className="mobile-container" ref={scrollRef}>
        {/* Header with search */}
        <header className="mobile-header">
          <div className="mobile-logo-section">
            <Link to="/">
              <img 
                src="/image.png" 
                alt="Centre Mart Logo" 
                className="mobile-logo"
                width={40}
                height={40}
              />
            </Link>
            <h1>Centre Mart</h1>
          </div>
          
          <form onSubmit={handleSearch} className="mobile-search-form">
            <div className="mobile-search-input-wrapper">
              <Search size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="mobile-search-input"
              />
            </div>
            <button type="submit" className="mobile-search-button">
              Search
            </button>
          </form>
        </header>

        {/* Product grid */}
        <div className="mobile-product-grid">
          {visibleProducts.map((product) => (
            <Link 
              to={`/product/${product.id}`}
              key={product.id}
              className="mobile-product-card"
              style={{
                transform: `translateY(${productPositions[product.id] * 100}%)`
              }}
            >
              <div className="mobile-product-image-wrapper">
                <img 
                  src={product.image || '/placeholder-product.jpg'} 
                  alt={product.name}
                  loading="lazy"
                  className="mobile-product-image"
                />
                {product.discount && (
                  <span className="mobile-product-discount">
                    -{product.discount}%
                  </span>
                )}
              </div>
              <div className="mobile-product-info">
                <h3>{product.name}</h3>
                <div className="mobile-product-price">
                  <span className="current-price">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.originalPrice && (
                    <span className="original-price">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                {product.rating && (
                  <div className="mobile-product-rating">
                    ⭐ {product.rating} ({product.reviews || 0})
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="loading-trigger">
            <div className="loading-spinner" />
          </div>
        )}

        {/* Bottom Navigation */}
        <nav className="mobile-nav">
          <Link to="/" className="mobile-nav-item active">
            <Home size={24} />
            <span>Home</span>
          </Link>
          <Link to="/cart" className="mobile-nav-item">
            <ShoppingCart size={24} />
            <span>Cart</span>
          </Link>
          <Link to="/wishlist" className="mobile-nav-item">
            <Heart size={24} />
            <span>Wishlist</span>
          </Link>
          <Link to="/notifications" className="mobile-nav-item">
            <Bell size={24} />
            <span>Alerts</span>
          </Link>
          <Link to="/account" className="mobile-nav-item">
            <User size={24} />
            <span>Account</span>
          </Link>
        </nav>
      </div>
    </div>
  );
};

}
}
export default HomeMobile;