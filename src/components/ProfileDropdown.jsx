import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Package, 
  Settings,                                             <div className="order-status-container">
                        <div 
                          className={`order-status ${order.status === 'cancelled' ? 'cancelled' : ''}`}
                          style={{ color: getOrderStatus(order.status).color }}
                        >
                          {getOrderStatus(order.status).text}
                        </div>
                        {order.status !== 'cancelled' && (
                          <button
                            className="cancel-order-btn"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <XCircle size={14} />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                ))}
              </div>
              {userOrders.length > 3 && (
                <Link to="/orders" className="view-all-orders" onClick={() => setIsOpen(false)}>
                  View all {userOrders.length} orders
                </Link>
              )}="order-actions">
                        <div 
                          className={`order-status ${order.status === 'cancelled' ? 'cancelled' : ''}`}
                          style={{ color: getOrderStatus(order.status).color }}
                        >
                          {getOrderStatus(order.status).text}
                        </div>
                        {order.status !== 'cancelled' && (
                          <button
                            className="cancel-order-btn"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <XCircle size={14} />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                ))}
              </div>
              {userOrders.length > 3 && (
                <Link to="/orders" className="view-all-orders" onClick={() => setIsOpen(false)}>
                  View all {userOrders.length} orders
                </Link>
              )}  MapPin, 
  Clock,
  ChevronDown,
  UserCheck,
  XCircle
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './ProfileDropdown.css';

const ProfileDropdown = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState('');

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load user orders
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserOrders(userData.orders || []);
        setUserLocation(userData.location || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updatedOrders = userData.orders.map(order => {
          if (order.id === orderId) {
            return { ...order, status: 'cancelled' };
          }
          return order;
        });

        await updateDoc(userDocRef, { orders: updatedOrders });
        
        // Update order in admin's orders collection
        const orderDocRef = doc(db, 'orders', orderId);
        await updateDoc(orderDocRef, { status: 'cancelled' });
        
        // Refresh orders data
        loadUserData();
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getOrderStatus = (status) => {
    switch (status) {
      case 'pending': return { text: 'Pending', color: '#f59e0b' };
      case 'processing': return { text: 'Processing', color: '#3b82f6' };
      case 'shipped': return { text: 'Shipped', color: '#8b5cf6' };
      case 'delivered': return { text: 'Delivered', color: '#10b981' };
      case 'cancelled': return { text: 'Cancelled', color: '#ef4444' };
      default: return { text: 'Unknown', color: '#6b7280' };
    }
  };

  if (!user) return null;

  return (
    <div className="profile-dropdown-container">
      <button 
        className="profile-trigger"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      >
        <div className="profile-avatar">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'Profile'} 
              className="profile-image"
            />
          ) : (
            <div className="profile-initials">
              {getInitials(user.displayName || user.email)}
            </div>
          )}
        </div>
        <div className="profile-info">
          <span className="profile-name">
            {user.displayName || user.email?.split('@')[0] || 'User'}
          </span>
          <span className="profile-email">{user.email}</span>
        </div>
        <ChevronDown className={`dropdown-arrow ${isOpen ? 'open' : ''}`} size={16} />
      </button>

      {isOpen && (
        <div className="profile-dropdown">
          <div className="dropdown-header">
            <div className="user-summary">
              <div className="user-avatar-large">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'Profile'} 
                  />
                ) : (
                  <div className="user-initials-large">
                    {getInitials(user.displayName || user.email)}
                  </div>
                )}
              </div>
              <div className="user-details">
                <h3>{user.displayName || user.email?.split('@')[0] || 'User'}</h3>
                <p>{user.email}</p>
                {userLocation && (
                  <div className="user-location">
                    <MapPin size={14} />
                    <span>{userLocation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dropdown-section">
            <h4>Quick Actions</h4>
            <Link to="/account" className="dropdown-item" onClick={() => setIsOpen(false)}>
              <User size={16} />
              <span>My Profile</span>
            </Link>
            <Link to="/orders" className="dropdown-item" onClick={() => setIsOpen(false)}>
              <Package size={16} />
              <span>My Orders</span>
              {userOrders.length > 0 && (
                <span className="order-count">{userOrders.length}</span>
              )}
            </Link>
            <Link to="/order-cancellation" className="dropdown-item" onClick={() => setIsOpen(false)}>
              <XCircle size={16} />
              <span>Order Cancellation</span>
            </Link>
            <Link to="/settings" className="dropdown-item" onClick={() => setIsOpen(false)}>
              <Settings size={16} />
              <span>Settings</span>
            </Link>
          </div>

          {userOrders.length > 0 && (
            <div className="dropdown-section">
              <h4>Recent Orders</h4>
              <div className="recent-orders">
                {userOrders.slice(0, 3).map((order, index) => (
                  <div key={index} className="recent-order-item">
                    <div className="order-info">
                      <span className="order-id">#{order.id?.slice(-6) || 'N/A'}</span>
                      <span className="order-date">
                        {new Date(order.timestamp?.toDate() || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="order-status-container">
                        <div 
                          className={`order-status ${order.status === 'cancelled' ? 'cancelled' : ''}`}
                          style={{ color: getOrderStatus(order.status).color }}
                        >
                          {getOrderStatus(order.status).text}
                        </div>
                        {order.status !== 'cancelled' && (
                          <button
                            className="cancel-order-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelOrder(order.id);
                            }}
                          >
                            <XCircle size={14} />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                ))}
              </div>
              {userOrders.length > 3 && (
                <Link to="/orders" className="view-all-orders" onClick={() => setIsOpen(false)}>
                  View all {userOrders.length} orders
                </Link>
              )}
            </div>
          )}

          <div className="dropdown-section">
            <button className="dropdown-item logout-btn" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown; 