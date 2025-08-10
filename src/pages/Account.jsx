import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { updateProfile } from 'firebase/auth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Link } from 'react-router-dom';
import { 
  User, 
  Package, 
  Settings, 
  MapPin, 
  Heart, 
  Edit3, 
  Save, 
  X,
  Eye,
  EyeOff,
  Phone,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';

const Account = () => {
  const { user, userProfile, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    email: ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Address management
  const [addresses, setAddresses] = useState([]);
  const [editingAddress, setEditingAddress] = useState(null);
  const [newAddress, setNewAddress] = useState({
    type: 'home',
    name: '',
    phone: '',
    address: '',
    additionalInfo: ''
  });

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [unreviewedProducts, setUnreviewedProducts] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [selectedProductForReview, setSelectedProductForReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 0, text: '', media: [] });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch user reviews
  useEffect(() => {
    if (!user) return;
    const reviewsQuery = query(
      collection(db, 'productReviews'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(reviewsQuery, (snap) => {
      setUserReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  // Find unreviewed products
  useEffect(() => {
    if (!orders.length) return;
    const reviewedProductIds = new Set(userReviews.map(r => r.productId));
    const unreviewed = orders.filter(o => !reviewedProductIds.has(o.productId));
    setUnreviewedProducts(unreviewed);
  }, [orders, userReviews]);

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
        const userOrders = ordersSnapshot.docs.map(doc => {
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
        setOrders(userOrders);

        // Get recently viewed from localStorage or user profile
        const recentlyViewedData = JSON.parse(localStorage.getItem('centremart_recently_viewed') || '[]');
        setRecentlyViewed(recentlyViewedData.slice(0, 5));
        
        // Load addresses
        if (userProfile?.addresses) {
          setAddresses(userProfile.addresses);
        }
        
        // Initialize profile form
        setProfileForm({
          name: user.displayName || userProfile?.name || '',
          phone: userProfile?.phone || '',
          email: user.email || ''
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, userProfile]);

  const handleProfileSave = async () => {
    try {
      // Update Firebase Auth display name
      await updateProfile(user, { displayName: profileForm.name });
      
      // Update Firestore user profile
      await updateDoc(doc(db, 'users', user.uid), {
        name: profileForm.name,
        phone: profileForm.phone
      });
      
      toast.success('Profile updated successfully!');
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      // Note: Firebase requires re-authentication for password change
      // This is a simplified version - in production, you'd need to re-authenticate
      toast.success('Password change feature requires re-authentication');
      setEditingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.name || !newAddress.phone || !newAddress.address) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const addressToAdd = {
        id: Date.now().toString(),
        ...newAddress,
        createdAt: new Date()
      };
      
      const updatedAddresses = [...addresses, addressToAdd];
      await updateDoc(doc(db, 'users', user.uid), {
        addresses: updatedAddresses
      });
      
      setAddresses(updatedAddresses);
      setNewAddress({ type: 'home', name: '', phone: '', address: '', additionalInfo: '' });
      toast.success('Address added successfully!');
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    }
  };

  const handleEditAddress = async (addressId) => {
    try {
      const updatedAddresses = addresses.map(addr => 
        addr.id === addressId ? editingAddress : addr
      );
      
      await updateDoc(doc(db, 'users', user.uid), {
        addresses: updatedAddresses
      });
      
      setAddresses(updatedAddresses);
      setEditingAddress(null);
      toast.success('Address updated successfully!');
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Failed to update address');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      await updateDoc(doc(db, 'users', user.uid), {
        addresses: updatedAddresses
      });
      
      setAddresses(updatedAddresses);
      toast.success('Address deleted successfully!');
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleMediaUpload = async (files) => {
    const urls = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'YOUR_CLOUDINARY_PRESET');
      const res = await fetch('https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/auto/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      urls.push(data.secure_url);
    }
    return urls;
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.rating || !reviewForm.text || !selectedProductForReview) return;
    setSubmittingReview(true);
    let mediaUrls = [];
    if (reviewForm.media.length > 0) {
      mediaUrls = await handleMediaUpload(reviewForm.media);
    }
    await addDoc(collection(db, 'productReviews'), {
      productId: selectedProductForReview.productId,
      userId: user.uid,
      userName: user.displayName || user.email || 'Anonymous',
      rating: reviewForm.rating,
      text: reviewForm.text,
      media: mediaUrls,
      createdAt: new Date(),
      verified: true
    });
    setReviewForm({ rating: 0, text: '', media: [] });
    setSelectedProductForReview(null);
    setSubmittingReview(false);
    setShowReviewModal(false);
  };

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

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 mb-8 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Profile Information */}
              <Card>
                <Card.Header>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Profile Information</h2>
                    {!editingProfile ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingProfile(true)}
                      >
                        <Edit3 size={16} className="mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button 
                          size="sm"
                          onClick={handleProfileSave}
                        >
                          <Save size={16} className="mr-2" />
                          Save
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingProfile(false)}
                        >
                          <X size={16} className="mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </Card.Header>
                <Card.Content className="space-y-4">
                  {editingProfile ? (
                    <div className="space-y-4">
                      <Input
                        label="Full Name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                      />
                      <Input
                        label="Phone Number"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      />
                      <Input
                        label="Email"
                        value={profileForm.email}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
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
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                        <p className="text-lg font-medium text-gray-900">
                          {userProfile?.phone || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Member Since</label>
                        <p className="text-lg font-medium text-gray-900">
                          {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </Card.Content>
              </Card>

              {/* Password Change */}
              <Card>
                <Card.Header>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Change Password</h2>
                    {!editingPassword ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingPassword(true)}
                      >
                        <Edit3 size={16} className="mr-2" />
                        Change
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button 
                          size="sm"
                          onClick={handlePasswordChange}
                        >
                          <Save size={16} className="mr-2" />
                          Update
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingPassword(false);
                            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          }}
                        >
                          <X size={16} className="mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </Card.Header>
                <Card.Content>
                  {editingPassword ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <Input
                          label="Current Password"
                          type={showPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          label="New Password"
                          type={showPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        />
                      </div>
                      <div className="relative">
                        <Input
                          label="Confirm New Password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">Click "Change" to update your password</p>
                  )}
                </Card.Content>
              </Card>
            </div>
          )}

          {/* Addresses Tab */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">My Addresses</h2>
                <Button onClick={() => setNewAddress({ type: 'home', name: '', phone: '', address: '', additionalInfo: '' })}>
                  + Add Address
                </Button>
              </div>

              {/* Add New Address */}
              {newAddress.name || newAddress.phone || newAddress.address ? (
                <Card>
                  <Card.Header>
                    <h3 className="text-lg font-semibold">Add New Address</h3>
                  </Card.Header>
                  <Card.Content>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex gap-2">
                        {['home', 'office', 'other'].map(type => (
                          <button
                            key={type}
                            type="button"
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              newAddress.type === type
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            onClick={() => setNewAddress({...newAddress, type})}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                      <Input
                        label="Full Name"
                        value={newAddress.name}
                        onChange={(e) => setNewAddress({...newAddress, name: e.target.value})}
                      />
                      <Input
                        label="Phone Number"
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                      />
                      <Input
                        label="Address"
                        value={newAddress.address}
                        onChange={(e) => setNewAddress({...newAddress, address: e.target.value})}
                      />
                      <Input
                        label="Additional Info"
                        value={newAddress.additionalInfo}
                        onChange={(e) => setNewAddress({...newAddress, additionalInfo: e.target.value})}
                        placeholder="Landmark, instructions, etc."
                      />
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button onClick={handleAddAddress}>Save Address</Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setNewAddress({ type: 'home', name: '', phone: '', address: '', additionalInfo: '' })}
                      >
                        Cancel
                      </Button>
                    </div>
                  </Card.Content>
                </Card>
              ) : null}

              {/* Existing Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map((address) => (
                  <Card key={address.id}>
                    <Card.Header>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <MapPin size={16} />
                          <span className="font-medium capitalize">{address.type}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingAddress(address)}
                          >
                            <Edit3 size={14} />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteAddress(address.id)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card.Header>
                    <Card.Content>
                      {editingAddress?.id === address.id ? (
                        <div className="space-y-3">
                          <Input
                            label="Name"
                            value={editingAddress.name}
                            onChange={(e) => setEditingAddress({...editingAddress, name: e.target.value})}
                          />
                          <Input
                            label="Phone"
                            value={editingAddress.phone}
                            onChange={(e) => setEditingAddress({...editingAddress, phone: e.target.value})}
                          />
                          <Input
                            label="Address"
                            value={editingAddress.address}
                            onChange={(e) => setEditingAddress({...editingAddress, address: e.target.value})}
                          />
                          <Input
                            label="Additional Info"
                            value={editingAddress.additionalInfo}
                            onChange={(e) => setEditingAddress({...editingAddress, additionalInfo: e.target.value})}
                          />
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={() => handleEditAddress(address.id)}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingAddress(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="font-medium">{address.name}</p>
                          <p className="text-gray-600">{address.phone}</p>
                          <p className="text-gray-600">{address.address}</p>
                          {address.additionalInfo && (
                            <p className="text-gray-500 text-sm">{address.additionalInfo}</p>
                          )}
                        </div>
                      )}
                    </Card.Content>
                  </Card>
                ))}
              </div>

              {addresses.length === 0 && (
                <Card>
                  <Card.Content className="text-center py-8">
                    <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No addresses yet</h3>
                    <p className="text-gray-600 mb-4">Add your delivery addresses for faster checkout</p>
                    <Button onClick={() => setNewAddress({ type: 'home', name: '', phone: '', address: '', additionalInfo: '' })}>
                      Add Your First Address
                    </Button>
                  </Card.Content>
                </Card>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold">My Orders</h2>
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map((order) => (
                          <tr key={order.id} className="hover:bg-primary-50 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                            <td className="px-4 py-2 font-mono text-xs text-primary-700">#{order.id.slice(-6)}</td>
                            <td className="px-4 py-2">{order.createdAt?.toLocaleDateString()}</td>
                            <td className="px-4 py-2">
                              {order.items ? order.items.map((item, idx) => (
                                <span key={idx} className="block text-xs text-gray-700">{item.productName} x{item.quantity}</span>
                              )) : (
                                <span className="text-xs text-gray-700">{order.productName} x{order.quantity || 1}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 font-semibold">Rs. {(order.totalAmount || (order.price * (order.quantity || 1) || order.price)).toLocaleString()}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card.Content>
            </Card>
          )}
          {/* Order Detail Modal */}
          {selectedOrder && (
            <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)}>
              <div className="p-6 max-w-lg mx-auto">
                <h2 className="text-xl font-bold mb-2">Order #{selectedOrder.id.slice(-6)}</h2>
                <div className="mb-4 text-sm text-gray-600">Placed on: {selectedOrder.createdAt?.toLocaleDateString()}</div>
                {/* Status Tracker */}
                <div className="flex items-center justify-between mb-6">
                  {['Pending','Processing','Shipped','Delivered','Cancelled'].map((status, idx) => (
                    <div key={status} className="flex-1 flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white mb-1 ${selectedOrder.status === status ? 'bg-primary-600' : 'bg-gray-300'}`}>{idx+1}</div>
                      <span className={`text-xs ${selectedOrder.status === status ? 'text-primary-700 font-semibold' : 'text-gray-500'}`}>{status}</span>
                      {idx < 4 && <div className={`h-1 w-full ${selectedOrder.status === status ? 'bg-primary-600' : 'bg-gray-200'}`}></div>}
                    </div>
                  ))}
                </div>
                {/* Order Items */}
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Items</h3>
                  <ul className="space-y-2">
                    {selectedOrder.items ? selectedOrder.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-sm">
                        <span>{item.productName} x{item.quantity}</span>
                        <span>Rs. {(item.price * item.quantity).toLocaleString()}</span>
                      </li>
                    )) : (
                      <li className="flex justify-between text-sm">
                        <span>{selectedOrder.productName} x{selectedOrder.quantity || 1}</span>
                        <span>Rs. {(selectedOrder.price * (selectedOrder.quantity || 1)).toLocaleString()}</span>
                      </li>
                    )}
                  </ul>
                </div>
                {/* Delivery Info */}
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Delivery Info</h3>
                  <div className="text-sm text-gray-700">
                    <div><span className="font-medium">Address:</span> {selectedOrder.deliveryAddress || selectedOrder.address}</div>
                    <div><span className="font-medium">Phone:</span> {selectedOrder.phone}</div>
                    {selectedOrder.trackingNumber && (
                      <div><span className="font-medium">Tracking:</span> {selectedOrder.trackingNumber}</div>
                    )}
                  </div>
                </div>
                {/* Payment Info */}
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Payment</h3>
                  <div className="text-sm text-gray-700">
                    <div><span className="font-medium">Method:</span> {selectedOrder.paymentMethod || 'N/A'}</div>
                    <div><span className="font-medium">Total:</span> Rs. {(selectedOrder.totalAmount || (selectedOrder.price * (selectedOrder.quantity || 1) || selectedOrder.price)).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Wishlist Tab */}
          {activeTab === 'wishlist' && (
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold">My Wishlist</h2>
              </Card.Header>
              <Card.Content>
                <div className="text-center py-8">
                  <Heart size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
                  <p className="text-gray-600 mb-4">Start adding products to your wishlist</p>
                  <Link to="/">
                    <Button>Browse Products</Button>
                  </Link>
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold">Account Settings</h2>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium">Email Notifications</h3>
                      <p className="text-sm text-gray-600">Receive updates about your orders</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium">SMS Notifications</h3>
                      <p className="text-sm text-gray-600">Get order updates via SMS</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium">Marketing Emails</h3>
                      <p className="text-sm text-gray-600">Receive promotional offers and updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>
      <Button className="rate-review-btn" onClick={() => setShowReviewModal(true)}>
        Rate & Review
      </Button>
      <Modal open={showReviewModal} onClose={() => { setShowReviewModal(false); setSelectedProductForReview(null); }}>
        <div className="review-modal-content">
          <h2>Rate & Review Your Purchases</h2>
          {selectedProductForReview ? (
            <form className="review-form" onSubmit={handleReviewSubmit}>
              <div className="review-product-info">
                <img src={selectedProductForReview.productImageURL || 'https://via.placeholder.com/60'} alt={selectedProductForReview.productName} className="unreviewed-product-img" />
                <div>
                  <div className="unreviewed-product-name">{selectedProductForReview.productName}</div>
                  <div className="unreviewed-product-date">Ordered: {selectedProductForReview.createdAt?.toLocaleDateString?.()}</div>
                </div>
              </div>
              <div className="review-stars">
                {[1,2,3,4,5].map(star => (
                  <span key={star} className={reviewForm.rating >= star ? 'star-filled' : 'star-empty'} onClick={() => setReviewForm(f => ({...f, rating: star}))}>★</span>
                ))}
              </div>
              <textarea className="review-textarea" placeholder="Write your review..." value={reviewForm.text} onChange={e => setReviewForm(f => ({...f, text: e.target.value}))} />
              <input type="file" accept="image/*,video/*" multiple onChange={e => setReviewForm(f => ({...f, media: Array.from(e.target.files)}))} />
              <button className="review-submit-btn" type="submit" disabled={submittingReview || !reviewForm.rating || !reviewForm.text}>Submit Review</button>
              <button type="button" className="review-cancel-btn" onClick={() => setSelectedProductForReview(null)} disabled={submittingReview}>Cancel</button>
            </form>
          ) : (
            <>
              {unreviewedProducts.length === 0 ? (
                <div className="no-unreviewed">You have reviewed all your purchases!</div>
              ) : (
                <ul className="unreviewed-list">
                  {unreviewedProducts.map(order => (
                    <li key={order.id} className="unreviewed-item">
                      <div className="unreviewed-product-info">
                        <img src={order.productImageURL || 'https://via.placeholder.com/60'} alt={order.productName} className="unreviewed-product-img" />
                        <div>
                          <div className="unreviewed-product-name">{order.productName}</div>
                          <div className="unreviewed-product-date">Ordered: {order.createdAt?.toLocaleDateString?.()}</div>
                        </div>
                      </div>
                      <Button onClick={() => setSelectedProductForReview(order)}>
                        Write Review
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Account;