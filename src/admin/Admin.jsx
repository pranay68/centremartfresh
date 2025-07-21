import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import AdminLogin from './AdminLogin';
import AIDashboard from '../components/AISystem/AIDashboard';
import AdminDeliverySettings from './pages/AdminDeliverySettings';
import MainPanel from './pages/MainPanel';
import notificationSystem from '../utils/notificationSystem';
import { useAuth } from '../context/AuthContext';
import './AdminPanel.css';

const ADMIN_EMAILS = [
  'admin@centremart.com',
  'manager@centremart.com',
  'support@centremart.com'
];

const Admin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (user && ADMIN_EMAILS.includes(user.email)) {
      setIsAdmin(true);
      localStorage.setItem('isAdmin', 'true');
    } else {
      setIsAdmin(false);
      localStorage.setItem('isAdmin', 'false');
    }
  }, [user]);

  useEffect(() => {
    // Start notification listeners for admin
    if (isAdmin) {
      const orderListener = notificationSystem.startOrderListener();
      const statusListener = notificationSystem.startOrderStatusListener();
      
      return () => {
        orderListener();
        statusListener();
      };
    }
  }, [isAdmin]);

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.setItem('isAdmin', 'false');
  };

  if (!isAdmin) {
    return <AdminLogin onLogin={() => setIsAdmin(true)} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/*" element={<AdminLayout onLogout={handleLogout} />} />
        <Route path="/admin/main-panel" element={<MainPanel />} />
        <Route path="/admin/ai-dashboard" element={<AIDashboard />} />
        <Route path="/admin/delivery-settings" element={<AdminDeliverySettings />} />
      </Routes>
    </Router>
  );
};

export default Admin;