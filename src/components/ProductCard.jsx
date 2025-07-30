import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { FaShoppingCart, FaMapMarkerAlt, FaPalette } from 'react-icons/fa';
import './ProductCard.css';

const ProductCard = ({ product, loading = false, onProductClick }) => {
  const { addToCart } = useCart();
  const [showLocation, setShowLocation] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');

  const themes = {
    default: { bg: '#667eea', text: 'white' },
    dark: { bg: '#1e293b', text: 'white' },
    green: { bg: '#059669', text: 'white' },
    purple: { bg: '#7c3aed', text: 'white' },
    orange: { bg: '#ea580c', text: 'white' }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (product) {
      addToCart(product);
    }
  };

  const handleBuyNow = (e) => {
    e.stopPropagation();
    if (product && onProductClick) {
      onProductClick(product);
    }
  };

  const handleThemeChange = (e) => {
    e.stopPropagation();
    const themeKeys = Object.keys(themes);
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setCurrentTheme(themeKeys[nextIndex]);
  };

  const handleProductClick = () => {
    if (product && onProductClick) {
      onProductClick(product);
    }
  };

  if (loading) {
    return (
      <div className="product-card loading">
        <div className="product-image-skeleton"></div>
        <div className="product-content">
          <div className="product-title-skeleton"></div>
          <div className="product-price-skeleton"></div>
          <div className="product-actions-skeleton"></div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const theme = themes[currentTheme];

  return (
    <div className="product-card" style={{ '--theme-bg': theme.bg, '--theme-text': theme.text }} onClick={handleProductClick}>
      <div className="product-image-container">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="product-image"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x200?text=Product+Image';
          }}
        />
        <div className="product-overlay">
          <button 
            className="theme-toggle-btn"
            onClick={handleThemeChange}
            title="Change theme"
          >
            <FaPalette />
          </button>
          <button 
            className="location-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowLocation(!showLocation);
            }}
            title="Show location"
          >
            <FaMapMarkerAlt />
          </button>
        </div>
      </div>

      <div className="product-content">
        <h3 className="product-title">{product.name}</h3>

        {showLocation && product.location && (
          <div className="product-location">
            <FaMapMarkerAlt className="location-icon" />
            <span>{product.location}</span>
          </div>
        )}

        <div className="product-price">Rs {product.price}</div>

        <div className="product-actions">
          <button 
            className="btn btn-primary add-to-cart-btn"
            onClick={handleAddToCart}
          >
            <FaShoppingCart />
            Add to Cart
          </button>
          <button 
            className="btn btn-secondary buy-now-btn"
            onClick={handleBuyNow}
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;