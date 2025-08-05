import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import { useCart } from '../context/CartContext';
import AuthModal from './auth/AuthModal';
import PowerSearch from './PowerSearch';
import ProfileDropdown from './ProfileDropdown';
import CustomerSupportChat from './CustomerSupportChat';
import { Bell, MessageCircle } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Header.css';

const Header = ({ searchTerm, setSearchTerm, products, onSearch }) => {
  const { user, logout } = useAuth();
  // const { getTotalItems } = useCart();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showSupportChat, setShowSupportChat] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Real-time notifications using Firestore onSnapshot
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    }, (error) => {
      console.error('Error loading notifications:', error);
      setUnreadNotifications(0);
    });
    return () => unsubscribe();
  }, [user]);

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
      <header className="header">
        <div className="header-container">
          <div className="header-left"></div>
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
          <div className="header-right">
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
                  {/* Wishlist and Cart removed for cleaner header */}
                </>
              ) : (
                <>
                  {/* Cart removed for cleaner header */}
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