import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import ProductCard from '../components/ProductGrid/ProductCard';
import './TopSellers.css';

const TopSellers = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for top selling products
    const q = query(
      collection(db, 'products'),
      where('topSale', '==', true),
      orderBy('soldCount', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching top sellers:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleProductClick = (product) => {
    // Navigate to product detail
    window.location.href = `/product/${product.id}`;
  };

  if (loading) {
    return (
      <div className="top-sellers-page">
        <div className="page-header">
          <h1>🔥 Top Sellers</h1>
          <p>Most Popular Products This Week</p>
        </div>
        <div className="loading-grid">
          {Array(12).fill(null).map((_, i) => (
            <ProductCard key={i} loading={true} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="top-sellers-page">
      <div className="page-header">
        <h1>🔥 Top Sellers</h1>
        <p>Most Popular Products This Week</p>
        <div className="results-count">
          {products.length} top product{products.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {products.length === 0 ? (
        <div className="no-top-sellers">
          <div className="no-sellers-content">
            <span className="no-sellers-icon">🔥</span>
            <h3>No Top Sellers Yet</h3>
            <p>Check back soon for trending products!</p>
          </div>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product, index) => (
            <div key={product.id} className="top-sellers-product">
              <div className="rank-badge">
                <span className="rank-number">#{index + 1}</span>
                <span className="rank-icon">🔥</span>
              </div>
              <ProductCard 
                product={product} 
                onProductClick={handleProductClick}
                compact={true}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopSellers; 