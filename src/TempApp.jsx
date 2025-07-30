import React from "react";
// CSS import (make sure the file exists)
import "./TempApp.css";

// React Router
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

// Context Providers (UNCOMMENT ONE AT A TIME IF DEBUGGING)
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { ThemeProvider } from "./context/ThemeContext";

// Toast Notifications
import { Toaster } from "react-hot-toast";

// Pages (Make sure these paths/files are valid)
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Account from "./pages/Account";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Notifications from "./pages/Notifications";
import Returns from "./pages/Returns";
import Orders from "./pages/Orders";
import Admin from "./admin/Admin";
import ReviewModal from './components/ReviewModal';
import CategoryPage from "./pages/CategoryPage";
import SearchResults from "./pages/SearchResults";
import ProductDetail from "./pages/ProductDetail";
import NewArrivals from "./pages/NewArrivals";
import TopSellers from "./pages/TopSellers";
import FlashSale from "./pages/FlashSale";
import ProductList from "./pages/ProductList";

const AppContent = () => {
  const location = useLocation();
  useEffect(() => {
    if (!location.pathname.startsWith("/search")) {
      localStorage.removeItem("searchResults");
      localStorage.removeItem("searchTerm");
    }
  }, [location.pathname]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/account" element={<Account />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/category/:category" element={<CategoryPage />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/new-arrivals" element={<NewArrivals />} />
        <Route path="/top-sellers" element={<TopSellers />} />
        <Route path="/flash-sale" element={<FlashSale />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="*" element={<div className="not-found">404 - Page Not Found</div>} />
      </Routes>
      <ReviewModal />
      <Toaster position="top-right" />
    </>
  );
};

const TempApp = () => (
  <Router>
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <AppContent />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  </Router>
);

export default TempApp;
