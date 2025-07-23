import React from 'react';
import { FaHome, FaShoppingCart, FaHeart, FaBell, FaUser } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './BottomNav.css';

const BottomNav = () => {
  const navigate = useNavigate();
  return (
    <nav className="bottom-nav">
      <button className="nav-btn" onClick={() => navigate('/')}> <FaHome /> <span>Home</span> </button>
      <button className="nav-btn" onClick={() => navigate('/wishlist')}> <FaHeart /> <span>Wishlist</span> </button>
      <button className="nav-btn" onClick={() => navigate('/cart')}> <FaShoppingCart /> <span>Cart</span> </button>
      <button className="nav-btn" onClick={() => navigate('/notifications')}> <FaBell /> <span>Notification</span> </button>
      <button className="nav-btn" onClick={() => navigate('/account')}> <FaUser /> <span>Profile</span> </button>
    </nav>
  );
};

export default BottomNav; 