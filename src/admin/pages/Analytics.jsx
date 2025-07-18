import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Card from '../../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import Button from '../../components/ui/Button';
import "../AdminPanel.css";

// Move generator functions outside the component
const generateSalesData = (orders, dateRange) => {
  const days = parseInt(dateRange);
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayOrders = orders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = order.createdAt.toISOString().split('T')[0];
      return orderDate === dateStr;
    });

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((sum, order) => sum + (order.price || 0), 0),
    });
  }

  return data;
};

const generateCategoryData = (products) => {
  const categories = {};
  products.forEach(product => {
    const category = product.category || 'Others';
    categories[category] = (categories[category] || 0) + 1;
  });

  const colors = ['#0ea5e9', '#d946ef', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return Object.entries(categories).map(([name, value], index) => ({
    name,
    value,
    color: colors[index % colors.length],
  }));
};

const generateRevenueData = (orders) => {
  const months = {};
  orders.forEach(order => {
    if (!order.createdAt) return;
    const month = order.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    months[month] = (months[month] || 0) + (order.price || 0);
  });

  return Object.entries(months)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([month, revenue]) => ({ month, revenue }));
};

const getTopProducts = (orders, products) => {
  const productSales = {};
  orders.forEach(order => {
    const productId = order.productId;
    if (productId) {
      productSales[productId] = (productSales[productId] || 0) + 1;
    }
  });

  return Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([productId, sales]) => {
      const product = products.find(p => p.id === productId);
      return {
        id: productId,
        name: product?.name || 'Unknown Product',
        sales,
        revenue: sales * (product?.price || 0),
      };
    });
};

const Analytics = () => {
  const [analytics, setAnalytics] = useState({
    salesData: [],
    categoryData: [],
    revenueData: [],
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (ordersSnapshot) => {
      const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() }));
      const unsubProducts = onSnapshot(collection(db, 'products'), (productsSnapshot) => {
        const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const salesData = generateSalesData(orders, dateRange);
        const categoryData = generateCategoryData(products);
        const revenueData = generateRevenueData(orders);
        const topProducts = getTopProducts(orders, products);
        setAnalytics({ salesData, categoryData, revenueData, topProducts });
        setLoading(false);
      });
      // Clean up products listener
      return () => unsubProducts();
    });
    return () => unsubOrders();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Sales Trend</h3>
          </Card.Header>
          <Card.Content>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Revenue Trend</h3>
          </Card.Header>
          <Card.Content>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#d946ef" />
              </BarChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Products by Category</h3>
          </Card.Header>
          <Card.Content>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Top Selling Products</h3>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              {analytics.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.sales} sales</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">Rs. {product.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold">Monthly Revenue</h3>
        </Card.Header>
        <Card.Content>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analytics.revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Analytics;
