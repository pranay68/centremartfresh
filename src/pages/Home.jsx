import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ProductCard from '../components/ProductGrid/ProductCard';
import CategoryPanel from '../components/ProductGrid/CategoryPanel';
import FlashSaleSection from '../components/FlashSaleSection';
import TopSaleSection from '../components/TopSaleSection';
import NewArrivalsSection from '../components/NewArrivalsSection';
import AdminPanelControl from '../components/AdminPanelControl';
import Header from '../components/Header';
import SearchAnalytics from '../components/SearchAnalytics';
import ProductDetailPanel from '../components/ProductDetailPanel';
import CustomerSupport from '../components/CustomerSupport';
import AuthModal from '../components/auth/AuthModal';
import { Filter, SortAsc, Eye, Heart, ShoppingCart, Star, TrendingUp, Clock, Zap, Search, Grid3X3, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../firebase/config';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  where,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import './HomeNew.css';
import { useAuth } from '../context/AuthContext';
import RatingAndReviews from '../components/RatingAndReviews';
import ReviewModal from '../components/ReviewModal';
import BottomNav from '../components/ui/BottomNav';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [panels, setPanels] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const PRODUCTS_PER_PAGE = 12;

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  
  // Premium Features State
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
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
  
  const observer = useRef();

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
  const [viewMode, setViewMode] = useState(searchTerm ? 'compact' : 'grid');

  // Fetch initial products
  const fetchProducts = useCallback(async (initial = false) => {
    if (loading || (!hasMore && !initial)) return;
    
    try {
      setLoading(true);
      const productsRef = collection(db, 'products');
      
      let q;
      if (initial) {
        q = query(productsRef, orderBy('name'), limit(PRODUCTS_PER_PAGE));
      } else {
        if (!lastDoc) return;
        q = query(productsRef, orderBy('name'), startAfter(lastDoc), limit(PRODUCTS_PER_PAGE));
      }

      const snapshot = await getDocs(q);
      const fetchedProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProducts(prev => initial ? fetchedProducts : [...prev, ...fetchedProducts]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PRODUCTS_PER_PAGE);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  }, [loading, lastDoc, hasMore]);

  // Initialize intersection observer for infinite scroll
  const lastProductRef = useCallback(node => {
    if (loading) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchProducts(false);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchProducts]);

  // Fetch products by category
  const fetchProductsByCategory = useCallback(async (category, initial = false) => {
    if (loading || (!hasMore && !initial)) return;
    
    try {
      setLoading(true);
      const productsRef = collection(db, 'products');
      
      let q;
      if (initial) {
        q = query(
          productsRef, 
          where('category', '==', category),
          orderBy('name'),
          limit(PRODUCTS_PER_PAGE)
        );
      } else {
        if (!lastDoc) return;
        q = query(
          productsRef,
          where('category', '==', category),
          orderBy('name'),
          startAfter(lastDoc),
          limit(PRODUCTS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(q);
      const fetchedProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProducts(prev => initial ? fetchedProducts : [...prev, ...fetchedProducts]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PRODUCTS_PER_PAGE);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products by category:', error);
      setLoading(false);
    }
  }, [loading, lastDoc, hasMore]);

  // Effect to fetch initial products
  useEffect(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  // Reset pagination when category changes
  useEffect(() => {
    if (filters.category) {
      setLastDoc(null);
      setHasMore(true);
      fetchProductsByCategory(filters.category, true);
    } else {
      setLastDoc(null);
      setHasMore(true);
      fetchProducts(true);
    }
  }, [filters.category, fetchProducts, fetchProductsByCategory]);

  // Render products with intersection observer
  const renderProducts = (products) => {
    return products.map((product, index) => {
      if (products.length === index + 1) {
        return (
          <div
            ref={lastProductRef}
            key={product.id}
            className="product-wrapper"
          >
            <ProductCard
              product={product}
              onProductClick={handleProductClick}
              onQuickAdd={handleQuickAddToCart}
              onWishlist={handleAddToWishlist}
              onCompare={handleAddToCompare}
              isInWishlist={wishlist.find(item => item.id === product.id)}
              isInCompare={compareList.find(item => item.id === product.id)}
              onAuthRequired={handleAuthRequired}
              compact={true}
            />
          </div>
        );
      }
      return (
        <div key={product.id} className="product-wrapper">
          <ProductCard
            product={product}
            onProductClick={handleProductClick}
            onQuickAdd={handleQuickAddToCart}
            onWishlist={handleAddToWishlist}
            onCompare={handleAddToCompare}
            isInWishlist={wishlist.find(item => item.id === product.id)}
            isInCompare={compareList.find(item => item.id === product.id)}
            onAuthRequired={handleAuthRequired}
            compact={true}
          />
        </div>
      );
    });
  };

  // Real-time allProducts
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProducts(items);
    });
    return () => unsubscribe();
  }, []);

  // Remove fetchAllProducts and fetchPanels, and use allProducts for panels and sections.

  // Premium: Load user data
  useEffect(() => {
    const loadUserData = () => {
      const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const wishlistData = JSON.parse(localStorage.getItem('wishlist') || '[]');
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
      const compareData = JSON.parse(localStorage.getItem('compareList') || '[]');
      
      setRecentlyViewed(viewed);
      setWishlist(wishlistData);
      setCart(cartData);
      setCompareList(compareData);
    };

    fetchProducts(true);
    
    // Check if user is admin (simple localStorage check)
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
  }, [fetchProducts]);

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
    setAuthTab('login');
    setShowAuthModal(true);
  };

  const { user } = useAuth();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [reviewingOrder, setReviewingOrder] = useState(null);

  const handleOpenReviews = async () => {
    if (!user) {
      alert('Please sign in to view your reviews.');
      return;
    }
    // Fetch all orders for this user
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );
    const snap = await getDocs(q);
    setUserOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setShowReviewModal(true);
  };

  // Review submission handler
  const handleSubmitReview = async (order, review) => {
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
  };

  useEffect(() => {
    const openReviewsListener = () => handleOpenReviews();
    window.addEventListener('open-reviews-modal', openReviewsListener);
    return () => window.removeEventListener('open-reviews-modal', openReviewsListener);
  }, [user]);

  // Get filtered and sorted products
  const displayProducts = applyFiltersAndSort(products);
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

  return (
    <div className="home-page">
      <Header 
        searchTerm={inputValue}
        setSearchTerm={setInputValue}
        products={allProducts}
        onSearch={(term, filteredProducts) => {
          handleSearch(term, filteredProducts);
        }}
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
          {categories.map((cat, i) => {
            const catProducts = allProducts.filter(p => p.category === cat);
            return catProducts.length > 0 ? (
              <CategoryPanel
                key={cat}
                title={cat}
                products={catProducts}
                onProductClick={handleProductClick}
                onAuthRequired={handleAuthRequired}
                compact={true}
              />
            ) : null;
          })}
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

      {/* Premium: Filters and Sorting Bar */}
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
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Books">Books</option>
                  <option value="Home">Home & Garden</option>
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
                <img src={quickViewProduct.image} alt={quickViewProduct.name} />
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

      {/* ReviewModal is now global, not rendered here */}
      <BottomNav />
    </div>
  );
};

export default Home;