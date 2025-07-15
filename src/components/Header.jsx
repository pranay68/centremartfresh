import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AuthModal from './auth/AuthModal';
import PowerSearch from './PowerSearch';
import ProfileDropdown from './ProfileDropdown';
import ThemeSwitcher from './ThemeSwitcher';
import CustomerSupportChat from './CustomerSupportChat';
import { Bell, MessageCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Header.css';

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
    setSearchTerm(term);
    if (onSearch) {
      onSearch(term, filteredProducts);
    }
  };

  const handleSupportClick = () => {
    setShowSupportChat(true);
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className="header-left">
            <ThemeSwitcher />
          </div>
          
          <Link to="/" className="logo">
            <div className="logo-container">
              <img 
                src="/image.png" 
                alt="Mart Logo" 
                className="logo-image"
              />
              <h1 className="logo-text">Centre Mart</h1>
            </div>
        </Link>
        
          <div className="search-container">
            <PowerSearch
              products={products}
              onSearch={handleSearch}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
          />
          </div>
          
          <nav className="nav-menu">
            {user ? (
              <>
                {/* Reviews Button */}
                <button className="nav-link" onClick={() => window.dispatchEvent(new CustomEvent('open-reviews-modal'))}>
                  Reviews
                </button>
                <ProfileDropdown />
                
                {/* Notification Bell */}
                <Link to="/notifications" className="nav-link notification-link">
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <span className="notification-badge">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </Link>
                
                <Link to="/wishlist" className="nav-link">
                  ❤️ Wishlist                      
                </Link>
                <Link to="/cart" className="nav-link cart-link">
                  🛒 Cart
                  {getTotalItems() > 0 && (
                    <span className="cart-badge">
                      {getTotalItems()}
                    </span>
                  )}
                </Link>
              </>
            ) : (
              <>
                <Link to="/cart" className="nav-link cart-link">
                  🛒 Cart
                  {getTotalItems() > 0 && (
                    <span className="cart-badge">
                      {getTotalItems()}
                    </span>
                  )}
                </Link>
                <button className="auth-btn login-btn" onClick={() => handleAuthClick('login')}>
                  Login
                </button>
                <button className="auth-btn signup-btn" onClick={() => handleAuthClick('signup')}>
                  Sign Up
                </button>
              </>
            )}
          </nav>
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