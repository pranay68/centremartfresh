import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Heart, ShoppingCart, Bell, User, Home, MessageCircle } from 'lucide-react';
import './HomeMobile.css';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const PRODUCTS_PER_PAGE = 10;
const BUFFER_SIZE = 30; // Maximum products to keep in memory
const SCROLL_THRESHOLD = 0.8; // Load more when 80% scrolled

const HomeMobile = () => {
  // Product management states
  const [products, setProducts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [productPositions, setProductPositions] = useState({}); // Track scroll positions
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: BUFFER_SIZE });
  
  // Refs
  const scrollRef = useRef(null);
  const loadingRef = useRef(false);
  const productCache = useRef({}); // Cache for removed products
  
  // Fetch products with pagination
  const fetchProducts = useCallback(async (startAfterDoc = null) => {
    if (loading || !hasMore) return;
    
    try {
      setLoading(true);
      loadingRef.current = true;
      
      const productsRef = collection(db, 'products');
      let q;
      
      if (startAfterDoc) {
        q = query(productsRef, orderBy('name'), startAfter(startAfterDoc), limit(PRODUCTS_PER_PAGE));
      } else {
        q = query(productsRef, orderBy('name'), limit(PRODUCTS_PER_PAGE));
      }
      
      const snapshot = await getDocs(q);
      const newProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProducts(prev => {
        const combined = [...prev, ...newProducts];
        // Update product positions
        const positions = {...productPositions};
        newProducts.forEach((p, idx) => {
          positions[p.id] = prev.length + idx;
        });
        setProductPositions(positions);
        return combined;
      });
      
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PRODUCTS_PER_PAGE);
      
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [loading, hasMore, productPositions]);

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
      setProducts(prev => {
        const restored = [...productsToRestore, ...prev];
        // Clean up cache
        const newCache = {...productCache.current};
        productsToRestore.forEach(p => {
          delete newCache[p.id];
        });
        productCache.current = newCache;
        return restored;
      });
    }
  }, [productPositions]);

  // Initialize scroll event listener
  useEffect(() => {
    const currentRef = scrollRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
      return () => currentRef.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, []);

  // Get visible products
  const visibleProducts = products.slice(visibleRange.start, visibleRange.end);

  return (
    <div className="mobile-view">
      <div className="mobile-container" ref={scrollRef}>
        {/* Header and other static content */}
        <header className="mobile-header">
          {/* ... header content ... */}
        </header>

        {/* Product grid */}
        <div className="mobile-product-grid">
          {visibleProducts.map((product, index) => (
            <div 
              key={product.id}
              className="mobile-product-card"
              style={{
                transform: `translateY(${productPositions[product.id] * 100}%)`
              }}
            >
              {/* Product card content */}
              <img 
                src={product.image} 
                alt={product.name}
                loading="lazy"
                className="mobile-product-image"
              />
              <div className="mobile-product-info">
                <h3>{product.name}</h3>
                <p>${product.price}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Loading indicator */}
        {hasMore && (
          <div className="loading-trigger">
            {loading && <div className="loading-spinner" />}
          </div>
        )}

        {/* Bottom Navigation */}
        <nav className="mobile-nav">
          {/* ... navigation content ... */}
        </nav>
      </div>
    </div>
  );
};

export default HomeMobile; 