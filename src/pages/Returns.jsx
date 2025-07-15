import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Package, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Truck,
  CreditCard,
  FileText,
  Camera,
  Upload,
  Plus,
  ArrowLeft,
  Calendar,
  MapPin
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

const Returns = () => {
  const { user } = useAuth();
  const [returns, setReturns] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnForm, setReturnForm] = useState({
    reason: '',
    description: '',
    returnType: 'refund',
    pickupAddress: '',
    images: []
  });

  const returnReasons = [
    'Defective Product',
    'Wrong Item Received',
    'Size/Fit Issues',
    'Not as Described',
    'Changed Mind',
    'Quality Issues',
    'Missing Parts',
    'Other'
  ];

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load user orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        where('status', '==', 'delivered'),
        orderBy('createdAt', 'desc')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const userOrders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setUserOrders(userOrders);

      // Load user returns
      const returnsQuery = query(
        collection(db, 'returns'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const returnsSnapshot = await getDocs(returnsQuery);
      const userReturns = returnsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setReturns(userReturns);
    } catch (error) {
      console.error('Error loading user data:', error);
      // For demo purposes, create sample data
      createSampleData();
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = () => {
    const sampleOrders = [
      {
        id: 'order1',
        productName: 'iPhone 13 Pro',
        productId: 'iphone13',
        price: 150000,
        status: 'delivered',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'order2',
        productName: 'Nike Air Max',
        productId: 'nike-air',
        price: 12000,
        status: 'delivered',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ];

    const sampleReturns = [
      {
        id: 'return1',
        orderId: 'order1',
        productName: 'iPhone 13 Pro',
        reason: 'Defective Product',
        status: 'approved',
        returnType: 'refund',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        refundAmount: 150000,
        trackingNumber: 'RET123456789'
      },
      {
        id: 'return2',
        orderId: 'order2',
        productName: 'Nike Air Max',
        reason: 'Size/Fit Issues',
        status: 'pending',
        returnType: 'exchange',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    setUserOrders(sampleOrders);
    setReturns(sampleReturns);
  };

  const handleInitiateReturn = async () => {
    if (!selectedOrder) {
      toast.error('Please select an order to return');
      return;
    }

    if (!returnForm.reason || !returnForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const returnData = {
        orderId: selectedOrder.id,
        productId: selectedOrder.productId,
        productName: selectedOrder.productName,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        reason: returnForm.reason,
        description: returnForm.description,
        returnType: returnForm.returnType,
        pickupAddress: returnForm.pickupAddress,
        status: 'pending',
        createdAt: serverTimestamp(),
        refundAmount: returnForm.returnType === 'refund' ? selectedOrder.price : 0
      };

      await addDoc(collection(db, 'returns'), returnData);
      
      // Update local state
      const newReturn = {
        id: Date.now().toString(),
        ...returnData,
        createdAt: new Date()
      };
      setReturns(prev => [newReturn, ...prev]);
      
      // Reset form
      setReturnForm({
        reason: '',
        description: '',
        returnType: 'refund',
        pickupAddress: '',
        images: []
      });
      setSelectedOrder(null);
      setShowReturnForm(false);
      
      toast.success('Return request submitted successfully!');
    } catch (error) {
      console.error('Error submitting return:', error);
      toast.error('Failed to submit return request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock };
      case 'approved': return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      case 'rejected': return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle };
      case 'processing': return { bg: 'bg-blue-100', text: 'text-blue-800', icon: RefreshCw };
      case 'completed': return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle };
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      default: return 'Unknown';
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <Card.Content className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Login Required</h2>
              <p className="text-gray-600 mb-6">Please login to manage your returns</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Returns & Refunds</h1>
            <p className="text-gray-600 mt-1">Manage your returns and track refund status</p>
          </div>
          <Button onClick={() => setShowReturnForm(true)}>
            <Plus size={16} className="mr-2" />
            Initiate Return
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Return Form */}
          {showReturnForm && (
            <div className="lg:col-span-3">
              <Card>
                <Card.Header>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Initiate Return</h2>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowReturnForm(false);
                        setSelectedOrder(null);
                        setReturnForm({
                          reason: '',
                          description: '',
                          returnType: 'refund',
                          pickupAddress: '',
                          images: []
                        });
                      }}
                    >
                      <ArrowLeft size={16} className="mr-2" />
                      Cancel
                    </Button>
                  </div>
                </Card.Header>
                <Card.Content>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Order Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Order to Return
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {userOrders.map(order => (
                          <div
                            key={order.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedOrder?.id === order.id
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedOrder(order)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-gray-900">{order.productName}</h4>
                                <p className="text-sm text-gray-600">
                                  Delivered {formatTimeAgo(order.deliveredAt)}
                                </p>
                                <p className="text-sm font-medium text-green-600">
                                  Rs. {order.price?.toLocaleString()}
                                </p>
                              </div>
                              {selectedOrder?.id === order.id && (
                                <CheckCircle size={16} className="text-primary-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {userOrders.length === 0 && (
                        <p className="text-gray-500 text-sm">No delivered orders available for return</p>
                      )}
                    </div>

                    {/* Return Details */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Return Reason *
                        </label>
                        <select
                          value={returnForm.reason}
                          onChange={(e) => setReturnForm({...returnForm, reason: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select a reason</option>
                          {returnReasons.map(reason => (
                            <option key={reason} value={reason}>{reason}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Return Type
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="refund"
                              checked={returnForm.returnType === 'refund'}
                              onChange={(e) => setReturnForm({...returnForm, returnType: e.target.value})}
                              className="mr-2"
                            />
                            <CreditCard size={16} className="mr-1" />
                            Refund
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="exchange"
                              checked={returnForm.returnType === 'exchange'}
                              onChange={(e) => setReturnForm({...returnForm, returnType: e.target.value})}
                              className="mr-2"
                            />
                            <RefreshCw size={16} className="mr-1" />
                            Exchange
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description *
                        </label>
                        <textarea
                          value={returnForm.description}
                          onChange={(e) => setReturnForm({...returnForm, description: e.target.value})}
                          rows={3}
                          placeholder="Please describe the issue in detail..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pickup Address
                        </label>
                        <textarea
                          value={returnForm.pickupAddress}
                          onChange={(e) => setReturnForm({...returnForm, pickupAddress: e.target.value})}
                          rows={2}
                          placeholder="Enter your pickup address..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <Button 
                        onClick={handleInitiateReturn}
                        disabled={!selectedOrder || !returnForm.reason || !returnForm.description}
                        className="w-full"
                      >
                        <Package size={16} className="mr-2" />
                        Submit Return Request
                      </Button>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </div>
          )}

          {/* Return History */}
          <div className="lg:col-span-2">
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold">Return History</h2>
              </Card.Header>
              <Card.Content>
                {returns.length === 0 ? (
                  <div className="text-center py-8">
                    <Package size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No returns yet</h3>
                    <p className="text-gray-600 mb-4">Start a return for any delivered order</p>
                    <Button onClick={() => setShowReturnForm(true)}>
                      Initiate Return
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {returns.map((returnItem) => {
                      const statusInfo = getStatusColor(returnItem.status);
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <div key={returnItem.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium text-gray-900">{returnItem.productName}</h4>
                              <p className="text-sm text-gray-600">
                                Requested {formatTimeAgo(returnItem.createdAt)}
                              </p>
                            </div>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                              <StatusIcon size={12} className="mr-1" />
                              {getStatusText(returnItem.status)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Reason:</span>
                              <p className="font-medium">{returnItem.reason}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Type:</span>
                              <p className="font-medium capitalize">{returnItem.returnType}</p>
                            </div>
                            {returnItem.refundAmount > 0 && (
                              <div>
                                <span className="text-gray-600">Refund:</span>
                                <p className="font-medium text-green-600">
                                  Rs. {returnItem.refundAmount?.toLocaleString()}
                                </p>
                              </div>
                            )}
                            {returnItem.trackingNumber && (
                              <div>
                                <span className="text-gray-600">Tracking:</span>
                                <p className="font-medium">{returnItem.trackingNumber}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>

          {/* Return Policy */}
          <div className="lg:col-span-1">
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold">Return Policy</h2>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Clock size={16} className="text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">Time Limit</h4>
                      <p className="text-gray-600">30 days from delivery date</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Package size={16} className="text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">Condition</h4>
                      <p className="text-gray-600">Original packaging and unused condition</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CreditCard size={16} className="text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">Refund</h4>
                      <p className="text-gray-600">Processed within 5-7 business days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Truck size={16} className="text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">Pickup</h4>
                      <p className="text-gray-600">Free pickup service available</p>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Returns; 