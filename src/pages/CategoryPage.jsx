<<<<<<< HEAD
import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import ProductCard from "../components/ProductGrid/ProductCard";
=======
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, getDocs, query, limit, startAfter } from "firebase/firestore";
import { db } from "../firebase/config";
import ProductCard from "../components/ProductCard";
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
import ProductDetailPanel from "../components/ProductDetailPanel";
import Header from "../components/Header";
import "./CategoryPage.css";

const CategoryPage = () => {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
=======
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d

  const decodedCategory = decodeURIComponent(category);

  useEffect(() => {
<<<<<<< HEAD
    const productsRef = collection(db, "products");
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const allProducts = [];
      snapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        if (product.category && product.category.toLowerCase().includes(decodedCategory.toLowerCase())) {
          allProducts.push(product);
        }
      });
      setProducts(allProducts);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      console.error("Error fetching products:", error);
    });
    return () => unsubscribe();
  }, [decodedCategory]);
=======
    fetchProducts(true);
    // eslint-disable-next-line
  }, [decodedCategory]);

  const fetchProducts = async (initial = false) => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      let q;
      const productsRef = collection(db, "products");
      if (initial) {
        q = query(productsRef, limit(15));
      } else if (lastDoc) {
        q = query(productsRef, startAfter(lastDoc), limit(10));
      } else {
        setLoading(false);
        return;
      }
      const snapshot = await getDocs(q);
      const newProducts = [];
      let lastVisible = null;
      snapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        if (product.category && product.category.toLowerCase().includes(decodedCategory.toLowerCase())) {
          newProducts.push(product);
          lastVisible = doc;
        }
      });
      if (initial) {
        setProducts(newProducts);
      } else {
        setProducts((prev) => [...prev, ...newProducts]);
      }
      setLastDoc(lastVisible);
      setHasMore(newProducts.length >= (initial ? 15 : 10));
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d

  const getCategoryIcon = (category) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('mobile') || categoryLower.includes('phone')) return '📱';
    if (categoryLower.includes('laptop') || categoryLower.includes('computer')) return '💻';
    if (categoryLower.includes('shoe') || categoryLower.includes('footwear')) return '👟';
    if (categoryLower.includes('clothing') || categoryLower.includes('fashion')) return '👕';
    if (categoryLower.includes('electronics') || categoryLower.includes('gadget')) return '⚡';
    if (categoryLower.includes('book') || categoryLower.includes('study')) return '📚';
    if (categoryLower.includes('sport') || categoryLower.includes('fitness')) return '🏃';
    if (categoryLower.includes('home') || categoryLower.includes('kitchen')) return '🏠';
    if (categoryLower.includes('beauty') || categoryLower.includes('cosmetic')) return '💄';
    if (categoryLower.includes('toy') || categoryLower.includes('game')) return '🎮';
    return '🛍️';
  };

<<<<<<< HEAD
  const PRODUCTS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return products.slice(start, start + PRODUCTS_PER_PAGE);
  }, [products, currentPage]);

  if (loading) {
=======
  // Infinite scroll handler
  useEffect(() => {
    if (!hasMore || loading) return;
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        fetchProducts(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, );

  if (loading && products.length === 0) {
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Header />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p>Loading {decodedCategory} products...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Header />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ fontSize: '3rem', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}>
              {getCategoryIcon(decodedCategory)}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700, background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {decodedCategory}
              </h1>
              <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                {products.length} products found
              </p>
            </div>
          </div>
<<<<<<< HEAD
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link 
              to="/" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '12px 20px', 
                background: 'var(--bg-primary)', 
                color: 'var(--text-primary)', 
                textDecoration: 'none', 
                borderRadius: '8px', 
                fontWeight: 500,
                border: '2px solid var(--border-color)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--primary-color)';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--bg-primary)';
                e.target.style.color = 'var(--text-primary)';
              }}
            >
              ← Go Back
            </Link>
            <Link 
              to="/" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '12px 20px', 
                background: 'var(--primary-color)', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '8px', 
                fontWeight: 500,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--secondary-color)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--primary-color)';
              }}
            >
              🏠 Home
            </Link>
          </div>
=======
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'var(--primary-color)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 500 }}>
            ← Back to Home
          </Link>
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
        </div>

        {products.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center', gap: '20px' }}>
            <div style={{ fontSize: '4rem', opacity: 0.7 }}>😔</div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>No products found</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>
              Try adjusting your filters or check back later for new {decodedCategory} products.
            </p>
            <Link to="/" style={{ padding: '12px 24px', background: 'var(--primary-color)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 500 }}>
              Browse All Products
            </Link>
          </div>
        ) : (
<<<<<<< HEAD
          <div className="products-grid">
            {paginatedProducts.map((product) => (
=======
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {products.map((product) => (
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
              <div key={product.id} style={{ transition: 'transform 0.3s ease' }}>
                <ProductCard 
                  product={product} 
                  onProductClick={() => setSelectedProduct(product)}
<<<<<<< HEAD
                  compact={true}
=======
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
                />
              </div>
            ))}
          </div>
        )}
<<<<<<< HEAD
        {totalPages > 1 && (
          <div className="pagination-bar" style={{ marginTop: 24, textAlign: 'center' }}>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`pagination-btn${currentPage === i + 1 ? ' active' : ''}`}
                style={{ margin: '0 4px', padding: '8px 16px', borderRadius: 6, border: '1px solid #e5e7eb', background: currentPage === i + 1 ? '#667eea' : '#fff', color: currentPage === i + 1 ? '#fff' : '#232f3e', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
=======
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
      </div>

      {selectedProduct && (
        <ProductDetailPanel
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

<<<<<<< HEAD
export default CategoryPage; 
=======
export default CategoryPage;
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
