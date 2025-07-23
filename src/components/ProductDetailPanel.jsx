import React, { useState } from 'react';
import { X, Star, Heart, ShoppingCart, TrendingUp } from 'lucide-react';
import './ProductDetailPanel.css';

const ProductDetailPanel = ({ 
  product, 
  onClose, 
  onAddToCart, 
  onAddToWishlist,
  isInWishlist,
  isMobile = window.innerWidth <= 768 
}) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const handleAddToCart = () => {
    onAddToCart && onAddToCart(product, quantity);
  };

  const handleBuyNow = () => {
    onAddToCart && onAddToCart(product, quantity);
    // Navigate to checkout
    window.location.href = '/checkout';
  };

  if (isMobile) {
    return (
      <div className="product-detail-panel-mobile">
        <div className="product-detail-header">
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
          <button 
            onClick={() => onAddToWishlist && onAddToWishlist(product)}
            className={`wishlist-btn ${isInWishlist ? 'active' : ''}`}
          >
            <Heart size={24} fill={isInWishlist ? "#ef4444" : "none"} />
          </button>
        </div>

        <div className="product-detail-content">
          <img 
            src={product.image || '/placeholder-product.jpg'} 
            alt={product.name}
            className="product-detail-image"
          />

          <div className="product-detail-info">
            <h1>{product.name}</h1>
            
            <div className="rating-container">
              <div className="stars">
                {Array(5).fill().map((_, i) => (
                  <Star 
                    key={i} 
                    size={16} 
                    fill={i < (product.rating || 0) ? "#FFD700" : "none"}
                  />
                ))}
              </div>
              <span className="rating-count">
                ({product.ratingCount || 0} ratings)
              </span>
            </div>

            <div className="product-detail-price">
              ${product.price}
              {product.originalPrice && (
                <span className="original-price">
                  ${product.originalPrice}
                </span>
              )}
            </div>

            <div className="product-description">
              {product.description}
            </div>

            {product.features && (
              <div className="product-features">
                <h3>Features & Details</h3>
                <ul>
                  {product.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="product-detail-actions">
          <button 
            className="add-to-cart-btn-detail"
            onClick={handleAddToCart}
          >
            Add to Cart
          </button>
          <button 
            className="buy-now-btn"
            onClick={handleBuyNow}
          >
            Buy Now
          </button>
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="product-detail-panel">
      <div className="panel-header">
        <h2>{product.name}</h2>
        <button onClick={onClose} className="close-btn">
          <X size={24} />
        </button>
      </div>
      
      {/* Rest of the existing desktop layout */}
    </div>
  );
};

export default ProductDetailPanel; 