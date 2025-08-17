import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy, deleteDoc, onSnapshot, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
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
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
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

  // prevent background scroll and make overlay opaque when modal open
  useEffect(() => {
    if (showOrderDetail) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showOrderDetail]);

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      // realtime listener so admin UI reacts to external status changes immediately
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ordersData = snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : d.data().createdAt }));
        setOrders(ordersData);
        // Process any newly-cancelled orders (docChanges)
        snapshot.docChanges().forEach(async (change) => {
          try {
            if (change.type === 'modified') {
              const data = change.doc.data();
              if (String(data.status || '').toLowerCase() === 'cancelled') {
                // run same cancel processing to freeze products and notify
                const ord = data;
                const orderId = change.doc.id;
                const productIds = [];
                if (ord.productId) productIds.push(ord.productId);
                if (Array.isArray(ord.items)) {
                  ord.items.forEach(it => {
                    if (it.productId) productIds.push(it.productId);
                    if (it.id) productIds.push(it.id);
                  });
                }
                for (const pid of Array.from(new Set(productIds))) {
                  try { await updateDoc(doc(db, 'products', String(pid)), { frozen: true, frozenAt: serverTimestamp() }); } catch (e) { console.warn('Failed to freeze product', pid, e); }
                  try { await addDoc(collection(db, 'notifications'), { title: 'Product frozen', message: `Order ${orderId} cancelled — product ${pid} has been frozen`, productId: pid, orderId, createdAt: serverTimestamp(), read: false, type: 'product_frozen' }); } catch (e) { console.warn('Failed to create notification for frozen product', pid, e); }
                }
              }
            }
          } catch (e) {
            console.warn('Error processing order change:', e);
          }
        });
      });
      // store unsubscribe so we can cleanup on unmount
      // save to state so fetchOrders remains simple; here we just return unsubscribe
      return unsubscribe;
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

  const getOrderItems = (order) => {
    if (!order) return [];
    if (Array.isArray(order.items) && order.items.length) return order.items;
    if (Array.isArray(order.lineItems) && order.lineItems.length) return order.lineItems;
    // fallback to single-item shape
    return [{ name: order.productName || order.product || 'Product', quantity: order.quantity || 1, price: order.price || order.unitPrice || 0 }];
  };

  const computeSubtotal = (order) => {
    const items = getOrderItems(order);
    return items.reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (String(newStatus).toLowerCase() === 'cancelled') {
        updates.cancelledAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'orders', orderId), updates);
      toast.success('Order status updated!');
      // Optionally deduct stock when marking delivered
      if (deductStockOnUpdate && newStatus === 'Delivered') {
        const ord = orders.find(o => o.id === orderId);
        if (ord?.productId) {
          adjustProductStock(ord.productId, -1 * (ord.quantity || 1));
        }
      }
      // If order was cancelled, freeze associated products and notify admins
      if (String(newStatus).toLowerCase() === 'cancelled') {
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
                console.warn('Failed to freeze product', pid, e);
              }
              try {
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
          console.warn('Failed to process cancellation freeze step', e);
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S/N</th>
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
                {sortedOrders.map((order, idx) => (
                    <tr key={order.id} className="order-row">
                      <td className="order-cell">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                      <td className="order-cell">{idx + 1}</td>
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
                          <button
                            className="admin-btn"
                            title="Full detail"
                            onClick={() => { setSelectedOrderDetail(order); setShowOrderDetail(true); }}
                            style={{ minWidth: 100, padding: '8px 12px', fontSize: '0.9rem', marginLeft: 6 }}
                          >
                            Full detail
                          </button>
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

      {/* Full Order Detail modal / panel */}
      {showOrderDetail && selectedOrderDetail && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#ffffff', zIndex: 9999, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ width: '90%', maxWidth: 1000, maxHeight: '100%', overflowY: 'auto', backgroundColor: '#ffffff', border: '1px solid #e6e6e6', margin: '28px auto', padding: 24, boxShadow: '0 6px 24px rgba(0,0,0,0.12)', color: '#000', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Order Details — {selectedOrderDetail.id}</h2>
              <button onClick={() => setShowOrderDetail(false)} style={{ fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, color: '#111' }}>
              <div style={{ flex: 1, background: '#fff', padding: 12, borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <h3 style={{ marginTop: 0 }}>Customer</h3>
                <div style={{ marginBottom: 6 }}><strong>Name:</strong> {selectedOrderDetail.customerName}</div>
                <div style={{ marginBottom: 6 }}><strong>Phone:</strong> {selectedOrderDetail.phone}</div>
                <div style={{ marginBottom: 6 }}><strong>Email:</strong> {selectedOrderDetail.email}</div>
                <div style={{ marginBottom: 6 }}><strong>Address:</strong> {selectedOrderDetail.address}</div>
                <div style={{ marginTop: 8 }}>
                  <h4 style={{ margin: '8px 0' }}>Items</h4>
                  {getOrderItems(selectedOrderDetail).map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div><strong style={{ fontSize: 14 }}>{it.name}</strong><div style={{ fontSize: 12, color: '#555' }}>{it.sku ? `SKU: ${it.sku}` : null}</div></div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14 }}>x{it.quantity}</div>
                        <div style={{ fontSize: 14 }}>Rs. {(Number(it.price) || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ width: 360, background: '#fff', padding: 12, borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <h3 style={{ marginTop: 0 }}>Billing</h3>
                <div style={{ marginBottom: 6 }}><strong>Subtotal:</strong> Rs. {computeSubtotal(selectedOrderDetail).toLocaleString()}</div>
                <div style={{ marginBottom: 6 }}><strong>Discount:</strong> Rs. {(selectedOrderDetail.discountAmount || selectedOrderDetail.discount || 0).toLocaleString()}</div>
                <div style={{ marginBottom: 6 }}><strong>Offer:</strong> {selectedOrderDetail.offer || '—'}</div>
                <div style={{ marginBottom: 6 }}><strong>Tax:</strong> Rs. {(selectedOrderDetail.tax || 0).toLocaleString()}</div>
                <div style={{ marginBottom: 6 }}><strong>Delivery Method:</strong> {selectedOrderDetail.deliveryMethod || selectedOrderDetail.delivery || 'Standard'}</div>
                <div style={{ marginBottom: 6 }}><strong>Delivery Fee:</strong> Rs. {(selectedOrderDetail.deliveryFee || 0).toLocaleString()}</div>
                <div style={{ marginTop: 12, fontSize: 18, fontWeight: 700 }}>Total: Rs. {((computeSubtotal(selectedOrderDetail) - Number(selectedOrderDetail.discountAmount || selectedOrderDetail.discount || 0) + Number(selectedOrderDetail.tax || 0) + Number(selectedOrderDetail.deliveryFee || 0)).toLocaleString())}</div>
                <div style={{ marginTop: 10 }}><strong>Payment:</strong> {selectedOrderDetail.paymentMethod || '—'}</div>
                <div style={{ marginTop: 6 }}><strong>Transaction ID:</strong> {selectedOrderDetail.transactionId || selectedOrderDetail.paymentId || '—'}</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <h3>Order Notes / Meta</h3>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12 }}>{JSON.stringify(selectedOrderDetail, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;