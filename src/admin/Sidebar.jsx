import { useLocation, useNavigate } from 'react-router-dom';
<<<<<<< HEAD
import { Brain } from 'lucide-react';
=======
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;
<<<<<<< HEAD
  
=======
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
  return (
    <div className="admin-sidebar">
      {/* Example navigation links */}
      <button className={`sidebar-btn${isActive('/admin/dashboard') ? ' active' : ''}`} onClick={() => navigate('/admin/dashboard')}>Dashboard</button>
      <button className={`sidebar-btn${isActive('/admin/products') ? ' active' : ''}`} onClick={() => navigate('/admin/products')}>Products</button>
      <button className={`sidebar-btn${isActive('/admin/orders') ? ' active' : ''}`} onClick={() => navigate('/admin/orders')}>Orders</button>
      <button className={`sidebar-btn${isActive('/admin/customers') ? ' active' : ''}`} onClick={() => navigate('/admin/customers')}>Customers</button>
<<<<<<< HEAD
      <button className={`sidebar-btn${isActive('/admin/main-panel') ? ' active' : ''}`} onClick={() => navigate('/admin/main-panel')}>Main Panel</button>
      <button className={`sidebar-btn${isActive('/admin/ai-dashboard') ? ' active' : ''}`} onClick={() => navigate('/admin/ai-dashboard')}>
        <Brain size={16} />
        AI Dashboard
      </button>
      <button className={`sidebar-btn${isActive('/admin/settings') ? ' active' : ''}`} onClick={() => navigate('/admin/settings')}>Settings</button>
      <button className={`sidebar-btn${isActive('/admin/delivery-settings') ? ' active' : ''}`} onClick={() => navigate('/admin/delivery-settings')}>Delivery Settings</button>
      <button className={`sidebar-btn${isActive('/admin/notifications') ? ' active' : ''}`} onClick={() => navigate('/admin/notifications')}>Notifications</button>
      <button className={`sidebar-btn${isActive('/admin/support') ? ' active' : ''}`} onClick={() => navigate('/admin/support')}>Customer Support</button>
=======
      <button className={`sidebar-btn${isActive('/admin/settings') ? ' active' : ''}`} onClick={() => navigate('/admin/settings')}>Settings</button>
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
    </div>
  );
};

export default Sidebar; 