import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, onSnapshot, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { safeTimestamp, formatDate } from '../utils/dateUtils';
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
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(ordersQuery, (ordersSnapshot) => {
        const userOrders = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: safeTimestamp(doc.data().createdAt)
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
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled', cancelledAt: serverTimestamp() });
      // Also freeze associated product(s) so admin sees it as frozen
      try {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (orderSnap.exists()) {
          const ord = orderSnap.data();
          const productIds = [];
          if (ord.productId) productIds.push(ord.productId);
          if (Array.isArray(ord.items)) {
            ord.items.forEach(it => {
              if (it.productId) productIds.push(it.productId);
              if (it.id) productIds.push(it.id);
            });
          }
          for (const pid of Array.from(new Set(productIds))) {
            try {
              await updateDoc(doc(db, 'products', String(pid)), { frozen: true, frozenAt: serverTimestamp() });
            } catch (e) {
              // ignore per-product failures
              console.warn('Failed to freeze product', pid, e);
            }
            try {
              // create admin notification about frozen product
              await addDoc(collection(db, 'notifications'), {
                title: 'Product frozen',
                message: `Order ${orderId} cancelled — product ${pid} has been frozen`,
                productId: pid,
                orderId: orderId,
                createdAt: serverTimestamp(),
                read: false,
                type: 'product_frozen'
              });
            } catch (e) {
              console.warn('Failed to create notification for frozen product', pid, e);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch order for freeze step', e);
      }
      // No need to call loadOrders here, as onSnapshot handles updates
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

  // Using formatDate from dateUtils

  const calculateTotal = (items) => {
    return (items || []).reduce((total, item) => total + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
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
          onCancel={handleCancelOrder}
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