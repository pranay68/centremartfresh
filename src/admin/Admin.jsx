import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import AdminLogin from "./AdminLogin";
import AdminLayout from "./AdminLayout";
import AdminDeliverySettings from './pages/AdminDeliverySettings';
import MainPanel from './pages/MainPanel';
import { useAuth } from '../context/AuthContext';

const ADMIN_EMAILS = [
  'pranaykapar1@gmail.com',
  'centremart248@gmail.com'
];

const Admin = () => {
  const { user, loading, logout } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!loading && user && ADMIN_EMAILS.includes(user.email)) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [user, loading]);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    await logout();
  };

  if (loading) return null;
  if (!isLoggedIn) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
      <Routes>
        <Route path="/*" element={<AdminLayout onLogout={handleLogout} />} />
        <Route path="/admin/main-panel" element={<MainPanel />} />
      </Routes>
  );
};

export default Admin;