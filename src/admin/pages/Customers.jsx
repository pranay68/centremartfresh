import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import "../AdminPanel.css";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
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
        return {
          id: doc.id,
          ...data,
          createdAt
        };
      });

      // Group orders by real user if possible, fallback to legacy/guest
      const customerMap = {};
      orders.forEach(order => {
        // Prefer userId or userEmail for grouping, fallback to name+phone
        let key = null;
        if (order.userId || order.userEmail) {
          key = order.userId ? `uid:${order.userId}` : `email:${order.userEmail}`;
        } else {
          key = `${order.customerName || order.name || 'Guest'}-${order.phone || order.email || ''}`;
        }
        if (!customerMap[key]) {
          customerMap[key] = {
            name: order.userName || order.customerName || order.name || 'Guest',
            email: order.userEmail || order.email || '',
            phone: order.phone || '',
            address: order.address || order.deliveryAddress || '',
            orders: [],
            totalSpent: 0,
            lastOrder: null,
            isGuest: !(order.userId || order.userEmail),
            userId: order.userId || null,
          };
        }
        customerMap[key].orders.push(order);
        const lineTotal = (order.total ?? order.amount ?? order.price ?? 0);
        const qty = (order.quantity ?? order.qty ?? 1);
        customerMap[key].totalSpent += Number(lineTotal) * Number(qty);
        if (!customerMap[key].lastOrder || (order.createdAt && order.createdAt > customerMap[key].lastOrder)) {
          customerMap[key].lastOrder = order.createdAt;
        }
      });

      // Enrich with user profiles when available
      const usersToFetch = Array.from(new Set(
        Object.values(customerMap)
          .map(c => c.userId)
          .filter(Boolean)
      ));
      if (usersToFetch.length) {
        const { doc, getDoc } = await import('firebase/firestore');
        await Promise.all(usersToFetch.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              const profile = userDoc.data();
              const key = `uid:${uid}`;
              const existing = customerMap[key];
              if (existing) {
                customerMap[key] = {
                  ...existing,
                  name: existing.name || profile.name || profile.displayName || existing.name,
                  email: existing.email || profile.email || existing.email,
                  phone: existing.phone || profile.phone || profile.phoneNumber || existing.phone,
                  address: existing.address || profile.address || existing.address,
                };
              }
            }
          } catch (_) {}
        }));
      }

      const customersData = Object.values(customerMap)
        .map(c => ({
          ...c,
          orders: c.orders.sort((a,b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0))
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
        <div className="text-sm text-gray-600">
          Total Customers: {customers.length}
        </div>
      </div>

      {/* Search */}
      <Card>
        <Card.Content className="p-4">
          <Input
            placeholder="Search customers by name, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Card.Content>
      </Card>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer, index) => (
          <Card key={`${customer.email || customer.name}-${customer.phone}`} hover>
            <Card.Content className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {customer.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                    {customer.email && (
                      <p className="text-xs text-gray-500">{customer.email}</p>
                    )}
                    <p className="text-sm text-gray-600">{customer.phone}</p>
                    {customer.isGuest && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 ml-1">Guest</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary-600">
                    #{index + 1}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-sm font-medium text-gray-900">{customer.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-lg font-bold text-gray-900">{customer.orders.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Spent</p>
                    <p className="text-lg font-bold text-green-600">
                      Rs. {customer.totalSpent.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Last Order</p>
                  <p className="text-sm font-medium text-gray-900">
                    {customer.lastOrder?.toLocaleDateString() || 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Recent Orders</p>
                  <div className="mt-1 space-y-1">
                    {customer.orders.slice(0, 3).map((order, idx) => (
                      <div key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {order.productName} - Rs. {order.price?.toLocaleString()}
                      </div>
                    ))}
                    {customer.orders.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{customer.orders.length - 3} more orders
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No customers found</p>
        </div>
      )}
    </div>
  );
};

export default Customers;