import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import publicProducts from '../utils/publicProducts';
import ProductCard from '../components/ProductGrid/ProductCard';
import { sortByStock } from '../utils/sortProducts';
import ProductDetailPanel from "../components/ProductDetailPanel";
import Header from "../components/Header";
import "./CategoryPage.css";

const CategoryPage = () => {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const decodedCategory = decodeURIComponent(category || '');
  const normalizedCategory = decodedCategory.trim().toLowerCase();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        await publicProducts.ensureLoaded();
        // Use the optimized category getter when available
        const catProducts = publicProducts.getByCategory(normalizedCategory);
        if (isMounted) setProducts(catProducts || []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Category load error:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [normalizedCategory]);

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

  const displayProducts = useMemo(() => {
    if (!searchTerm) return sortByStock(products);
    const term = searchTerm.toLowerCase();
    return sortByStock(products.filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term) ||
      String(p.id || '').toLowerCase().includes(term)
    ));
  }, [products, searchTerm]);

  if (loading) {
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
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'var(--primary-color)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 500 }}>
            ← Back to Home
          </Link>
        </div>

        {/* Category Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder={`Search in ${decodedCategory}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
          />
        </div>

        {displayProducts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center', gap: '20px' }}>
            <div style={{ fontSize: '4rem', opacity: 0.7 }}>😔</div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>No products found</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>
              Try adjusting your search terms or check back later for new {decodedCategory} products.
            </p>
            <Link to="/" style={{ padding: '12px 24px', background: 'var(--primary-color)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 500 }}>
              Browse All Products
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {displayProducts.map((product) => (
              <div key={product.id} style={{ transition: 'transform 0.3s ease' }}>
                <ProductCard 
                  product={product} 
                  onProductClick={() => setSelectedProduct(product)}
                  compact={true}
                />
              </div>
            ))}
          </div>
        )}
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

export default CategoryPage; 