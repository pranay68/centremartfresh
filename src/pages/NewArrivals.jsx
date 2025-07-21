import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import ProductCard from '../components/ProductGrid/ProductCard';
import { FaLeaf, FaNewspaper } from 'react-icons/fa';
import './NewArrivals.css';

const NewArrivals = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for new arrival products
    const q = query(
      collection(db, 'products'),
      where('newArrival', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching new arrivals:', error);
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
      <div className="new-arrivals-page">
        <div className="page-header">
          <h1>🌱 New Arrivals</h1>
          <p>Fresh Products Just In - Be the First to Shop!</p>
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
    <div className="new-arrivals-page">
      <div className="page-header">
        <h1>🌱 New Arrivals</h1>
        <p>Fresh Products Just In - Be the First to Shop!</p>
        <div className="results-count">
          {products.length} new product{products.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {products.length === 0 ? (
        <div className="no-new-arrivals">
          <div className="no-arrivals-content">
            <span className="no-arrivals-icon">🌱</span>
            <h3>No New Arrivals Yet</h3>
            <p>Check back soon for fresh products!</p>
          </div>
        </div>
      ) : (
        <div className="product-grid">
          {products.map(product => (
            <div key={product.id} className="new-arrivals-product">
              <div className="new-badge">
                <span>NEW</span>
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

export default NewArrivals; 