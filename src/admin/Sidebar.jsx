import { useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;
  return (
    <div className="admin-sidebar">
      {/* Example navigation links */}
      <button className={`sidebar-btn${isActive('/admin/dashboard') ? ' active' : ''}`} onClick={() => navigate('/admin/dashboard')}>Dashboard</button>
      <button className={`sidebar-btn${isActive('/admin/products') ? ' active' : ''}`} onClick={() => navigate('/admin/products')}>Products</button>
      <button className={`sidebar-btn${isActive('/admin/orders') ? ' active' : ''}`} onClick={() => navigate('/admin/orders')}>Orders</button>
      <button className={`sidebar-btn${isActive('/admin/customers') ? ' active' : ''}`} onClick={() => navigate('/admin/customers')}>Customers</button>
      <button className={`sidebar-btn${isActive('/admin/settings') ? ' active' : ''}`} onClick={() => navigate('/admin/settings')}>Settings</button>
      <button className={`sidebar-btn${isActive('/admin/delivery-settings') ? ' active' : ''}`} onClick={() => navigate('/admin/delivery-settings')}>Delivery Settings</button>
      <button className={`sidebar-btn${isActive('/admin/notifications') ? ' active' : ''}`} onClick={() => navigate('/admin/notifications')}>Notifications</button>
      <button className={`sidebar-btn${isActive('/admin/support') ? ' active' : ''}`} onClick={() => navigate('/admin/support')}>Customer Support</button>
    </div>
  );
};

export default Sidebar; 