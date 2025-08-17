import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductGrid/ProductCard';
import CategoryPanel from '../components/ProductGrid/CategoryPanel';
import FlashSaleSection from '../components/FlashSaleSection';
import TopSaleSection from '../components/TopSaleSection';
import AdminPanelControl from '../components/AdminPanelControl';
import Header from '../components/Header';
// SearchAnalytics removed to reduce bundle size
import ProductDetailPanel from '../components/ProductDetailPanel';
import { Eye, ShoppingCart, Star, Search, Heart, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import publicProducts from '../utils/publicProducts';
import { getPrimaryImageOrPlaceholder } from '../utils/imageHelper';
import './HomeNew.css';
// RatingAndReviews removed (not used here)
import ReviewModal from '../components/ReviewModal';
import BottomNav from '../components/ui/BottomNav';
import CustomerSupportChat from '../components/CustomerSupportChat';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  // panels removed - not used
  const [visibleCategories, setVisibleCategories] = useState(4); // Initially show 4 categories
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // pagination constant removed (not used)
  const categoryObserverRef = useRef();

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();
  const [showSupport, setShowSupport] = useState(false);
  const [supportInitialMessage, setSupportInitialMessage] = useState('');
  
  // Premium Features State
  const [sortBy] = useState('featured');
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    rating: '',
    inStock: false,
    onSale: false
  });
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState([]);
  const [compareList, setCompareList] = useState([]);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [showAllRecentlyViewed, setShowAllRecentlyViewed] = useState(false);
  
  // observer/cache removed to reduce complexity
  
  // Define categories early
  const [categories, setCategories] = useState([]);
  // lastFetch removed
  const [loadError, setLoadError] = useState(null);

  // Effect to update categories whenever allProducts changes
  useEffect(() => {
    const uniqueCategories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
    setCategories(uniqueCategories);
  }, [allProducts]);

  // Remove the normalize and filterProducts functions

  // Premium: Apply filters and sorting
  const applyFiltersAndSort = useCallback((products) => {
    let filtered = [...products];

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    // Apply price filters
    if (filters.minPrice) {
      filtered = filtered.filter(p => p.price >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(p => p.price <= parseFloat(filters.maxPrice));
    }

    // Apply rating filter
    if (filters.rating) {
      filtered = filtered.filter(p => (p.rating || 0) >= parseFloat(filters.rating));
    }

    // Apply stock filter
    if (filters.inStock) {
      filtered = filtered.filter(p => p.stock > 0);
    }

    // Apply sale filter
    if (filters.onSale) {
      filtered = filtered.filter(p => p.originalPrice && p.originalPrice > p.price);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
        break;
      default:
        // Featured - keep original order
        break;
    }

    return filtered;
  }, [filters, sortBy]);

  // Set compact mode by default for search results
  const [viewMode] = useState(searchTerm ? 'compact' : 'grid');

  // Load products from Supabase incrementally: small initial load for top sections, background fetch for rest
  // constants for potential future incremental loads
  // constants reserved for future incremental loading (kept to avoid refactor churn)
  // eslint-disable-next-line no-unused-vars
  const INITIAL_LOAD = 24; // few products to show immediately (top sellers etc.)
  // eslint-disable-next-line no-unused-vars
  const BACKGROUND_CHUNK = 500; // fetch remaining in larger chunks

  // duplicateWarning kept for future alerts; currently unused
  useState(null); // keep state slot to avoid refactor churn

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Diagnostic: log publicProducts shape to help debug loading issues
      // (will be removed once root cause is identified)
      // eslint-disable-next-line no-console
      console.debug('publicProducts object:', publicProducts, 'ensureLoaded type:', typeof publicProducts?.ensureLoaded);
      if (!publicProducts || typeof publicProducts.ensureLoaded !== 'function') {
        throw new Error('publicProducts.ensureLoaded is not available');
      }
      // Load from public snapshot via mid-file. Protect against a hung or
      // throwing loader by racing with a short timeout and falling back to
      // the current cached snapshot to avoid freezing React passive effects.
      try {
        const loaderPromise = publicProducts.ensureLoaded();
        const timeoutPromise = new Promise((res) => setTimeout(() => res(null), 3000));
        const result = await Promise.race([loaderPromise, timeoutPromise]);
        if (result === null) {
          // timed out - use whatever is currently cached
          // eslint-disable-next-line no-console
          console.warn('publicProducts.ensureLoaded timed out; using cached snapshot');
        }
      } catch (e) {
        // ensureLoaded threw synchronously or rejected; log and continue with cached
        // eslint-disable-next-line no-console
        console.error('publicProducts.ensureLoaded threw:', e);
      }

      const snapshot = (publicProducts && typeof publicProducts.getAllCached === 'function') ? publicProducts.getAllCached() : [];
      // Avoid unnecessary state updates if snapshot hasn't changed (prevents render loops)
      try {
        const snapStr = JSON.stringify(snapshot || []);
        if (typeof window !== 'undefined') {
          if (!window.__centremart_last_products_snapshot || window.__centremart_last_products_snapshot !== snapStr) {
            window.__centremart_last_products_snapshot = snapStr;
            setAllProducts(snapshot || []);
            setProducts(applyFiltersAndSort(snapshot || []));
          } else {
            // snapshot unchanged, skip state updates
          }
        } else {
          setAllProducts(snapshot || []);
          setProducts(applyFiltersAndSort(snapshot || []));
        }
      } catch (e) {
        // fallback: set state normally if stringify fails
        setAllProducts(snapshot || []);
        setProducts(applyFiltersAndSort(snapshot || []));
      }
      setLoadError(null);
    } catch (error) {
      // Log full error details to console for debugging (message + stack)
      // eslint-disable-next-line no-console
      console.error('Error loading products:', error, '\nstack:', error?.stack);
      setLoadError(error?.message || String(error));
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [applyFiltersAndSort]);

  // Initialize intersection observers for infinite scroll
  // Remove infinite scroll logic for Firestore pagination
  const lastProductRef = useCallback(node => {}, []);

  // Category lazy loading observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && visibleCategories < categories.length) {
          setVisibleCategories(prev => Math.min(prev + 3, categories.length));
        }
      },
      { rootMargin: '100px' }
    );

    if (categoryObserverRef.current) {
      observer.observe(categoryObserverRef.current);
    }

    return () => observer.disconnect();
  }, [visibleCategories, categories.length]);

  // Fetch products by category from in-memory Supabase list
  const fetchProductsByCategory = useCallback((category) => {
    setLoading(true);
    try {
      const filtered = allProducts.filter(p => p.category === category);
      setProducts(applyFiltersAndSort(filtered));
    } catch (error) {
      console.error('Error filtering products by category:', error);
      toast.error('Failed to filter products');
    } finally {
      setLoading(false);
    }
  }, [applyFiltersAndSort, allProducts]);

  // Effect to fetch initial products once on mount. Using a stable
  // no-deps effect avoids the "maximum update depth" caused by
  // repeatedly changing `loadProducts` identity and re-running the effect.
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for product image updates from other panels and refresh cache
  useEffect(() => {
    const onRefresh = async () => {
      try {
        setLoading(true);
        // Force refresh cache and reload products
        await publicProducts.refresh();
        const snapshot = publicProducts.getAllCached();
        setAllProducts(snapshot || []);
        setProducts(applyFiltersAndSort(snapshot || []));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Home reload after product change failed', e);
      } finally {
        setLoading(false);
      }
    };
    // Wrap listeners with safe wrappers so listener errors don't bubble up
    const safeOnRefresh = async (e) => {
      try {
        await onRefresh(e);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error in supabase_products_refresh handler:', err);
      }
    };

    const safeStorageHandler = (e) => {
      try {
        if (e.key === 'supabase_products_refresh_signal') onRefresh();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error in storage event handler:', err);
      }
    };

    window.addEventListener('supabase_products_refresh', safeOnRefresh);
    window.addEventListener('storage', safeStorageHandler);
    // Close overlays when signaled
    const closeModalsHandler = () => {
      try {
        // Attempt to find known overlay elements and remove them
        const overlays = document.querySelectorAll('.quick-view-overlay, .quick-view-modal, .product-detail-panel, .modal, .quick-view-overlay');
        overlays.forEach(el => el.remove());
      } catch (e) {}
    };
    window.addEventListener('close-all-modals', closeModalsHandler);
    return () => {
      window.removeEventListener('supabase_products_refresh', safeOnRefresh);
      window.removeEventListener('storage', safeStorageHandler);
      window.removeEventListener('close-all-modals', closeModalsHandler);
    };
  }, [applyFiltersAndSort]);

  // Reset products when category changes
  useEffect(() => {
    if (filters.category) {
      fetchProductsByCategory(filters.category);
    } else {
      loadProducts();
    }
  }, [filters.category, fetchProductsByCategory, loadProducts]);

  // Render products with intersection observer
  // Render products directly in JSX to avoid stale refs; keep mapping simple

  // Remove real-time product updates (onSnapshot) for products

  // Remove fetchAllProducts and fetchPanels, and use allProducts for panels and sections.

  // Premium: Load user data
  useEffect(() => {
    // load small local caches
      const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const wishlistData = JSON.parse(localStorage.getItem('wishlist') || '[]');
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
      const compareData = JSON.parse(localStorage.getItem('compareList') || '[]');
      setRecentlyViewed(viewed);
      setWishlist(wishlistData);
      setCart(cartData);
      setCompareList(compareData);
    // call loadProducts once
    loadProducts();
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const openHandler = (e) => {
      setSupportInitialMessage(e.detail?.initialMessage || '');
      setShowSupport(true);
    };
    window.addEventListener('open-support-chat', openHandler);
    return () => window.removeEventListener('open-support-chat', openHandler);
  }, []);

  const handleSearch = useCallback((term, filteredProducts = null) => {
    setSearchTerm(term);
    setInputValue(term);
    if (filteredProducts) {
      setProducts(filteredProducts);
    }
  }, []);

  // Premium: Handle product interactions
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    
    // Add to recently viewed
    const newViewed = [product, ...recentlyViewed.filter(p => p.id !== product.id)].slice(0, 10);
    setRecentlyViewed(newViewed);
    localStorage.setItem('recentlyViewed', JSON.stringify(newViewed));
  };

  const handleCloseProductDetail = () => {
    setSelectedProduct(null);
  };

  // Premium: Quick add to cart
  const handleQuickAddToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    const newCart = existingItem 
      ? cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cart, { ...product, quantity: 1 }];
    
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    
    // Show success toast
    toast.success(`${product.name} added to cart!`);
  };

  // Premium: Add to wishlist
  const handleAddToWishlist = (product) => {
    const isInWishlist = wishlist.find(item => item.id === product.id);
    const newWishlist = isInWishlist 
      ? wishlist.filter(item => item.id !== product.id)
      : [...wishlist, product];
    
    setWishlist(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
    
    toast.success(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist!');
  };

  // Premium: Add to compare
  const handleAddToCompare = (product) => {
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
  };

  // Premium: Quick view
  const handleQuickView = (product) => {
    setQuickViewProduct(product);
    setShowQuickView(true);
  };

  const handleSectionEdit = (sectionType) => {
    console.log(`Editing section: ${sectionType}`);
    // Simple alert for now - we'll build admin panel later
    alert(`Edit ${sectionType} section - Admin panel coming soon!`);
  };

  const handleAdminSave = (sections) => {
    console.log('Saving sections:', sections);
    // Save to localStorage for now
    localStorage.setItem('adminSections', JSON.stringify(sections));
    alert('Sections saved successfully!');
  };

  const handleAdminDelete = (sectionId) => {
    console.log('Deleting section:', sectionId);
    alert(`Section ${sectionId} deleted!`);
  };

  // Auth Required Handler
  const handleAuthRequired = () => {
    // show auth modal via Header control
    setShowAuthModal(true);
  };

  // Get filtered and sorted products
  const displayProducts = applyFiltersAndSort(products);

  return (
    <div className="home-page">
      {loadError && (
        <div style={{background:'#fee2e2', color:'#b91c1c', padding:'8px 12px', fontSize:12}}>
          Load error: {String(loadError)} — check console for [Supabase Debug]
        </div>
      )}
      <Header 
        searchTerm={inputValue}
        setSearchTerm={setInputValue}
        products={allProducts}
        onSearch={(term, filteredProducts) => {
          handleSearch(term, filteredProducts);
        }}
      />

      {/* Loading overlay for initial product fetch */}
      {loading && allProducts.length === 0 && (
        <div style={{display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
          <div style={{background:'#fff', padding:12, borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
            <div style={{fontSize:16, color:'#374151', fontWeight:600}}>Loading products...</div>
            <div style={{fontSize:12, color:'#6b7280', marginTop:6}}>If this takes long, check your Supabase configuration in .env</div>
          </div>
        </div>
      )}

      {/* Admin Panel Control */}
      <AdminPanelControl 
        isVisible={isAdmin}
        onSave={handleAdminSave}
        onDelete={handleAdminDelete}
        onEdit={handleSectionEdit}
      />

      {/* Hero Section */}
      {!searchTerm && (
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-logo">
              <img 
                src="/image.png" 
                alt="Centre Mart Logo" 
                className="hero-logo-image"
              />
              <h1 className="hero-title">Centre Mart</h1>
            </div>
            <p className="hero-subtitle">
              Discover amazing products at unbeatable prices. Shop smart, live better.
            </p>
            <a href="#products" className="hero-cta">
              🛍️ Shop Now
            </a>
          </div>
        </section>
      )}

      {/* Flash Sale Section */}
      {!searchTerm && (
        <FlashSaleSection 
          products={allProducts}
          onProductClick={handleProductClick}
          isAdmin={isAdmin}
          onEdit={handleSectionEdit}
          onAuthRequired={handleAuthRequired}
        />
      )}

      {/* Top Sale Section */}
      {!searchTerm && (
        <TopSaleSection 
          products={allProducts}
          onProductClick={handleProductClick}
          isAdmin={isAdmin}
          onEdit={handleSectionEdit}
          onAuthRequired={handleAuthRequired}
        />
      )}

      {/* For You (Personalized) Section - placeholder for now */}
      {!searchTerm && (
        <section className="for-you-section">
          <div className="products-header">
            <h2 className="products-title">For You</h2>
            <div className="results-info">
              <span>Personalized recommendations coming soon</span>
            </div>
          </div>
          {/* TODO: Add personalized logic here */}
        </section>
      )}

      {/* Category Panels - show each category and its products */}
      {!searchTerm && (
        <>
          {categories.slice(0, visibleCategories).map((cat, i) => {
            const catProducts = allProducts.filter(p => p.category === cat);
            return catProducts.length > 0 ? (
              <div 
                key={cat} 
                ref={i === visibleCategories - 1 ? categoryObserverRef : null}
              >
                <CategoryPanel
                  title={cat}
                  products={catProducts}
                  onProductClick={handleProductClick}
                  onAuthRequired={handleAuthRequired}
                  compact={true}
                />
              </div>
            ) : null;
          })}
          {visibleCategories < categories.length && (
            <div className="load-more-categories">
              <button 
                onClick={() => setVisibleCategories(prev => Math.min(prev + 3, categories.length))}
                className="load-more-btn"
              >
                Load More Categories
              </button>
            </div>
          )}
        </>
      )}

      {/* Recently Viewed Section */}
      {recentlyViewed.length > 0 && !searchTerm && (
        <section className="recently-viewed-section">
          <div className="section-header">
            <div className="section-title">
              <Eye size={20} />
              <h2>Recently Viewed</h2>
            </div>
            <button className="view-all-btn" onClick={() => setShowAllRecentlyViewed(v => !v)}>
              {showAllRecentlyViewed ? 'Show Less' : 'View All'}
            </button>
          </div>
          <div className="products-grid product-bar-grid">
            {(showAllRecentlyViewed ? recentlyViewed : recentlyViewed.slice(0, 6)).map(product => (
              <ProductCard 
                key={product.id}
                product={product}
                onProductClick={handleProductClick}
                onQuickAdd={handleQuickAddToCart}
                onWishlist={handleAddToWishlist}
                onCompare={handleAddToCompare}
                onQuickView={handleQuickView}
                isInWishlist={wishlist.find(item => item.id === product.id)}
                isInCompare={compareList.find(item => item.id === product.id)}
                onAuthRequired={handleAuthRequired}
                compact={true}
              />
            ))}
          </div>
        </section>
      )}

      {/* Filters and sorting removed per request */}

      {/* Search Results Section - only show if searching */}
      {searchTerm && (
        <section className="product-section" id="products">
          <div className="products-header">
            <h2 className="products-title">{`Search Results for "${searchTerm}"`}</h2>
            <div className="results-info">
              <span>{displayProducts.length} products found</span>
              {compareList.length > 0 && (
                <button className="compare-btn">
                  Compare ({compareList.length})
                </button>
              )}
            </div>
          </div>
          <div className={`products-grid ${viewMode === 'compact' ? 'compact-view' : ''}`}>
            {displayProducts.length === 0 && (
              <div className="no-results">
                <div className="no-results-content">
                  <Search size={48} />
                  <h3>No products found</h3>
                  <p>Try adjusting your search terms or filters</p>
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setInputValue(''); // Clear inputValue as well
                      setFilters({
                        category: '',
                        minPrice: '',
                        maxPrice: '',
                        rating: '',
                        inStock: false,
                        onSale: false
                      });
                    }}
                    className="clear-filters-btn"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
          )}
          {displayProducts.map((product, i, arr) => {
              const isLast = i === arr.length - 1 && searchTerm;
            return (
              <div
                key={product.id}
                ref={isLast ? lastProductRef : null}
                className={viewMode === 'compact' ? 'compact-product-wrapper' : ''}
              >
                  <ProductCard 
                    product={product} 
                    onProductClick={handleProductClick}
                    compact={viewMode === 'compact'}
                    onAuthRequired={handleAuthRequired}
                  />
              </div>
            );
          })}
          </div>
        </section>
      )}

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

      {/* Quick View Modal */}
      {showQuickView && quickViewProduct && (
        <div className="quick-view-overlay" onClick={() => setShowQuickView(false)}>
          <div className="quick-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quick-view-content">
              <div className="quick-view-image">
                <img src={getPrimaryImageOrPlaceholder(quickViewProduct)} alt={quickViewProduct.name} />
              </div>
              <div className="quick-view-details">
                <h3>{quickViewProduct.name}</h3>
                <div className="quick-view-price">
                  <span className="current-price">${quickViewProduct.price}</span>
                  {quickViewProduct.originalPrice && (
                    <span className="original-price">${quickViewProduct.originalPrice}</span>
                  )}
                </div>
                <div className="quick-view-rating">
                  <Star size={16} />
                  <span>{quickViewProduct.rating || 0} ({quickViewProduct.reviewCount || 0} reviews)</span>
                </div>
                <p className="quick-view-description">{quickViewProduct.description}</p>
                <div className="quick-view-actions">
                  <button 
                    className="add-to-cart-btn"
                    onClick={() => {
                      handleQuickAddToCart(quickViewProduct);
                      setShowQuickView(false);
                    }}
                  >
                    <ShoppingCart size={16} />
                    Add to Cart
                  </button>
                  <button 
                    className={`wishlist-btn ${wishlist.find(item => item.id === quickViewProduct.id) ? 'active' : ''}`}
                    onClick={() => handleAddToWishlist(quickViewProduct)}
                  >
                    <Heart size={16} />
                  </button>
                  <button 
                    className={`compare-btn ${compareList.find(item => item.id === quickViewProduct.id) ? 'active' : ''}`}
                    onClick={() => handleAddToCompare(quickViewProduct)}
                  >
                    <TrendingUp size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <ReviewModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}

      {/* Customer Support: live chat launcher */}
      {user && !showSupport && (
        <button className="support-widget-btn" onClick={() => setShowSupport(true)}>
          💬 Support
        </button>
      )}
      <CustomerSupportChat 
        isOpen={!!showSupport}
        onClose={() => setShowSupport(false)}
        customerId={user?.uid}
        customerName={user?.displayName || user?.email?.split('@')[0] || 'User'}
        initialMessage={supportInitialMessage}
      />

      {/* ReviewModal is now global, not rendered here */}
      <BottomNav />
    </div>
  );
};

export default Home;