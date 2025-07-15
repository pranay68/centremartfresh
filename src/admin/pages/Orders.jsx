import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
import './AdminOrderPanel.css';
import './OrderPanelBackground.css';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter } from 'date-fns';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [updating, setUpdating] = useState(false);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      toast.success('Order status updated!');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const bulkUpdateStatus = async (status) => {
    if (selectedOrders.size === 0) {
      toast.error('Please select orders to update');
      return;
    }

    setUpdating(true);
    try {
      const promises = Array.from(selectedOrders).map(orderId =>
        updateDoc(doc(db, 'orders', orderId), { status })
      );
      await Promise.all(promises);
      toast.success(`${selectedOrders.size} orders updated to ${status}`);
      setSelectedOrders(new Set());
      fetchOrders();
    } catch (error) {
      console.error('Error bulk updating orders:', error);
      toast.error('Failed to update orders');
    } finally {
      setUpdating(false);
    }
  };

  const toggleOrderSelection = (orderId) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const selectAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(order => order.id)));
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prev => prev.filter(order => order.id !== orderId));
      toast.success('Order deleted!');
    } catch (err) {
      toast.error('Failed to delete order');
      console.error(err);
    }
  };

  // Date range filtering logic
  const now = new Date();
  let rangeStart = null;
  switch (dateRange) {
    case 'today':
      rangeStart = startOfDay(now);
      break;
    case 'week':
      rangeStart = startOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      rangeStart = startOfMonth(now);
      break;
    case 'year':
      rangeStart = startOfYear(now);
      break;
    default:
      rangeStart = null;
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone?.includes(searchTerm);
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesDate = !rangeStart || (order.createdAt && isAfter(order.createdAt, rangeStart));
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Processing': return 'bg-blue-100 text-blue-800';
      case 'Shipped': return 'bg-purple-100 text-purple-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div
      className="order-panel-bg"
      style={{
        background: "url('/image1.png') no-repeat center center fixed",
        backgroundSize: "cover",
        minHeight: "100vh",
        width: "100vw",
        position: "relative"
      }}
    >
      <div className="order-panel-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => bulkUpdateStatus('Processing')}
            disabled={selectedOrders.size === 0}
            loading={updating}
            size="sm"
          >
            Mark Processing
          </Button>
          <Button 
            onClick={() => bulkUpdateStatus('Delivered')}
            disabled={selectedOrders.size === 0}
            loading={updating}
            size="sm"
            variant="success"
          >
            Mark Delivered
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <Card.Content className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by product, customer, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
          </div>
        </Card.Content>
      </Card>

        {/* Add bulk actions above the table */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex gap-2">
            <Button
              onClick={selectAllOrders}
              size="sm"
              variant="outline"
            >
              {selectedOrders.size === filteredOrders.length ? 'Deselect All' : 'Select All'}
            </Button>
            <select
              onChange={e => {
                if (e.target.value === 'delivered') bulkUpdateStatus('Delivered');
                if (e.target.value === 'processing') bulkUpdateStatus('Processing');
                if (e.target.value === 'pending') bulkUpdateStatus('Pending');
                e.target.value = '';
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value=""
              style={{ minWidth: 160 }}
              disabled={selectedOrders.size === 0}
            >
              <option value="">Bulk Actions</option>
              <option value="delivered">Mark as Delivered</option>
              <option value="processing">Mark as Processing</option>
              <option value="pending">Mark as Pending</option>
            </select>
            <span className="text-xs text-gray-500 mt-2">{selectedOrders.size} selected</span>
          </div>
        </div>

      {/* Orders Table */}
      <Card>
        <Card.Content className="p-0">
          <div className="admin-table-scroll-wrapper" style={{ width: '100%', overflowX: 'scroll', overflowY: 'hidden' }}>
            <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '1400px' }}>
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '60px' }} />
                  <col style={{ minWidth: '180px', width: '220px' }} />
                  <col style={{ minWidth: '180px', width: '220px' }} />
                  <col style={{ minWidth: '140px', width: '180px' }} />
                  <col style={{ minWidth: '180px', width: '220px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '120px' }} />
                </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={selectAllOrders}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">More Details</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                    <tr key={order.id} className="order-row">
                      <td className="order-cell">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                      <td className="order-img-col order-cell">
                        <img
                          src={order.productImageURL || 'https://via.placeholder.com/60'}
                          alt={order.productName}
                          className="order-img"
                        />
                    </td>
                      <td className="order-cell nowrap text-sm font-medium text-gray-900">{order.productName}</td>
                      <td className="order-cell nowrap text-sm font-medium text-gray-900">{order.customerName}</td>
                      <td className="order-cell nowrap">{order.phone}</td>
                      <td className="order-cell">
                      <div className="text-sm text-gray-500">{order.address}</div>
                      {order.isGuest && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Guest</span>
                      )}
                      {order.email && (
                        <div className="text-xs text-gray-500">{order.email}</div>
                      )}
                    </td>
                      <td className="order-actions-col order-cell">
                        <div className="action-buttons">
                          {order.status !== 'Delivered' && (
                            <button
                              className="admin-btn"
                              title="Mark as Delivered"
                              onClick={() => updateOrderStatus(order.id, 'Delivered')}
                              disabled={updating}
                              style={{ minWidth: 100, padding: '8px 12px', fontSize: '1rem', margin: 0 }}
                            >
                              <span className="icon">✔️</span> Mark as Delivered
                            </button>
                          )}
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                            style={{ minWidth: 80, marginLeft: 4 }}
                            disabled={updating}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                          <button
                            className="admin-btn"
                            title="Delete Order"
                            onClick={() => handleDeleteOrder(order.id)}
                            style={{ minWidth: 60, padding: '8px 10px', fontSize: '1rem', margin: 0, background: '#e53e3e' }}
                          >
                            🗑️
                          </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default Orders;