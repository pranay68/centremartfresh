import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
<<<<<<< HEAD
import { collection, query, where, orderBy, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
=======
import { doc, getDoc } from 'firebase/firestore';
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
import { db } from '../firebase/config';
import { 
  Package, 
  Clock, 
  MapPin, 
  Truck, 
  CheckCircle, 
  XCircle,
  Calendar,
<<<<<<< HEAD
  DollarSign,
  Search
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import OrderList from '../components/OrderList';
import OrderDetailModal from '../components/OrderDetailModal';
import OrderSearchBar from '../components/OrderSearchBar';
import '../components/OrdersPage.css';
import notificationSystem from '../utils/notificationSystem';
=======
  DollarSign
} from 'lucide-react';
import './Orders.css';
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
<<<<<<< HEAD
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (user) {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(ordersQuery, (ordersSnapshot) => {
        const userOrders = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        setOrders(userOrders);
        setLoading(false);
      }, (error) => {
        setLoading(false);
        console.error('Error loading orders:', error);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCanceling(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
      // Notify admins
      await notificationSystem.sendAdminNotification(
        'Order Cancelled',
        `Order #${orderId} was cancelled by the user.`,
        'order_cancelled'
      );
      setSelectedOrder(null);
    } catch (error) {
      alert('Failed to cancel order.');
    } finally {
      setCanceling(false);
=======

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
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
    }
  };

  const getOrderStatus = (status) => {
    switch (status) {
      case 'pending': 
<<<<<<< HEAD
        return { text: 'Pending', color: '#f59e0b', icon: <Clock size={16} />, bgColor: '#fef3c7' };
      case 'processing': 
        return { text: 'Processing', color: '#3b82f6', icon: <Package size={16} />, bgColor: '#dbeafe' };
      case 'shipped': 
        return { text: 'Shipped', color: '#8b5cf6', icon: <Truck size={16} />, bgColor: '#ede9fe' };
      case 'delivered': 
        return { text: 'Delivered', color: '#10b981', icon: <CheckCircle size={16} />, bgColor: '#d1fae5' };
      case 'cancelled': 
        return { text: 'Cancelled', color: '#ef4444', icon: <XCircle size={16} />, bgColor: '#fee2e2' };
      default: 
        return { text: 'Unknown', color: '#6b7280', icon: <Package size={16} />, bgColor: '#f3f4f6' };
=======
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
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
<<<<<<< HEAD
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
=======
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
    });
  };

  const calculateTotal = (items) => {
<<<<<<< HEAD
    return (items || []).reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Filtered orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' ||
      order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items?.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

=======
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
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
<<<<<<< HEAD
        <OrderSearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
        <OrderList
          orders={filteredOrders}
          loading={loading}
          onOrderClick={setSelectedOrder}
        />
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onCancel={handleCancelOrder}
          canceling={canceling}
        />
=======

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
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
      </div>
    </div>
  );
};

export default Orders; 