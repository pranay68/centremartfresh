import React from 'react';
import { FaHome, FaBell, FaUser } from 'react-icons/fa';
import { MdOutlineTrackChanges } from 'react-icons/md';
import { IoChatbubbleEllipsesOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import './BottomNav.css';

const BottomNav = () => {
  const navigate = useNavigate();
  return (
    <nav className="bottom-nav amazon-blue-bg">
      <button className="nav-btn" onClick={() => navigate('/')}> <FaHome /> <span>Home</span> </button>
      <button className="nav-btn" onClick={() => navigate('/tracker')}> <MdOutlineTrackChanges /> <span>Tracker</span> </button>
      <button className="nav-btn" onClick={() => navigate('/messages')}> <IoChatbubbleEllipsesOutline /> <span>Message</span> </button>
      <button className="nav-btn" onClick={() => navigate('/notifications')}> <FaBell /> <span>Notification</span> </button>
      <button className="nav-btn" onClick={() => navigate('/account')}> <FaUser /> <span>Profile</span> </button>
    </nav>
  );
};

export default BottomNav; 