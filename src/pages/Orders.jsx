import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Package, 
  Clock, 
  MapPin, 
  Truck, 
  CheckCircle, 
  XCircle,
  Calendar,
  DollarSign
} from 'lucide-react';
import './Orders.css';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userOrders = userData.orders || [];
        setOrders(userOrders.sort((a, b) => 
          new Date(b.timestamp?.toDate() || b.timestamp) - new Date(a.timestamp?.toDate() || a.timestamp)
        ));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatus = (status) => {
    switch (status) {
      case 'pending': 
        return { 
          text: 'Pending', 
          color: '#f59e0b', 
          icon: <Clock size={16} />,
          bgColor: '#fef3c7'
        };
      case 'processing': 
        return { 
          text: 'Processing', 
          color: '#3b82f6', 
          icon: <Package size={16} />,
          bgColor: '#dbeafe'
        };
      case 'shipped': 
        return { 
          text: 'Shipped', 
          color: '#8b5cf6', 
          icon: <Truck size={16} />,
          bgColor: '#ede9fe'
        };
      case 'delivered': 
        return { 
          text: 'Delivered', 
          color: '#10b981', 
          icon: <CheckCircle size={16} />,
          bgColor: '#d1fae5'
        };
      case 'cancelled': 
        return { 
          text: 'Cancelled', 
          color: '#ef4444', 
          icon: <XCircle size={16} />,
          bgColor: '#fee2e2'
        };
      default: 
        return { 
          text: 'Unknown', 
          color: '#6b7280', 
          icon: <Package size={16} />,
          bgColor: '#f3f4f6'
        };
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotal = (items) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  if (!user) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <div className="no-auth-message">
            <h2>Please sign in to view your orders</h2>
            <p>You need to be logged in to see your order history.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <div className="orders-header">
          <h1>My Orders</h1>
          <p>Track your orders and view order history</p>
        </div>

        {loading ? (
          <div className="loading-orders">
            <div className="loading-spinner"></div>
            <p>Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="no-orders">
            <Package size={64} className="no-orders-icon" />
            <h2>No orders yet</h2>
            <p>Start shopping to see your orders here!</p>
          </div>
        ) : (
          <div className="orders-content">
            <div className="orders-list">
              {orders.map((order, index) => {
                const status = getOrderStatus(order.status);
                const total = calculateTotal(order.items || []);
                
                return (
                  <div 
                    key={index} 
                    className={`order-card ${selectedOrder === index ? 'selected' : ''}`}
                    onClick={() => setSelectedOrder(selectedOrder === index ? null : index)}
                  >
                    <div className="order-header">
                      <div className="order-info">
                        <h3>Order #{order.id?.slice(-8) || `ORD${String(index + 1).padStart(6, '0')}`}</h3>
                        <p className="order-date">
                          <Calendar size={14} />
                          {formatDate(order.timestamp)}
                        </p>
                      </div>
                      <div className="order-status-badge" style={{ 
                        backgroundColor: status.bgColor,
                        color: status.color
                      }}>
                        {status.icon}
                        <span>{status.text}</span>
                      </div>
                    </div>

                    <div className="order-summary">
                      <div className="order-items">
                        <span>{order.items?.length || 0} items</span>
                      </div>
                      <div className="order-total">
                        <DollarSign size={16} />
                        <span>Rs. {total.toFixed(2)}</span>
                      </div>
                    </div>

                    {selectedOrder === index && (
                      <div className="order-details">
                        <div className="order-items-detail">
                          <h4>Items Ordered</h4>
                          {order.items?.map((item, itemIndex) => (
                            <div key={itemIndex} className="order-item">
                              <img 
                                src={item.imageUrl || 'https://via.placeholder.com/50x50'} 
                                alt={item.name}
                                className="item-image"
                              />
                              <div className="item-info">
                                <span className="item-name">{item.name}</span>
                                <span className="item-quantity">Qty: {item.quantity}</span>
                              </div>
                              <span className="item-price">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {order.deliveryAddress && (
                          <div className="delivery-info">
                            <h4>Delivery Address</h4>
                            <div className="address-details">
                              <MapPin size={16} />
                              <span>{order.deliveryAddress}</span>
                            </div>
                          </div>
                        )}

                        <div className="order-timeline">
                          <h4>Order Timeline</h4>
                          <div className="timeline">
                            <div className="timeline-item completed">
                              <div className="timeline-dot"></div>
                              <div className="timeline-content">
                                <h5>Order Placed</h5>
                                <p>{formatDate(order.timestamp)}</p>
                              </div>
                            </div>
                            {order.status !== 'pending' && (
                              <div className="timeline-item completed">
                                <div className="timeline-dot"></div>
                                <div className="timeline-content">
                                  <h5>Processing</h5>
                                  <p>Order is being prepared</p>
                                </div>
                              </div>
                            )}
                            {['shipped', 'delivered'].includes(order.status) && (
                              <div className="timeline-item completed">
                                <div className="timeline-dot"></div>
                                <div className="timeline-content">
                                  <h5>Shipped</h5>
                                  <p>Order is on its way</p>
                                </div>
                              </div>
                            )}
                            {order.status === 'delivered' && (
                              <div className="timeline-item completed">
                                <div className="timeline-dot"></div>
                                <div className="timeline-content">
                                  <h5>Delivered</h5>
                                  <p>Order has been delivered</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders; 