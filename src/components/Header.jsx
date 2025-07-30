import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AuthModal from './auth/AuthModal';
import PowerSearch from './PowerSearch';
import ProfileDropdown from './ProfileDropdown';
import ThemeSwitcher from './ThemeSwitcher';
import './Header.css';

const Header = ({ searchTerm, setSearchTerm, products, onSearch }) => {
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');

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
                <ProfileDropdown />
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
    </>
  );
};

export default Header;