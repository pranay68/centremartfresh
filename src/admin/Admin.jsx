import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import AdminLogin from "./AdminLogin";
import AdminLayout from "./AdminLayout";
import AdminDeliverySettings from './pages/AdminDeliverySettings';

const Admin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('adminLoggedIn') === 'true';
  });

  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem('adminLoggedIn', 'true');
    } else {
      localStorage.removeItem('adminLoggedIn');
    }
  }, [isLoggedIn]);

  const handleLogin = (status) => {
    setIsLoggedIn(status);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
      <Routes>
        <Route path="/*" element={<AdminLayout onLogout={handleLogout} />} />
      </Routes>
  );
};

export default Admin;