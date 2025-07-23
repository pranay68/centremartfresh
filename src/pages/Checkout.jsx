import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, CreditCard, Truck, ChevronRight } from 'lucide-react';
import './Checkout.css';

const Checkout = () => {
  const { cart, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobile] = useState(window.innerWidth <= 768);
  
  const [deliveryAddress, setDeliveryAddress] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cart.length) {
      navigate('/cart');
    }
  }, [cart, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Process order here
      // For demo, just clear cart and redirect
      clearCart();
      navigate('/order-success');
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to process order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isMobile) {
    return (
      <div className="checkout-mobile">
        <div className="checkout-header">
          <button onClick={() => navigate(-1)} className="back-btn">
            <X size={24} />
          </button>
          <h1>Checkout</h1>
        </div>

        <div className="checkout-content">
          {/* Delivery Address */}
          <section className="checkout-section">
            <div className="section-header">
              <MapPin size={20} />
              <h2>Delivery Address</h2>
            </div>
            <form className="address-form">
              <input
                type="text"
                placeholder="Full Name"
                value={deliveryAddress.fullName}
                onChange={(e) => setDeliveryAddress({...deliveryAddress, fullName: e.target.value})}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={deliveryAddress.phone}
                onChange={(e) => setDeliveryAddress({...deliveryAddress, phone: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Address"
                value={deliveryAddress.address}
                onChange={(e) => setDeliveryAddress({...deliveryAddress, address: e.target.value})}
                required
              />
              <div className="form-row">
                <input
                  type="text"
                  placeholder="City"
                  value={deliveryAddress.city}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="State"
                  value={deliveryAddress.state}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, state: e.target.value})}
                  required
                />
              </div>
              <input
                type="text"
                placeholder="PIN Code"
                value={deliveryAddress.pincode}
                onChange={(e) => setDeliveryAddress({...deliveryAddress, pincode: e.target.value})}
                required
              />
            </form>
          </section>

          {/* Order Summary */}
          <section className="checkout-section">
            <div className="section-header">
              <Truck size={20} />
              <h2>Order Summary</h2>
            </div>
            <div className="order-items">
              {cart.map(item => (
                <div key={item.id} className="order-item">
                  <img src={item.image || '/placeholder-product.jpg'} alt={item.name} />
                  <div className="item-details">
                    <h3>{item.name}</h3>
                    <p className="item-price">${item.price}</p>
                    <p className="item-quantity">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Payment Method */}
          <section className="checkout-section">
            <div className="section-header">
              <CreditCard size={20} />
              <h2>Payment Method</h2>
            </div>
            <div className="payment-methods">
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Cash on Delivery</span>
                <ChevronRight size={20} />
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Credit/Debit Card</span>
                <ChevronRight size={20} />
              </label>
            </div>
          </section>
        </div>

        {/* Order Total and Place Order */}
        <div className="checkout-footer">
          <div className="order-total">
            <span>Total:</span>
            <span className="total-amount">${getTotalPrice().toFixed(2)}</span>
          </div>
          <button 
            className="place-order-btn" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="checkout-desktop">
      {/* Existing desktop layout */}
    </div>
  );
};

export default Checkout;