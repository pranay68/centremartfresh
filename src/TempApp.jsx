import React from "react";
// CSS import (make sure the file exists)
import "./TempApp.css";

// React Router
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

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

// TempApp main component
const TempApp = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Router>
              <>
                {/* Wrap app routes with an error boundary to prevent whole-app crashes */}
                <React.Suspense fallback={<div>Loading...</div>}>
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
                  </Routes>
                </React.Suspense>
                <ReviewModal />
                {/* Toast notifications */}
                <Toaster position="top-right" />
              </>
            </Router>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default TempApp;
