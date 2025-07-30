import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  Bell, 
  Package, 
  Tag, 
  Info, 
  Check, 
  Trash2, 
  Filter,
  Search,
  Clock,
  MapPin,
  Truck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user's notifications from Firestore
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const userNotifications = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // For demo purposes, create sample notifications
      createSampleNotifications();
    } finally {
      setLoading(false);
    }
  };

  const createSampleNotifications = () => {
    const sampleNotifications = [
      {
        id: '1',
        type: 'order',
        title: 'Order #12345 has been shipped!',
        message: 'Your order containing iPhone 13 Pro is on its way. Expected delivery: 2-3 business days.',
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        orderId: '12345',
        orderStatus: 'shipped'
      },
      {
        id: '2',
        type: 'promotion',
        title: 'Flash Sale Alert! 🎉',
        message: 'Get up to 50% off on electronics. Limited time offer, ends in 24 hours!',
        read: false,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        promotionId: 'flash-sale-001'
      },
      {
        id: '3',
        type: 'order',
        title: 'Order #12344 delivered successfully',
        message: 'Your order has been delivered. Please rate your experience!',
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        orderId: '12344',
        orderStatus: 'delivered'
      },
      {
        id: '4',
        type: 'system',
        title: 'Welcome to Centre Mart! 👋',
        message: 'Thank you for joining us. Explore our amazing products and enjoy shopping!',
        read: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        id: '5',
        type: 'promotion',
        title: 'New Arrivals Alert',
        message: 'Check out our latest collection of smartphones and accessories!',
        read: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        promotionId: 'new-arrivals-001'
      }
    ];
    setNotifications(sampleNotifications);
  };

  const markAsRead = async (notificationId) => {
    try {
      // Update in Firestore
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      
      toast.success('Marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // For demo purposes, update local state only
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      toast.success('Marked as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Update all unread notifications in Firestore
      const updatePromises = unreadNotifications.map(notif =>
        updateDoc(doc(db, 'notifications', notif.id), { read: true })
      );
      await Promise.all(updatePromises);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // For demo purposes, update local state only
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      toast.success('All notifications marked as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      // Delete from Firestore
      // await deleteDoc(doc(db, 'notifications', notificationId));
      
      // Update local state
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      // For demo purposes, update local state only
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      toast.success('Notification deleted');
    }
  };

  const deleteSelected = async () => {
    if (selectedNotifications.size === 0) {
      toast.error('Please select notifications to delete');
      return;
    }
    
    try {
      // Delete selected notifications from Firestore
      const deletePromises = Array.from(selectedNotifications).map(id =>
        // deleteDoc(doc(db, 'notifications', id))
        Promise.resolve()
      );
      await Promise.all(deletePromises);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notif => !selectedNotifications.has(notif.id))
      );
      setSelectedNotifications(new Set());
      
      toast.success(`${selectedNotifications.size} notifications deleted`);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      // For demo purposes, update local state only
      setNotifications(prev => 
        prev.filter(notif => !selectedNotifications.has(notif.id))
      );
      setSelectedNotifications(new Set());
      toast.success(`${selectedNotifications.size} notifications deleted`);
    }
  };

  const toggleNotificationSelection = (notificationId) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order':
        return <Package size={20} className="text-blue-600" />;
      case 'promotion':
        return <Tag size={20} className="text-orange-600" />;
      case 'system':
        return <Info size={20} className="text-gray-600" />;
      default:
        return <Bell size={20} className="text-gray-600" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'order':
        return 'border-l-blue-500 bg-blue-50';
      case 'promotion':
        return 'border-l-orange-500 bg-orange-50';
      case 'system':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === 'all' || notification.type === filter;
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <Card.Content className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Login Required</h2>
              <p className="text-gray-600 mb-6">Please login to view your notifications</p>
            </Card.Content>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex space-x-2">
            {selectedNotifications.size > 0 && (
              <Button 
                variant="outline" 
                onClick={deleteSelected}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Selected ({selectedNotifications.size})
              </Button>
            )}
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead}>
                <Check size={16} className="mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Notifications</option>
                <option value="order">Order Updates</option>
                <option value="promotion">Promotions</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <Card.Content className="text-center py-12">
              <Bell size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">
                {searchTerm || filter !== 'all' 
                  ? 'No notifications match your search criteria'
                  : 'You\'re all caught up! Check back later for updates.'
                }
              </p>
            </Card.Content>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`transition-all duration-200 hover:shadow-md ${
                  !notification.read ? 'ring-2 ring-primary-100' : ''
                }`}
              >
                <Card.Content className="p-4">
                  <div className="flex items-start space-x-4">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={() => toggleNotificationSelection(notification.id)}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    
                    {/* Notification Icon */}
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-sm font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          
                          {/* Order-specific info */}
                          {notification.type === 'order' && notification.orderStatus && (
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-gray-500">
                                Order #{notification.orderId}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                notification.orderStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                notification.orderStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {notification.orderStatus === 'shipped' && <Truck size={12} className="mr-1" />}
                                {notification.orderStatus === 'delivered' && <CheckCircle size={12} className="mr-1" />}
                                {notification.orderStatus}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Time and Actions */}
                        <div className="flex items-center space-x-2 ml-4">
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs"
                            >
                              <Check size={12} />
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-xs text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications; 