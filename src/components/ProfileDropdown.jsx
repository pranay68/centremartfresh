/* ProfileDropdown component for centremartfresh - routes to account, orders, settings, and order cancellation */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './ProfileDropdown.css';

const ProfileDropdown = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="profile-dropdown-root" onMouseLeave={() => setOpen(false)}>
      <button className="profile-dropdown-btn" onClick={() => setOpen((v) => !v)}>
        <span role="img" aria-label="profile">👤</span>
      </button>
      {open && (
        <div className="profile-dropdown-menu">
          <button onClick={() => handleNavigate('/account')}>Account</button>
          <button onClick={() => handleNavigate('/orders')}>Orders</button>
          <button onClick={() => handleNavigate('/settings')}>Settings</button>
          <button onClick={() => handleNavigate('/order-cancellation')}>Order Cancellation</button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
