import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import StatsCard from '../components/StatsCard';
import Card from '../../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { getAllProductsIncludingCustom } from '../../utils/productOperations';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load products from local database
    const loadProducts = () => {
      try {
        const products = getAllProductsIncludingCustom();
        const totalProducts = products.length;
        setStats(prev => ({ ...prev, totalProducts }));
      } catch (error) {
        console.error('Products loading error:', error);
        setLoading(false);
      }
    };
    loadProducts();
    // Real-time orders
    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (ordersSnapshot) => {
        const orders = ordersSnapshot.docs.map(doc => {
          const data = doc.data() || {};
          let createdAt = data.createdAt;
          if (createdAt?.toDate) {
            createdAt = createdAt.toDate();
          } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
            createdAt = new Date(createdAt);
          } else {
            createdAt = null;
          }
          return { id: doc.id, ...data, createdAt };
        });
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(order => order.status === 'Pending').length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.price || 0), 0);
        // Customers
        const customerMap = {};
        orders.forEach(order => {
          const orderDate = order.createdAt instanceof Date ? order.createdAt : (order.createdAt ? new Date(order.createdAt) : null);
          const key = `${order.customerName || 'Customer'}-${order.phone || ''}`;
          if (!customerMap[key]) {
            customerMap[key] = {
              name: order.customerName || 'Customer',
              phone: order.phone || '',
              lastOrder: orderDate,
            };
          }
          if (orderDate && (!customerMap[key].lastOrder || orderDate > customerMap[key].lastOrder)) {
            customerMap[key].lastOrder = orderDate;
          }
        });
        const customersData = Object.values(customerMap).sort((a, b) => (b.lastOrder?.getTime?.() || 0) - (a.lastOrder?.getTime?.() || 0));
        const totalCustomers = customersData.length;
        const recentCustomers = customersData.slice(0, 5);
        setStats(prev => ({ ...prev, totalOrders, pendingOrders, totalRevenue, totalCustomers }));
        setRecentCustomers(recentCustomers);
        // Recent orders
        const recentOrdersData = orders
          .filter(o => !!o.createdAt)
          .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0))
          .slice(0, 5);
        setRecentOrders(recentOrdersData);
        // Sales data
        const monthlyMap = {};
        orders.forEach(order => {
          if (!order.createdAt) return;
          const month = order.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          if (!monthlyMap[month]) {
            monthlyMap[month] = { month, sales: 0, orders: 0 };
          }
          monthlyMap[month].sales += order.price || 0;
          monthlyMap[month].orders += 1;
        });
        const salesData = Object.values(monthlyMap).sort((a, b) => new Date(a.month) - new Date(b.month));
        setSalesData(salesData);
        setLoading(false);
      },
      (error) => {
        console.error('Orders listener error:', error);
        setLoading(false);
      }
    );
    return () => { unsubOrders(); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'flex-end' }}>
        <Link to="/admin/delivery-settings">
          <Button variant="outline" style={{ fontWeight: 700, fontSize: '1.1rem', padding: '0.8rem 2rem', borderRadius: 12 }}>
            🚚 Manage Delivery Options & Locations
          </Button>
        </Link>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          title="Total Products"
          value={stats.totalProducts}
          icon="📦"
          color="primary"
        />
        <StatsCard
          title="Total Orders"
          value={stats.totalOrders}
          icon="🛒"
          color="success"
        />
        <StatsCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon="⏳"
          color="warning"
        />
        <StatsCard
          title="Total Revenue"
          value={`Rs. ${stats.totalRevenue.toLocaleString()}`}
          icon="💰"
          color="success"
        />
        <StatsCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon="👥"
          color="primary"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Sales Overview</h3>
          </Card.Header>
          <Card.Content>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Orders Overview</h3>
          </Card.Header>
          <Card.Content>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#d946ef" />
              </BarChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold">Recent Orders</h3>
        </Card.Header>
        <Card.Content>
          <div className="admin-table-scroll-wrapper">
            <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '1200px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {order.price?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'Delivered' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.createdAt?.toLocaleDateString?.() || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {/* Recent Customers */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold">Recent Customers</h3>
        </Card.Header>
        <Card.Content>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Order
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentCustomers.map((customer, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.lastOrder?.toLocaleDateString?.() || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Dashboard;