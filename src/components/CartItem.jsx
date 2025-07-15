import React, { useState } from 'react';
import { 
  Trash2, 
  Heart, 
  Save, 
  Truck, 
  Shield, 
  AlertCircle,
  Minus,
  Plus,
  Star
} from 'lucide-react';
import './CartItem.css';

const CartItem = ({ 
  item, 
  onUpdateQuantity, 
  onRemove, 
  onMoveToWishlist, 
  onSaveForLater,
  onSelectForComparison
}) => {
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [isSaving, setIsSaving] = useState(false);

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;
    setQuantity(newQuantity);
    if (onUpdateQuantity) {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(item.id);
    }
  };

  const handleMoveToWishlist = () => {
    if (onMoveToWishlist) {
      onMoveToWishlist(item);
    }
  };

  const handleSaveForLater = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      if (onSaveForLater) {
        onSaveForLater(item);
      }
    }, 500);
  };

  const handleSelectForComparison = () => {
    if (onSelectForComparison) {
      onSelectForComparison(item);
    }
  };

  const calculateSubtotal = () => {
    const price = item.originalPrice && item.originalPrice > item.price 
      ? item.originalPrice 
      : item.price;
    return price * quantity;
  };

  const calculateDiscount = () => {
    if (!item.originalPrice || item.originalPrice <= item.price) return 0;
    return (item.originalPrice - item.price) * quantity;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const isLowStock = item.stock && item.stock <= 5 && item.stock > 0;
  const isOutOfStock = item.stock === 0;
  const hasFreeShipping = item.freeShipping || item.price > 1000;
  const isPrime = item.prime || item.fastDelivery;
  const isOnSale = item.originalPrice && item.originalPrice > item.price;

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={12}
        className={index < rating ? 'star-filled' : 'star-empty'}
      />
    ));
  };

  return (
    <div className={`cart-item ${isOutOfStock ? 'out-of-stock' : ''}`}>
      <div className="cart-item-image">
        <img 
          src={item.imageUrl || item.image} 
          alt={item.name}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/80x80?text=Product';
          }}
        />
        
        {isOnSale && (
          <div className="sale-badge">
            SALE
          </div>
        )}
        
        {isPrime && (
          <div className="prime-badge">
            <Shield size={10} />
            Prime
          </div>
        )}
      </div>

      <div className="cart-item-details">
        <div className="item-header">
          <h4 className="item-title">{item.name}</h4>
          
          {item.rating && (
            <div className="item-rating">
              {renderStars(item.rating)}
              <span className="rating-text">{item.rating}</span>
              {item.reviewCount && (
                <span className="review-count">({item.reviewCount})</span>
              )}
            </div>
          )}
        </div>

        <div className="item-specs">
          {item.color && (
            <span className="item-spec">
              Color: <strong>{item.color}</strong>
            </span>
          )}
          {item.size && (
            <span className="item-spec">
              Size: <strong>{item.size}</strong>
            </span>
          )}
          {item.brand && (
            <span className="item-spec">
              Brand: <strong>{item.brand}</strong>
            </span>
          )}
        </div>

        {item.features && item.features.length > 0 && (
          <div className="item-features">
            {item.features.slice(0, 2).map((feature, index) => (
              <span key={index} className="feature-tag">
                {feature}
              </span>
            ))}
          </div>
        )}

        <div className="item-delivery">
          {hasFreeShipping && (
            <div className="free-shipping">
              <Truck size={12} />
              <span>Free delivery</span>
            </div>
          )}
          
          {isPrime && (
            <div className="prime-delivery">
              <Shield size={12} />
              <span>Fast delivery</span>
            </div>
          )}
          
          {isLowStock && !isOutOfStock && (
            <div className="low-stock-warning">
              <AlertCircle size={12} />
              <span>Only {item.stock} left</span>
            </div>
          )}
          
          {isOutOfStock && (
            <div className="out-of-stock-warning">
              <AlertCircle size={12} />
              <span>Out of stock</span>
            </div>
          )}
        </div>
      </div>

      <div className="cart-item-price">
        <div className="price-container">
          {isOnSale ? (
            <>
              <span className="current-price">Rs {item.price}</span>
              <span className="original-price">Rs {item.originalPrice}</span>
              <span className="discount-badge">
                Save Rs {item.originalPrice - item.price}
              </span>
            </>
          ) : (
            <span className="current-price">Rs {item.price}</span>
          )}
        </div>
      </div>

      <div className="cart-item-quantity">
        <div className="quantity-controls">
          <button 
            className="quantity-btn"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1 || isOutOfStock}
          >
            <Minus size={14} />
          </button>
          
          <span className="quantity-display">{quantity}</span>
          
          <button 
            className="quantity-btn"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={isOutOfStock || (item.stock && quantity >= item.stock)}
          >
            <Plus size={14} />
          </button>
        </div>
        
        {item.stock && (
          <div className="stock-info">
            {isOutOfStock ? (
              <span className="out-of-stock">Out of stock</span>
            ) : (
              <span className="in-stock">
                {item.stock} available
              </span>
            )}
          </div>
        )}
      </div>

      <div className="cart-item-total">
        <div className="total-breakdown">
          <div className="subtotal">
            <span>Subtotal:</span>
            <span>Rs {calculateSubtotal()}</span>
          </div>
          
          {isOnSale && (
            <div className="discount">
              <span>Discount:</span>
              <span>-Rs {calculateDiscount()}</span>
            </div>
          )}
          
          <div className="total">
            <span>Total:</span>
            <span>Rs {calculateTotal()}</span>
          </div>
        </div>
      </div>

      <div className="cart-item-actions">
        <button 
          className="action-btn remove-btn"
          onClick={handleRemove}
          title="Remove from cart"
        >
          <Trash2 size={16} />
          Remove
        </button>
        
        <button 
          className="action-btn wishlist-btn"
          onClick={handleMoveToWishlist}
          title="Move to wishlist"
        >
          <Heart size={16} />
          Wishlist
        </button>
        
        <button 
          className={`action-btn save-btn ${isSaving ? 'saving' : ''}`}
          onClick={handleSaveForLater}
          title="Save for later"
          disabled={isSaving}
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        
        <button 
          className="action-btn compare-btn"
          onClick={handleSelectForComparison}
          title="Add to comparison"
        >
          <Shield size={16} />
          Compare
        </button>
      </div>
    </div>
  );
};

export default CartItem; 