import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc, where, limit, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  Edit3,
  RefreshCw,
  DollarSign,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import '../AdminPanel.css';
import './AdminOrderPanel.css';

const statusMessages = {
  pending: 'Your order is pending, will be processing soon!',
  processing: 'Your order is now being processed!',
  shipped: 'Your order has been shipped! Track it in your account.',
  delivered: 'Your order has been delivered! Thank you for shopping with us.',
  cancelled: 'Your order has been cancelled. If you have questions, contact support.'
};

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '',
    searchTerm: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setOrders(ordersData);
      calculateStats(ordersData);
      // Fetch user profiles for all unique userIds
      const userIds = Array.from(new Set(ordersData.map(o => o.userId).filter(Boolean)));
      const profiles = {};
      for (const uid of userIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            profiles[uid] = userDoc.data();
          }
        } catch (e) {}
      }
      setUserProfiles(profiles);
    } catch (error) {
      console.error('Error loading orders:', error);
      // For demo purposes, create sample orders
      createSampleOrders();
    } finally {
      setLoading(false);
    }
  };

  const createSampleOrders = () => {
    const sampleOrders = [
      {
        id: 'order1',
        userId: 'user123',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        productName: 'iPhone 13 Pro',
        productId: 'iphone13',
        price: 150000,
        quantity: 1,
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        deliveryAddress: '123 Main St, Kathmandu, Nepal',
        phone: '+977-9800000000',
        paymentMethod: 'Cash on Delivery',
        trackingNumber: '',
        notes: 'Customer requested delivery after 6 PM'
      },
      {
        id: 'order2',
        userId: 'user456',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        productName: 'Nike Air Max',
        productId: 'nike-air',
        price: 12000,
        quantity: 2,
        status: 'processing',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        deliveryAddress: '456 Oak Ave, Pokhara, Nepal',
        phone: '+977-9811111111',
        paymentMethod: 'Online Payment',
        trackingNumber: 'TRK123456789',
        notes: ''
      },
      {
        id: 'order3',
        userId: 'user789',
        userName: 'Bob Wilson',
        userEmail: 'bob@example.com',
        productName: 'Samsung Galaxy S21',
        productId: 'samsung-s21',
        price: 120000,
        quantity: 1,
        status: 'shipped',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        deliveryAddress: '789 Pine Rd, Biratnagar, Nepal',
        phone: '+977-9822222222',
        paymentMethod: 'Online Payment',
        trackingNumber: 'TRK987654321',
        notes: 'Fragile item - handle with care'
      },
      {
        id: 'order4',
        userId: 'user101',
        userName: 'Alice Brown',
        userEmail: 'alice@example.com',
        productName: 'MacBook Pro',
        productId: 'macbook-pro',
        price: 250000,
        quantity: 1,
        status: 'delivered',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        deliveryAddress: '101 Tech St, Lalitpur, Nepal',
        phone: '+977-9833333333',
        paymentMethod: 'Online Payment',
        trackingNumber: 'TRK456789123',
        notes: 'Customer was satisfied with delivery'
      }
    ];
    setOrders(sampleOrders);
    calculateStats(sampleOrders);
  };

  const calculateStats = (ordersData) => {
    const stats = {
      total: ordersData.length,
      pending: ordersData.filter(o => o.status === 'pending').length,
      processing: ordersData.filter(o => o.status === 'processing').length,
      shipped: ordersData.filter(o => o.status === 'shipped').length,
      delivered: ordersData.filter(o => o.status === 'delivered').length,
      cancelled: ordersData.filter(o => o.status === 'cancelled').length,
      totalRevenue: ordersData
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.price * o.quantity), 0)
    };
    setStats(stats);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date()
      });

      // Fetch order to check notification opt-in and userId
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const order = orderDoc.data();
        if (order.notifyOnOrder && order.userId) {
          await addDoc(collection(db, 'notifications'), {
            userId: order.userId,
            orderId,
            type: 'order',
            status: newStatus,
            message: statusMessages[newStatus] || `Order status updated: ${newStatus}`,
            createdAt: new Date(),
            read: false
          });
        }
      }

      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updatedAt: new Date() }
            : order
        )
      );

      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleAddTracking = async (orderId, trackingNumber) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        trackingNumber,
        status: 'shipped',
        updatedAt: new Date()
      });

      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, trackingNumber, status: 'shipped', updatedAt: new Date() }
            : order
        )
      );

      toast.success('Tracking number added successfully');
    } catch (error) {
      console.error('Error adding tracking number:', error);
      toast.error('Failed to add tracking number');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock };
      case 'processing': return { bg: 'bg-blue-100', text: 'text-blue-800', icon: RefreshCw };
      case 'shipped': return { bg: 'bg-purple-100', text: 'text-purple-800', icon: Truck };
      case 'delivered': return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle };
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'shipped': return 'Shipped';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = orders.filter(order => {
    const profileName = order.userId && userProfiles[order.userId]?.name;
    const displayName = profileName || order.userName || order.customerName || '';
    const matchesStatus = !filters.status || order.status === filters.status;
    const matchesSearch = !filters.searchTerm || 
      displayName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(filters.searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="admin-page">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Order Management</h1>
          <p className="page-subtitle">Manage and track all customer orders</p>
        </div>
        <div className="header-actions">
          <Button variant="outline">
            <Download size={16} className="mr-2" />
            Export
          </Button>
          <Button onClick={loadOrders}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-icon bg-blue-100 text-blue-600">
              <Package size={20} />
            </div>
            <div className="stat-info">
              <h3 className="stat-value">{stats.total}</h3>
              <p className="stat-label">Total Orders</p>
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-icon bg-yellow-100 text-yellow-600">
              <Clock size={20} />
            </div>
            <div className="stat-info">
              <h3 className="stat-value">{stats.pending}</h3>
              <p className="stat-label">Pending</p>
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-icon bg-green-100 text-green-600">
              <CheckCircle size={20} />
            </div>
            <div className="stat-info">
              <h3 className="stat-value">{stats.delivered}</h3>
              <p className="stat-label">Delivered</p>
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-icon bg-purple-100 text-purple-600">
              <DollarSign size={20} />
            </div>
            <div className="stat-info">
              <h3 className="stat-value">Rs. {stats.totalRevenue?.toLocaleString()}</h3>
              <p className="stat-label">Total Revenue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="filters-card">
        <div className="filters-content">
          <div className="filter-group">
            <label className="filter-label">Search</label>
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search orders..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
              className="filter-select"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <Card.Header>
          <h2 className="card-title">Orders ({filteredOrders.length})</h2>
        </Card.Header>
        <Card.Content>
          <div className="admin-table-scroll-wrapper">
            <table className="admin-table" style={{ minWidth: '1200px' }}>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const statusInfo = getStatusColor(order.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr key={order.id} className="order-row">
                      <td className="order-cell">
                        <span className="order-id">#{order.id.slice(-6)}</span>
                      </td>
                      <td className="order-cell">
                        <div className="customer-info">
                          <span className="customer-name">{order.userId && userProfiles[order.userId]?.name ? userProfiles[order.userId].name : (order.userName || order.customerName)}</span>
                          <span className="customer-email">{order.userEmail}</span>
                        </div>
                      </td>
                      <td className="order-cell">
                        <div className="product-info">
                          <span className="product-name">{order.productName}</span>
                          <span className="product-quantity">Qty: {order.quantity}</span>
                        </div>
                      </td>
                      <td className="order-cell">
                        <span className="order-amount">
                          Rs. {(order.price * order.quantity).toLocaleString()}
                        </span>
                      </td>
                      <td className="order-cell">
                        <span className={`status-badge ${statusInfo.bg} ${statusInfo.text}`}>
                          <StatusIcon size={14} className="mr-1" />
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="order-cell">
                        <span className="order-date">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                      <td className="order-cell">
                        <div className="action-buttons">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetails(true);
                            }}
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetails(true);
                            }}
                          >
                            <Edit3 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowOrderDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order Details - #{selectedOrder.id.slice(-6)}</h3>
              <button
                className="modal-close"
                onClick={() => setShowOrderDetails(false)}
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="order-details-grid">
                {/* Customer Information */}
                <div className="detail-section">
                  <h4 className="section-title">
                    <User size={16} className="mr-2" />
                    Customer Information
                  </h4>
                  <div className="detail-content">
                    <div className="detail-row">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{selectedOrder.userId && userProfiles[selectedOrder.userId]?.name ? userProfiles[selectedOrder.userId].name : (selectedOrder.userName || selectedOrder.customerName)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedOrder.userEmail}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedOrder.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Order Information */}
                <div className="detail-section">
                  <h4 className="section-title">
                    <Package size={16} className="mr-2" />
                    Order Information
                  </h4>
                  <div className="detail-content">
                    <div className="detail-row">
                      <span className="detail-label">Product:</span>
                      <span className="detail-value">{selectedOrder.productName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Quantity:</span>
                      <span className="detail-value">{selectedOrder.quantity}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Total Amount:</span>
                      <span className="detail-value">
                        Rs. {(selectedOrder.price * selectedOrder.quantity).toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Payment Method:</span>
                      <span className="detail-value">{selectedOrder.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="detail-section">
                  <h4 className="section-title">
                    <MapPin size={16} className="mr-2" />
                    Delivery Information
                  </h4>
                  <div className="detail-content">
                    <div className="detail-row">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{selectedOrder.deliveryAddress}</span>
                    </div>
                    {selectedOrder.trackingNumber && (
                      <div className="detail-row">
                        <span className="detail-label">Tracking:</span>
                        <span className="detail-value">{selectedOrder.trackingNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Management */}
                <div className="detail-section">
                  <h4 className="section-title">
                    <RefreshCw size={16} className="mr-2" />
                    Status Management
                  </h4>
                  <div className="status-management">
                    <div className="status-options">
                      {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                        <Button
                          key={status}
                          size="sm"
                          variant={selectedOrder.status === status ? 'default' : 'outline'}
                          onClick={() => handleStatusUpdate(selectedOrder.id, status)}
                        >
                          {getStatusText(status)}
                        </Button>
                      ))}
                    </div>
                    
                    {selectedOrder.status === 'processing' && (
                      <div className="tracking-section">
                        <label className="tracking-label">Add Tracking Number:</label>
                        <div className="tracking-input">
                          <input
                            type="text"
                            placeholder="Enter tracking number"
                            className="tracking-field"
                          />
                          <Button size="sm">
                            Add
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement; 