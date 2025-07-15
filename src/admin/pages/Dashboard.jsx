import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import StatsCard from '../components/StatsCard';
import Card from '../../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';

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
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch products count
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const totalProducts = productsSnapshot.size;

      // Fetch orders
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() }));
      
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(order => order.status === 'Pending').length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.price || 0), 0);

      // Fetch customers (grouped by name/phone)
      const customerMap = {};
      orders.forEach(order => {
        const key = `${order.customerName}-${order.phone}`;
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt;
        if (!customerMap[key]) {
          customerMap[key] = {
            name: order.customerName,
            phone: order.phone,
            lastOrder: orderDate,
          };
        }
        if (!customerMap[key].lastOrder || orderDate > customerMap[key].lastOrder) {
          customerMap[key].lastOrder = orderDate;
        }
      });
      const customersData = Object.values(customerMap).sort((a, b) => b.lastOrder - a.lastOrder);
      const totalCustomers = customersData.length;
      const recentCustomers = customersData.slice(0, 5);

      // Recent orders
      const recentOrdersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
      const recentOrdersData = recentOrdersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Generate real sales data (monthly revenue and order count)
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
      // Sort months chronologically
      const salesData = Object.values(monthlyMap).sort((a, b) => new Date(a.month) - new Date(b.month));

      setStats({ totalProducts, totalOrders, pendingOrders, totalRevenue, totalCustomers });
      setRecentOrders(recentOrdersData);
      setRecentCustomers(recentCustomers);
      setSalesData(salesData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
                      {order.createdAt?.toLocaleDateString()}
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
                      {customer.lastOrder?.toLocaleDateString() || 'N/A'}
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