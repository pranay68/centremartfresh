import React from 'react';
import './ProductCard.css'; // optional if shared styles used
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext'; // ✅ Import the custom hook

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice } = useCart(); // ✅ use custom hook
  const navigate = useNavigate();

  const handleQuantityChange = (id, amount) => {
    const newQty = cartItems[id].quantity + amount;
    if (newQty <= 0) {
      removeFromCart(id);
    } else {
      updateQuantity(id, newQty);
    }
  };

  return (
    <div className="cart-page">
      <h2>Your Cart</h2>

      {Object.keys(cartItems).length === 0 ? (
        <p>Your cart is empty 😢</p>
      ) : (
        <div className="cart-items">
          {Object.values(cartItems).map((item) => (
            <div key={item.id} className="cart-item">
              <img src={item.imageUrl} alt={item.name} className="cart-img" />
              <div className="cart-details">
                <h3>{item.name}</h3>
                <p>Price: Rs {item.price}</p>
                <div className="quantity-controls">
                  <button onClick={() => handleQuantityChange(item.id, -1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => handleQuantityChange(item.id, 1)}>+</button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="remove-btn">
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div className="cart-summary">
            <h3>Total: Rs {getTotalPrice()}</h3>
            <button className="checkout-btn" onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
