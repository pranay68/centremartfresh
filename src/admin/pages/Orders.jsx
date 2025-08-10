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
import { getAllProductsWithOverrides, adjustProductStock } from '../../utils/productOperations';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [updating, setUpdating] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // all | cod | online
  const [trackingOnly, setTrackingOnly] = useState(false);
  const [delivererFilter, setDelivererFilter] = useState('');
  const [sortKey, setSortKey] = useState('createdAt'); // createdAt | amount | status
  const [sortDir, setSortDir] = useState('desc');
  const [deductStockOnUpdate, setDeductStockOnUpdate] = useState(true);
  const [stockSummary, setStockSummary] = useState({ total: 0, low: 0, out: 0 });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const products = getAllProductsWithOverrides();
    const out = products.filter(p => (p.stock || 0) === 0).length;
    const low = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 2).length;
    setStockSummary({ total: products.length, low, out });
  }, []);

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }));
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const computeAmount = (order) => {
    const base = order.totalAmount || (order.price * (order.quantity || 1)) || order.price || 0;
    return Number(base) || 0;
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      toast.success('Order status updated!');
      // Optionally deduct stock when marking delivered
      if (deductStockOnUpdate && newStatus === 'Delivered') {
        const ord = orders.find(o => o.id === orderId);
        if (ord?.productId) {
          adjustProductStock(ord.productId, -1 * (ord.quantity || 1));
        }
      }
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
      const promises = Array.from(selectedOrders).map(async orderId => {
        await updateDoc(doc(db, 'orders', orderId), { status });
        if (deductStockOnUpdate && status === 'Delivered') {
          const ord = orders.find(o => o.id === orderId);
          if (ord?.productId) {
            adjustProductStock(ord.productId, -1 * (ord.quantity || 1));
          }
        }
      });
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

  // Filters
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      (order.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.phone || '').includes(searchTerm) ||
      (order.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesDate = !rangeStart || (order.createdAt && isAfter(new Date(order.createdAt), rangeStart));
    const amount = computeAmount(order);
    const matchesAmountMin = !amountMin || amount >= Number(amountMin);
    const matchesAmountMax = !amountMax || amount <= Number(amountMax);
    const matchesPayment = paymentFilter === 'all' ||
      (paymentFilter === 'cod' && /cash/i.test(order.paymentMethod || '')) ||
      (paymentFilter === 'online' && /online|card|upi|wallet/i.test(order.paymentMethod || ''));
    const matchesTracking = !trackingOnly || !!order.trackingNumber;
    const matchesDeliverer = !delivererFilter || (order.deliveryPerson || '').toLowerCase().includes(delivererFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesDate && matchesAmountMin && matchesAmountMax && matchesPayment && matchesTracking && matchesDeliverer;
  });

  // Sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'createdAt') {
      return dir * ((new Date(a.createdAt)).getTime() - (new Date(b.createdAt)).getTime());
    }
    if (sortKey === 'amount') {
      return dir * (computeAmount(a) - computeAmount(b));
    }
    if (sortKey === 'status') {
      return dir * String(a.status || '').localeCompare(String(b.status || ''));
    }
    return 0;
  });

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Order ID','Date','Customer','Phone','Product','Quantity','Amount','Status','Payment Method','Tracking'];
    const rows = sortedOrders.map(o => [
      o.id,
      o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
      o.customerName || '',
      o.phone || '',
      o.productName || '',
      o.quantity || 1,
      computeAmount(o),
      o.status || '',
      o.paymentMethod || '',
      o.trackingNumber || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      {/* Header with stock quick filters and export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
        <div className="flex gap-2 items-center flex-wrap">
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
          <label className="flex items-center gap-2 text-xs text-gray-700 ml-2">
            <input type="checkbox" checked={deductStockOnUpdate} onChange={e => setDeductStockOnUpdate(e.target.checked)} />
            Deduct stock on status change
          </label>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-gray-600">Stock:</span>
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/admin/stock'}>
              Out of Stock ({stockSummary.out})
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/admin/stock'}>
              Low Stock ({stockSummary.low})
            </Button>
            <Button size="sm" variant="outline" onClick={exportToCSV}>Export CSV</Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <Card.Content className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by product, customer, phone, or order ID..."
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <Input placeholder="Min Amount" value={amountMin} onChange={e => setAmountMin(e.target.value)} />
            <Input placeholder="Max Amount" value={amountMax} onChange={e => setAmountMax(e.target.value)} />
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Payments</option>
              <option value="cod">Cash on Delivery</option>
              <option value="online">Online</option>
            </select>
            <div className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={trackingOnly} onChange={e => setTrackingOnly(e.target.checked)} />
              Has Tracking Only
            </div>
            <Input placeholder="Delivery person" value={delivererFilter} onChange={e => setDelivererFilter(e.target.value)} />
          </div>
        </Card.Content>
      </Card>

        {/* Bulk actions */}
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
          <div className="flex items-center gap-4 text-sm">
            <span>Sort by:</span>
            <Button size="sm" variant={sortKey==='createdAt' ? 'primary':'outline'} onClick={() => toggleSort('createdAt')}>Date {sortKey==='createdAt' ? (sortDir==='asc'?'↑':'↓'):''}</Button>
            <Button size="sm" variant={sortKey==='amount' ? 'primary':'outline'} onClick={() => toggleSort('amount')}>Amount {sortKey==='amount' ? (sortDir==='asc'?'↑':'↓'):''}</Button>
            <Button size="sm" variant={sortKey==='status' ? 'primary':'outline'} onClick={() => toggleSort('status')}>Status {sortKey==='status' ? (sortDir==='asc'?'↑':'↓'):''}</Button>
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
                  <col style={{ minWidth: '140px', width: '160px' }} />
                  <col style={{ minWidth: '120px', width: '140px' }} />
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('amount')}>Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('createdAt')}>Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedOrders.map((order) => (
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
                      <td className="order-cell font-semibold">Rs. {computeAmount(order).toLocaleString()}</td>
                      <td className="order-cell text-sm text-gray-600">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</td>
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

      {/* Right-side stock insights */}
      <div className="mt-6">
        <Card>
          <Card.Content className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Stock Overview</div>
              <div className="flex gap-3 text-sm">
                <span>Total: {stockSummary.total}</span>
                <span>Low: {stockSummary.low}</span>
                <span>Out: {stockSummary.out}</span>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {sortedOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default Orders;