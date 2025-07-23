import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AuthModal from './auth/AuthModal';
import PowerSearch from './PowerSearch';
import ProfileDropdown from './ProfileDropdown';
import CustomerSupportChat from './CustomerSupportChat';
import { Bell, MessageCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Header.css';
import { FaShoppingCart } from 'react-icons/fa';

const Header = ({ searchTerm, setSearchTerm, products, onSearch }) => {
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showSupportChat, setShowSupportChat] = useState(false);

  useEffect(() => {
    if (user) {
      loadUnreadNotifications();
    }
  }, [user]);

  const loadUnreadNotifications = async () => {
    if (!user) return;
    
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('read', '==', false)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      setUnreadNotifications(notificationsSnapshot.size);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // For demo purposes, set a sample count
      setUnreadNotifications(3);
    }
  };

  const handleAuthClick = (tab) => {
    setAuthTab(tab);
    setShowAuthModal(true);
  };

  const handleSearch = (term, filteredProducts = null) => {
    if (onSearch) {
      onSearch(term, filteredProducts);
    }
  };

  const handleSupportClick = () => {
    setShowSupportChat(true);
  };

  return (
    <>
      <header className="amazon-header">
        <div className="header-content">
          <Link to="/" className="logo-link">
            <img 
              src="/image.png" 
              alt="Logo" 
              className="header-logo"
            />
          </Link>
          
          <Link to="/cart" className="cart-link">
            <div className="cart-icon-container">
              <FaShoppingCart className="cart-icon" />
              <span className="cart-count">{getTotalItems()}</span>
            </div>
          </Link>
        </div>
      </header>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        defaultTab={authTab}
      />

      <CustomerSupportChat
        isOpen={showSupportChat}
        onClose={() => setShowSupportChat(false)}
        customerId={user?.uid || 'anonymous'}
        customerName={user?.displayName || user?.email || 'Anonymous'}
      />
    </>
  );
};

export default Header;