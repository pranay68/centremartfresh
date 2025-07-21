import React, { useEffect, useState, useCallback, useMemo } from 'react';
import ProductCard from '../components/ProductGrid/ProductCard';
import CategoryPanel from '../components/ProductGrid/CategoryPanel';
import FlashSaleSection from '../components/FlashSaleSection';
import TopSaleSection from '../components/TopSaleSection';
import NewArrivalsSection from '../components/NewArrivalsSection';
import AdminPanelControl from '../components/AdminPanelControl';
import Header from '../components/Header';
import ProductDetailPanel from '../components/ProductDetailPanel';
import CustomerSupport from '../components/CustomerSupport';
import AuthModal from '../components/auth/AuthModal';
import AIChat from '../components/AISystem/AIChat';
import AIDashboard from '../components/AISystem/AIDashboard';
import { Filter, SortAsc, Eye, Heart, ShoppingCart, Star, TrendingUp, Clock, Zap, Search, Grid3X3, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../firebase/config';
import {
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import './HomeMobile.css';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/ui/BottomNav';
import { Routes, Route } from 'react-router-dom';

const Home = () => {
  // Core State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Auth State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  
  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('featured');
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    rating: '',
    inStock: false,
    onSale: false
  });
  
  // User Data State
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState([]);
  const [compareList, setCompareList] = useState([]);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [showAllRecentlyViewed, setShowAllRecentlyViewed] = useState(false);
  
  // Review State
  const [userOrders, setUserOrders] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingOrder, setReviewingOrder] = useState(null);

  const { user } = useAuth();

  // Utility Functions
  const normalize = useCallback((str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '')
      .replace(/moblie|mobl|mobliee/g, 'mobile')
      .replace(/sho|sneekar|snkar/g, 'shoe')
      .replace(/laptap|labtop/g, 'laptop')
      .replace(/tv|teevee|tvee/g, 'television');
  }, []);

  // Advanced filtering and sorting
  const applyFiltersAndSort = useCallback((products) => {
    // Filter out invalid products first
    let filtered = products.filter(product => product && product.id && product.name);

    // Apply search filter
    // This logic is now handled by SearchResults component

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
  }, [searchTerm, filters, sortBy]); // Removed filterProducts from dependencies

  // Real-time product loading
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => {
          // Simple filtering - just remove obviously corrupted data
          if (!item || !item.id) return false;
          if (!item.name || item.name === 'undefined' || item.name === 'null') return false;
          if (item.name.includes('RAHUL ACCOUNT COPY')) return false;
          return true;
        });
      setProducts(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load user data
  useEffect(() => {
    const loadUserData = () => {
      try {
        const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        const wishlistData = JSON.parse(localStorage.getItem('wishlist') || '[]');
        const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
        const compareData = JSON.parse(localStorage.getItem('compareList') || '[]');
        
        setRecentlyViewed(viewed);
        setWishlist(wishlistData);
        setCart(cartData);
        setCompareList(compareData);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
    
    // Check admin status
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
  }, []);

  // Computed values
  const displayProducts = useMemo(() => applyFiltersAndSort(products), [products, applyFiltersAndSort]);
  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);
  
  const panels = useMemo(() => {
    if (products.length === 0) return [];
    
    const categoryGroups = categories.map(category => {
      const categoryProducts = products.filter(p => p.category === category);
      return {
        title: category,
        products: categoryProducts.slice(0, 6)
      };
    }).filter(panel => panel.products.length > 0);

    return categoryGroups;
  }, [products, categories]);

  const PRODUCTS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(displayProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return displayProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [displayProducts, currentPage]);

  // Event Handlers
  // Remove filterProducts and applyFiltersAndSort searchTerm logic
  // Only setSearchTerm and route to /search?query=...
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    // Route to search results page
    window.location.href = `/search?query=${encodeURIComponent(term)}`;
  }, []);

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
      handleAuthRequired();
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    const newCart = existingItem 
      ? cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cart, { ...product, quantity: 1 }];
    
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    toast.success(`${product.name} added to cart!`);
  }, [cart, user]);

  const handleAddToWishlist = useCallback((product) => {
    if (!user) {
      handleAuthRequired();
      return;
    }

    const isInWishlist = wishlist.find(item => item.id === product.id);
    const newWishlist = isInWishlist 
      ? wishlist.filter(item => item.id !== product.id)
      : [...wishlist, product];
    
    setWishlist(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
    toast.success(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist!');
  }, [wishlist, user]);

  const handleAddToCompare = useCallback((product) => {
    if (!user) {
      handleAuthRequired();
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
      handleAuthRequired();
      return;
    }
    setQuickViewProduct(product);
    setShowQuickView(true);
  }, [user]);

  const handleAuthRequired = useCallback(() => {
    setAuthTab('login');
    setShowAuthModal(true);
  }, []);

  const handleSectionEdit = useCallback((sectionType) => {
    console.log(`Editing section: ${sectionType}`);
    alert(`Edit ${sectionType} section - Admin panel coming soon!`);
  }, []);

  const handleAdminSave = useCallback((sections) => {
    console.log('Saving sections:', sections);
    localStorage.setItem('adminSections', JSON.stringify(sections));
    alert('Sections saved successfully!');
  }, []);

  const handleAdminDelete = useCallback((sectionId) => {
    console.log('Deleting section:', sectionId);
    alert(`Section ${sectionId} deleted!`);
  }, []);

  const handleOpenReviews = useCallback(async () => {
    if (!user) {
      alert('Please sign in to view your reviews.');
      return;
    }
    
    try {
      const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      setUserOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setShowReviewModal(true);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    }
  }, [user]);

  const handleSubmitReview = useCallback(async (order, review) => {
    try {
      await addDoc(collection(db, 'productReviews'), {
        productId: order.productId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonymous',
        rating: review.rating,
        text: review.text,
        createdAt: new Date(),
        verified: true
      });
      toast.success('Review submitted!');
      setReviewingOrder(null);
      setShowReviewModal(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    }
  }, [user]);

  // Review modal event listener
  useEffect(() => {
    const openReviewsListener = () => handleOpenReviews();
    window.addEventListener('open-reviews-modal', openReviewsListener);
    return () => window.removeEventListener('open-reviews-modal', openReviewsListener);
  }, [handleOpenReviews]);

  return (
    <div className="home-page">
      <Header 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        products={products}
        onSearch={handleSearch}
        className="mobile-sticky-header"
      />

      {/* Admin Panel Control */}
      <AdminPanelControl 
        isVisible={isAdmin}
        onSave={handleAdminSave}
        onDelete={handleAdminDelete}
        onEdit={handleSectionEdit}
      />

      {/* Hero Section */}
      {!searchTerm && (
        <section className="hero-section mobile-hero-section">
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
          products={products}
          onProductClick={handleProductClick}
          isAdmin={isAdmin}
          onEdit={handleSectionEdit}
          onAuthRequired={handleAuthRequired}
        />
      )}

      {/* Top Sale Section */}
      {!searchTerm && (
        <TopSaleSection 
          products={products}
          onProductClick={handleProductClick}
          isAdmin={isAdmin}
          onEdit={handleSectionEdit}
          onAuthRequired={handleAuthRequired}
        />
      )}

      {/* New Arrivals Section */}
      {!searchTerm && (
        <NewArrivalsSection 
          products={products}
          onProductClick={handleProductClick}
          isAdmin={isAdmin}
          onEdit={handleSectionEdit}
          onAuthRequired={handleAuthRequired}
        />
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
          <div className="product-grid">
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
                className="mobile-product-card"
              />
            ))}
          </div>
        </section>
      )}

      {/* Category Panels */}
      {panels.length > 0 && !searchTerm && (
        <>
          {panels.map((panel, i) => {
            const filtered = applyFiltersAndSort(panel.products); // Use applyFiltersAndSort directly
            return filtered.length > 0 ? (
              <CategoryPanel
                key={i}
                title={panel.title}
                products={filtered}
                onProductClick={handleProductClick}
                onAuthRequired={handleAuthRequired}
                compact={true}
                className="mobile-category-panel"
              />
            ) : null;
          })}
        </>
      )}

      {/* Filters and Sorting Bar */}
      {(panels.length === 0 || searchTerm) && (
        <section className="filters-sorting-bar">
          <div className="filters-container">
            <button 
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              Filters
            </button>
            
            <div className="sort-container">
              <SortAsc size={16} />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="view-mode-container">
              <button 
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <Grid3X3 size={16} />
              </button>
              <button 
                className={`view-mode-btn ${viewMode === 'compact' ? 'active' : ''}`}
                onClick={() => setViewMode('compact')}
                title="Compact View"
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="advanced-filters">
              <div className="filter-group">
                <label>Category:</label>
                <select 
                  value={filters.category} 
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Price Range:</label>
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                />
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                />
              </div>
              
              <div className="filter-group">
                <label>Rating:</label>
                <select 
                  value={filters.rating} 
                  onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={filters.inStock}
                    onChange={(e) => setFilters(prev => ({ ...prev, inStock: e.target.checked }))}
                  />
                  In Stock Only
                </label>
              </div>
              
              <div className="filter-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={filters.onSale}
                    onChange={(e) => setFilters(prev => ({ ...prev, onSale: e.target.checked }))}
                  />
                  On Sale Only
                </label>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Search Results */}
      {(panels.length === 0 || searchTerm) && (
        <section className="product-section" id="products">
          <div className="products-header">
            <h2 className="products-title">
              {searchTerm ? `Search Results for "${searchTerm}"` : 'All Products'}
            </h2>
            <div className="results-info">
              <span>{displayProducts.length} products found</span>
              {compareList.length > 0 && (
                <button className="compare-btn">
                  Compare ({compareList.length})
                </button>
              )}
            </div>
          </div>

          <div className={`product-grid ${viewMode === 'compact' ? 'compact-view' : ''}`}>
            {loading && !products.length && !searchTerm &&
              Array(12).fill(null).map((_, i) => (
                <ProductCard key={i} loading={true} />
              ))}

            {displayProducts.length === 0 && searchTerm && !loading && (
              <div className="no-results">
                <div className="no-results-content">
                  <Search size={48} />
                  <h3>No products found</h3>
                  <p>Try adjusting your search terms or filters</p>
                  <button 
                    onClick={() => {
                      setSearchTerm('');
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

            {(() => {
  const cards = paginatedProducts.map((product) => (
              <div
                key={product.id}
                className={viewMode === 'compact' ? 'compact-product-wrapper' : ''}
              >
                <ProductCard 
                  product={product} 
                  onProductClick={handleProductClick}
                  onQuickAdd={handleQuickAddToCart}
                  onWishlist={handleAddToWishlist}
                  onCompare={handleAddToCompare}
                  onQuickView={handleQuickView}
                  isInWishlist={wishlist.find(item => item.id === product.id)}
                  isInCompare={compareList.find(item => item.id === product.id)}
                  compact={viewMode === 'compact'}
                  onAuthRequired={handleAuthRequired}
                  className="mobile-product-card"
                />
              </div>
  ));
  // Pad with empty divs if less than 4
  const minPerRow = 4;
  const remainder = cards.length % minPerRow;
  if (remainder !== 0 && cards.length > 0) {
    for (let i = 0; i < minPerRow - remainder; i++) {
      cards.push(<div key={`empty-${i}`} className="product-card empty-card" />);
    }
  }
  return cards;
})()}
          </div>
          {/* Pagination Buttons */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`pagination-btn${currentPage === i + 1 ? ' active' : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
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
                <img 
                  src={quickViewProduct.imageUrl || quickViewProduct.image || 'https://via.placeholder.com/300x200?text=Product+Image'} 
                  alt={quickViewProduct.name}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x200?text=Product+Image';
                    e.target.onerror = null;
                  }}
                />
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
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
          defaultTab={authTab}
        />
      )}

      {/* Customer Support Chat */}
      <CustomerSupport />

      {/* AI System */}
      <AIChat />
      <AIDashboard />

      {/* Bottom Navigation */}
      <BottomNav className="mobile-bottom-nav" />
    </div>
  );
};

export default Home;