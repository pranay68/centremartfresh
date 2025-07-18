import React, { useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import AdminDeliverySettings from './pages/AdminDeliverySettings';
import Notifications from './pages/Notifications';
import Support from './pages/Support';
import "./AdminPanel.css";
import './pages/OrderPanelBackground.css';

const AdminLayout = ({ onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100vw' }}>
      {/* Remove the background image div */}
      <div className="admin-layout" style={{ display: 'flex', flexDirection: 'row', position: 'relative', zIndex: 1 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <li>
            <Link to="/admin/main-panel">Main Panel</Link>
          </li>
        </Sidebar>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', color: '#222', textShadow: 'none' }}>
          <Header onMenuClick={() => setSidebarOpen(true)} onLogout={onLogout} />
          <Routes>
            <Route path="/" element={<Navigate to="dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route path="customers" element={<Customers />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="settings" element={<Settings />} />
            <Route path="delivery-settings" element={<AdminDeliverySettings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="support" element={<Support />} />
            <Route path="*" element={<Navigate to="dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;