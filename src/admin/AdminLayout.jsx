import React, { useState } from 'react';
<<<<<<< HEAD
import { Routes, Route, Navigate, Link } from 'react-router-dom';
=======
import { Routes, Route, Navigate } from 'react-router-dom';
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
import Sidebar from './Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
<<<<<<< HEAD
import AdminDeliverySettings from './pages/AdminDeliverySettings';
import Notifications from './pages/Notifications';
import Support from './pages/Support';
import "./AdminPanel.css";
import './pages/OrderPanelBackground.css';
=======
import "./AdminPanel.css";
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d

const AdminLayout = ({ onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
<<<<<<< HEAD
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
=======
    <div className="admin-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="admin-content">
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
          onLogout={onLogout}
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
          <Routes>
            <Route path="/" element={<Navigate to="dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route path="customers" element={<Customers />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="settings" element={<Settings />} />
<<<<<<< HEAD
            <Route path="delivery-settings" element={<AdminDeliverySettings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="support" element={<Support />} />
=======
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
            <Route path="*" element={<Navigate to="dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;