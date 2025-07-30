import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Cart.css';

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice, getTotalItems } = useCart();
  const cartItemsArray = Object.values(cartItems);

  if (cartItemsArray.length === 0) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add some products to get started!</p>
          <Link to="/" className="checkout-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Your Cart ({getTotalItems()} items)</h1>
      </div>
      
      <div className="cart-content">
        {/* Cart Items */}
        <div className="cart-items">
          {cartItemsArray.map((item) => (
            <div key={item.id} className="cart-item">
              <img
                src={item.imageUrl || 'https://via.placeholder.com/100'}
                alt={item.name}
              />
              
              <div className="cart-item-info">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-price">Rs. {item.price}</div>
                
                <div className="quantity-controls">
                  <button
                    className="quantity-btn"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span className="quantity-display">{item.quantity}</span>
                  <button
                    className="quantity-btn"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="cart-item-total">
                <div>Rs. {(item.price * item.quantity).toLocaleString()}</div>
                <button
                  className="remove-btn"
                  onClick={() => removeFromCart(item.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Order Summary */}
        <div className="cart-summary">
          <div className="summary-header">
            <h2>Order Summary</h2>
          </div>
          <div className="summary-content">
            <div className="summary-row">
              <span>Subtotal ({getTotalItems()} items)</span>
              <span>Rs. {getTotalPrice().toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span style={{ color: '#059669' }}>Free</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>Rs. {getTotalPrice().toLocaleString()}</span>
            </div>
            
            <Link to="/checkout" className="checkout-btn" style={{ textDecoration: 'none' }}>
              Proceed to Checkout
            </Link>
            
            <Link to="/" className="continue-shopping-btn" style={{ textDecoration: 'none' }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;