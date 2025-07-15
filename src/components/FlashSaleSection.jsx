import React, { useState, useEffect } from 'react';
import { FaFire, FaClock } from 'react-icons/fa';
import ProductCard from './ProductGrid/ProductCard';
import './FlashSaleSection.css';

const FlashSaleSection = ({ products = [], onProductClick, isAdmin = false, onEdit, onAuthRequired }) => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59
  });

  const [isActive, setIsActive] = useState(true);

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

  // Filter flash sale products (you can add a flashSale property to products)
  const flashSaleProducts = products.filter(product => product.flashSale) || [];

  if (flashSaleProducts.length === 0 && !isAdmin) return null;

  return (
    <section className="flash-sale-section">
      <div className="flash-sale-header">
        <div className="flash-sale-title-section">
          <div className="flash-sale-icon">
            <FaFire className="fire-icon" />
          </div>
          <div className="flash-sale-info">
            <h2 className="flash-sale-title">🔥 FLASH SALE</h2>
            <p className="flash-sale-subtitle">Limited Time Deals - Don't Miss Out!</p>
          </div>
        </div>

        {isActive && (
          <div className="countdown-timer">
            <div className="countdown-label">
              <FaClock className="clock-icon" />
              <span>Ends In:</span>
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

        {isAdmin && (
          <button className="edit-section-btn" onClick={() => onEdit('flashSale')}>
            ✏️ Edit Flash Sale
          </button>
        )}
      </div>

      <div className="flash-sale-products product-bar-grid">
        {flashSaleProducts.length > 0 ? (
          flashSaleProducts.map((product, index) => (
            <div key={product.id} className="flash-sale-product">
              <ProductCard 
                product={product} 
                onProductClick={onProductClick}
                compact={true}
                onAuthRequired={onAuthRequired}
              />
            </div>
          ))
        ) : (
          <div className="no-flash-sale">
            <FaFire className="no-sale-icon" />
            <p>No flash sale products available</p>
            {isAdmin && (
              <button className="add-flash-sale-btn">
                + Add Flash Sale Products
              </button>
            )}
          </div>
        )}
      </div>

      {flashSaleProducts.length > 4 && (
        <div className="flash-sale-footer">
          <button className="view-all-flash-sale-btn">
            View All Flash Sale Products
          </button>
        </div>
      )}
    </section>
  );
};

export default FlashSaleSection; 