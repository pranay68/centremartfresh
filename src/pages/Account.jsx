import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';

const Account = () => {
  const { user, userProfile, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Fetch user orders
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

        // Get recently viewed from localStorage or user profile
        const recentlyViewedData = JSON.parse(localStorage.getItem('centremart_recently_viewed') || '[]');
        setRecentlyViewed(recentlyViewedData.slice(0, 5));
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <Card.Content className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Login Required</h2>
              <p className="text-gray-600 mb-6">Please login to view your account</p>
              <Link to="/">
                <Button>Go to Home</Button>
              </Link>
            </Card.Content>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-300 rounded"></div>
              <div className="h-64 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold">Profile Information</h2>
              </Card.Header>
              <Card.Content className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-lg font-medium text-gray-900">
                    {user.displayName || userProfile?.name || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-lg font-medium text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Member Since</label>
                  <p className="text-lg font-medium text-gray-900">
                    {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                
                <div className="pt-4 space-y-2">
                  <Link to="/wishlist" className="block">
                    <Button variant="outline" className="w-full">
                      ❤️ View Wishlist
                    </Button>
                  </Link>
                  <Link to="/cart" className="block">
                    <Button variant="outline" className="w-full">
                      🛒 View Cart
                    </Button>
                  </Link>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Orders and Activity */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Orders */}
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold">Recent Orders</h2>
              </Card.Header>
              <Card.Content>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📦</div>
                    <p className="text-gray-600">No orders yet</p>
                    <Link to="/" className="inline-block mt-4">
                      <Button>Start Shopping</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{order.productName}</h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Rs. {order.price?.toLocaleString()}</span>
                          <span>{order.createdAt?.toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    {orders.length > 5 && (
                      <p className="text-center text-gray-600">
                        And {orders.length - 5} more orders...
                      </p>
                    )}
                  </div>
                )}
              </Card.Content>
            </Card>

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <Card>
                <Card.Header>
                  <h2 className="text-xl font-semibold">Recently Viewed</h2>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-2">
                    {recentlyViewed.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-gray-900">Product ID: {item.productId}</span>
                        <span className="text-sm text-gray-600">
                          {new Date(item.viewedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;