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
import publicProducts from './utils/publicProducts';
import { useLocation, useNavigationType } from 'react-router-dom';

// TempApp main component
const TempApp = () => {
  // Route listener component to refresh product snapshot and close overlays
  const RouteListener = () => {
    const location = useLocation();
    const navType = useNavigationType();
    const prevPathRef = React.useRef(location.pathname);

    React.useEffect(() => {
      const prev = prevPathRef.current;
      const cur = location.pathname;
      // If navigating back (POP) from product detail or category to home/list, force a refresh
      try {
        const shouldRefresh = (
          (prev && prev.startsWith('/product/') && (cur === '/' || cur.startsWith('/category') || cur.startsWith('/search'))) ||
          (prev && prev.startsWith('/category') && (cur === '/' || cur.startsWith('/category')))
        );
        if (shouldRefresh) {
          // close lingering overlays/modals
          try { window.dispatchEvent(new Event('close-all-modals')); } catch (e) {}
          // refresh local product snapshot and notify listeners
          (async () => {
            try {
              await publicProducts.refresh();
            } catch (e) {
              // ignore
            }
            try { window.dispatchEvent(new Event('supabase_products_refresh')); } catch (e) {}
            // If navigation type is a browser back (POP), do a full reload to ensure no old UI remains
            try {
              if (navType === 'POP') {
                // small timeout to allow events to flush
                setTimeout(() => {
                  try { window.location.reload(); } catch (e) { /* ignore */ }
                }, 50);
              }
            } catch (e) {}
          })();
        }
      } catch (e) {
        // ignore
      }
      prevPathRef.current = cur;
    }, [location.pathname, navType]);

    return null;
  };
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Router>
              <>
                {/* Wrap app routes with an error boundary to prevent whole-app crashes */}
                <React.Suspense fallback={<div>Loading...</div>}>
                  <RouteListener />
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
