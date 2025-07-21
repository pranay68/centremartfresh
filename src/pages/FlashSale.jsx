import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import ProductCard from '../components/ProductGrid/ProductCard';
import { FaFire, FaClock } from 'react-icons/fa';
import './FlashSale.css';

const FlashSale = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59
  });
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    // Real-time listener for flash sale products
    const q = query(
      collection(db, 'products'),
      where('flashSale', '==', true),
      orderBy('discount', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching flash sale products:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime.seconds > 0) {
          return { ...prevTime, seconds: prevTime.seconds - 1 };
        } else if (prevTime.minutes > 0) {
          return { ...prevTime, minutes: prevTime.minutes - 1, seconds: 59 };
        } else if (prevTime.hours > 0) {
          return { hours: prevTime.hours - 1, minutes: 59, seconds: 59 };
        } else {
          setIsActive(false);
          return { hours: 0, minutes: 0, seconds: 0 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (time) => time.toString().padStart(2, '0');

  const handleProductClick = (product) => {
    // Navigate to product detail
    window.location.href = `/product/${product.id}`;
  };

  if (loading) {
    return (
      <div className="flash-sale-page">
        <div className="page-header">
          <h1>🔥 Flash Sale</h1>
          <p>Limited Time Deals - Don't Miss Out!</p>
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
    <div className="flash-sale-page">
      <div className="page-header">
        <h1>🔥 Flash Sale</h1>
        <p>Limited Time Deals - Don't Miss Out!</p>
        
        {isActive && (
          <div className="countdown-timer">
            <div className="countdown-label">
              <FaClock className="clock-icon" />
              <span>Sale Ends In:</span>
            </div>
            <div className="countdown-display">
              <div className="countdown-item">
                <span className="countdown-number">{formatTime(timeLeft.hours)}</span>
                <span className="countdown-label">Hours</span>
              </div>
              <div className="countdown-separator">:</div>
              <div className="countdown-item">
                <span className="countdown-number">{formatTime(timeLeft.minutes)}</span>
                <span className="countdown-label">Minutes</span>
              </div>
              <div className="countdown-separator">:</div>
              <div className="countdown-item">
                <span className="countdown-number">{formatTime(timeLeft.seconds)}</span>
                <span className="countdown-label">Seconds</span>
              </div>
            </div>
          </div>
        )}

        <div className="results-count">
          {products.length} flash sale product{products.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {products.length === 0 ? (
        <div className="no-flash-sale">
          <div className="no-sale-content">
            <span className="no-sale-icon">🔥</span>
            <h3>No Flash Sale Products</h3>
            <p>Check back soon for amazing deals!</p>
          </div>
        </div>
      ) : (
        <div className="product-grid">
          {products.map(product => (
            <div key={product.id} className="flash-sale-product">
              <div className="flash-badge">
                <FaFire className="fire-icon" />
                <span>FLASH SALE</span>
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

export default FlashSale; 