import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Package, 
  Clock, 
  MapPin, 
  Truck, 
  CheckCircle, 
  XCircle,
  Calendar,
  DollarSign,
  Search
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import OrderList from '../components/OrderList';
import OrderDetailModal from '../components/OrderDetailModal';
import OrderSearchBar from '../components/OrderSearchBar';
import '../components/OrdersPage.css';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const userOrders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setOrders(userOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCanceling(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
      await loadOrders();
      setSelectedOrder(null);
    } catch (error) {
      alert('Failed to cancel order.');
    } finally {
      setCanceling(false);
    }
  };

  const getOrderStatus = (status) => {
    switch (status) {
      case 'pending': 
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
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const calculateTotal = (items) => {
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
      </div>
    </div>
  );
};

export default Orders; 