import React, { useState } from 'react';
import './OrderPanel.css';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

const OrderPanel = ({ product, onClose }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');

  const deliveryAreas = [
    'kadam chowk', 'bhanu chowk', 'siva chowk', 'pirari chowk',
    'mills area', 'thapa chowk', 'murli chowk', 'campus chowk',
    'railway station area', 'janaki chowk', 'janak chowk'
  ];

  const validatePhone = phone => /^\+?\d{7,15}$/.test(phone);

  const playDing = () => {
    const audio = new Audio('/ding.mp3'); // put ding.mp3 inside public folder
    audio.play().catch(() => {/* ignore play error if any */});
  };

  const handleOrder = async () => {
    if (!name.trim() || !location.trim() || !phone.trim()) {
      setError('⚠️ Please fill in all fields!');
      return;
    }
    if (!validatePhone(phone.trim())) {
      setError('📞 Enter a valid phone number!');
      return;
    }

    setError('');
    setOrdering(true);

    try {
      await addDoc(collection(db, 'orders'), {
        productId: product.id,
        productName: product.name,
        productImageURL: product.imageUrl,
        price: product.price,
        deliveryCharge: 0,
        customerName: name.trim(),
        address: location.trim(),
        phone: phone.trim(),
        paymentMethod: 'Cash on Delivery',
        status: 'Pending',
        createdAt: serverTimestamp(),
      });
      toast.success('🎉 Order placed successfully! Sit tight and relax.');
      playDing();
      onClose();
    } catch (err) {
      console.error('Order error:', err);
      setError('😵‍💫 Failed to place order. Try again later.');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="order-panel-backdrop">
      <div className="order-panel-modal">
        <h2>🚀 Order: <span className="product-name">{product.name}</span></h2>
        <img src={product.imageUrl} alt={product.name} className="order-img" />
        <p className="price-tag">💸 Price: <strong>Rs. {product.price.toLocaleString()}</strong></p>

        <input
          type="text"
          placeholder="🧑 Your Full Name"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={ordering}
        />

        <select
          value={location}
          onChange={e => setLocation(e.target.value)}
          disabled={ordering}
        >
          <option value="">📍 Select Delivery Area</option>
          {deliveryAreas.map(area => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>

        <input
          type="tel"
          placeholder="📞 Phone Number (e.g. +9779812345678)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          disabled={ordering}
        />

        <p>🚚 Delivery Charge: <strong className="green">Rs. 0</strong></p>
        <p>💰 Payment Method: <strong className="blue">Cash on Delivery</strong></p>

        {error && <p className="error-msg">{error}</p>}

        <div className="button-group">
          <button disabled={ordering} onClick={handleOrder} className="primary-btn">
            {ordering ? '⏳ Processing...' : '✅ Place Order'}
          </button>
          <button disabled={ordering} onClick={onClose} className="cancel-btn">
            ❌ Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderPanel;
