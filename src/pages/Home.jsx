import React, { useEffect, useState, useRef, useCallback,  const fetchProducts = useCallback(async (initial = false) => {
    if (loading || (!hasMore && !initial)) return;
    
    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Check cache for initial load
    if (initial) {
      const cachedProducts = Array.from(productCache.values()).filter(
        item => Date.now() - item.timestamp < 5 * 60 * 1000 // 5 minutes cache
      ).map(item => item.data);
      
      if (cachedProducts.length > 0) {
        setProducts(cachedProducts);
        return;
      }
    }

    setLoading(true);
    try {
      const productsRef = collection(db, 'products');
      let q = initial || !lastDoc
        ? query(productsRef, orderBy('createdAt', 'desc'), limit(12))
        : query(productsRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(12));

      const snapshot = await getDocs(q);
      const newDocs = snapshot.docs;
      const newProducts = newDocs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Update cache and state
      if (initial) {
        newProducts.forEach(product => {
          productCache.set(product.id, {
            data: product,
            timestamp: Date.now()
          });
        });
        setProducts(newProducts);
      } else {
        setProducts(prev => {
          const combined = [...prev, ...newProducts];
          newProducts.forEach(product => {
            productCache.set(product.id, {
              data: product,
              timestamp: Date.now()
            });
          });
          return combined;
        });
      }

      setLastDoc(newDocs[newDocs.length - 1]);
      setHasMore(newDocs.length === 12);
      
      // Update total count on initial load
      if (initial) {
        const countSnapshot = await getCountFromServer(collection(db, 'products'));
        setTotalCount(countSnapshot.data().count);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching products:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, lastDoc, productCache]);react';
import { Virtuoso } from 'react-virtuoso';
import { debounce } from 'lodash';
import ProductCard from '../components/ProductCard';
import CategoryPanel from '../components/CategoryPanel';
import FlashSaleSection from '../components/FlashSaleSection';
import AdminPanelControl from '../components/AdminPanelControl';
import Header from '../components/Header';
import SearchAnalytics from '../components/SearchAnalytics';
import ProductDetailPanel from '../components/ProductDetailPanel';
import CustomerSupport from '../components/CustomerSupport';
import { db } from '../firebase/config';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter
} from 'firebase/firestore';
import './HomeNew.css';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [visibleProducts, setVisibleProducts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const abortControllerRef = useRef(null);
  const productCache = useMemo(() => new Map(), []);
  const [panels, setPanels] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const observer = useRef();

  const normalize = str =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '')
      .replace(/moblie|mobl|mobliee/g, 'mobile')
      .replace(/sho|sneekar|snkar/g, 'shoe')
      .replace(/laptap|labtop/g, 'laptop')
      .replace(/tv|teevee|tvee/g, 'television');

  const filterProducts = list => {
    if (!searchTerm) return list;
    const cleaned = normalize(searchTerm);
    return list.filter(product => {
      const name = normalize(product.name || '');
      const desc = normalize(product.description || '');
      const cat = normalize(product.category || '');
      return name.includes(cleaned) || desc.includes(cleaned) || cat.includes(cleaned);
    });
  };

  const fetchProducts = useCallback(async (initial = false) => {
    if (loading) return;
    setLoading(true);

    const productsRef = collection(db, 'products');
    const q = initial || !lastDoc
      ? query(productsRef, orderBy('name'), limit(12))
      : query(productsRef, orderBy('name'), startAfter(lastDoc), limit(12));

    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    setProducts(prev => (initial ? items : [...prev, ...items]));
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    setHasMore(snapshot.docs.length === 12);
    setLoading(false);
  }, [loading, lastDoc]);

  const fetchAllProducts = useCallback(async () => {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAllProducts(items);
  }, []);

  const fetchPanels = useCallback(async () => {
    // Get unique categories from products
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const allProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
    
    const panels = categories.map(category => {
      const categoryProducts = allProducts.filter(p => p.category === category);
      return {
        title: category,
        products: categoryProducts.slice(0, 6)
      };
    }).filter(panel => panel.products.length > 0);

    setPanels(panels);
  }, []);

  useEffect(() => {
    fetchProducts(true);
    fetchAllProducts();
    fetchPanels();
    
    // Check if user is admin (simple localStorage check)
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
  }, [fetchProducts, fetchAllProducts, fetchPanels]);

  const lastProductRef = useCallback(
    node => {
      if (loading || !hasMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          fetchProducts();
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, fetchProducts]
  );

  const handleSearch = useCallback((term, filteredProducts = null) => {
    setSearchTerm(term);
    if (filteredProducts) {
      setProducts(filteredProducts);
    }
  }, []);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseProductDetail = () => {
    setSelectedProduct(null);
  };

  return (
    <div className="home-page">
      <Header 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        products={allProducts}
        onSearch={handleSearch}
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
        />
      )}

      {/* Category Panels */}
      {panels.length > 0 && !searchTerm && (
        <>
          {panels.map((panel, i) => {
            const filtered = filterProducts(panel.products);
            return filtered.length > 0 ? (
              <CategoryPanel
                key={i}
                title={panel.title}
                products={filtered}
                onProductClick={handleProductClick}
              />
            ) : null;
          })}
        </>
      )}

      {/* Infinite Feed */}
      {(panels.length === 0 || searchTerm) && (
        <section className="product-section" id="products">
          <div className="products-header">
            <h2 className="products-title">
              {searchTerm ? `Search Results for "${searchTerm}"` : 'All Products'}
            </h2>
          </div>

          <div className="products-grid">
            {!products.length && !searchTerm &&
              Array(12).fill(null).map((_, i) => (
                <ProductCard key={i} loading={true} />
              ))}

            {products.length > 0 && filterProducts(products).length === 0 && searchTerm && (
              <div style={{ 
                gridColumn: '1/-1', 
                textAlign: 'center', 
                color: '#666',
                padding: '2rem',
                fontSize: '1.1rem'
              }}>
                No products found matching "{searchTerm}"
              </div>
            )}

            {filterProducts(products).map((product, i, arr) => {
              const isLast = i === arr.length - 1 && !searchTerm;
              return (
                <div
                  key={product.id}
                  ref={isLast ? lastProductRef : null}
                >
                  <ProductCard 
                    product={product} 
                    onProductClick={handleProductClick}
                  />
                </div>
              );
            })}

            {loading && !searchTerm &&
              Array(4).fill(null).map((_, i) => (
                <ProductCard key={`loading-${i}`} loading={true} />
              ))}
          </div>

          {/* Search Analytics */}
          {searchTerm && (
            <SearchAnalytics 
              searchTerm={searchTerm}
              searchResults={filterProducts(products)}
            />
          )}
        </section>
      )}

      {/* Product Detail Panel */}
      {selectedProduct && (
        <ProductDetailPanel
          product={selectedProduct}
          onClose={handleCloseProductDetail}
        />
      )}

      {/* Customer Support Widget */}
      <CustomerSupport />
    </div>
  );
};

export default Home;
