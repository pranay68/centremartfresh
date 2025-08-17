import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingCart, Bell, User, Home as HomeIcon } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import './HomeMobile.css';
import publicProducts from '../utils/publicProducts';

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
  const productCache = useRef({});

  // Fetch all products from Supabase
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      await publicProducts.ensureLoaded();
      const allProducts = publicProducts.getAllCached();
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
    }
  }, []);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Handle scroll position and memory management
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const totalProducts = products.length;
    if (totalProducts === 0) return;

    const currentIndex = Math.floor((scrollTop / Math.max(1, scrollHeight - clientHeight)) * totalProducts);
    let start = Math.max(0, currentIndex - Math.floor(BUFFER_SIZE / 2));
    let end = Math.min(totalProducts, start + BUFFER_SIZE);
    if (end - start < BUFFER_SIZE) start = Math.max(0, end - BUFFER_SIZE);

    if (start !== visibleRange.start || end !== visibleRange.end) {
      setVisibleRange({ start, end });
      // Cache products that are outside the visible window
      const newCache = { ...productCache.current };
      products.forEach((product, idx) => {
        if (idx < start || idx > end) {
          newCache[product.id] = product;
        }
      });
      productCache.current = newCache;
    }
  }, [products, visibleRange.start, visibleRange.end]);

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Attach scroll handler
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.addEventListener('scroll', handleScroll, { passive: true });
    return () => node.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
                transform: `translateY(${(productPositions[product.id] || 0) * 100}%)`
              }}
            >
              <div className="mobile-product-image-wrapper">
                <img 
                  src={product.image || '/placeholder-product.jpg'} 
                  alt={product.name}
                  loading="lazy"
                  className="mobile-product-image"
                />
              </div>
              <div className="mobile-product-info">
                <h3>{product.name}</h3>
                <div className="mobile-product-price">
                  <span className="current-price">
                    ${Number(product.price || product.sp || 0).toFixed(2)}
                  </span>
                </div>
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
            <HomeIcon size={24} />
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

export default HomeMobile;