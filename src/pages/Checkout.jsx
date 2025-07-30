<<<<<<< HEAD
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, addDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext'; // Using CartContext for cart items
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import notificationSystem from '../utils/notificationSystem';
import toast from 'react-hot-toast';
import './Checkout.css';

// --- Sub-components for better organization ---

const AddressSection = ({ user, addressData, onAddressChange, onSave, isSaved, isEditing, setEditing }) => {
  const handleInputChange = (e) => {
    onAddressChange({ ...addressData, [e.target.name]: e.target.value });
  };
  
  const handleAddressTypeChange = (type) => {
    onAddressChange({ ...addressData, addressType: type });
  };

  return (
    <div className="checkout-address-section">
      <div className="checkout-address-header">
        <h2 className="text-lg font-semibold">Shipping Address</h2>
        {isSaved && !isEditing && user && (
          <button type="button" className="checkout-edit-btn" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>
      
      {!isEditing && isSaved && user ? (
        <div className="space-y-1 p-4 border rounded-md bg-gray-50">
          <div className="flex gap-2 mb-1 items-center">
            <span className="checkout-address-type-btn selected">
              {addressData.addressType?.toUpperCase() || 'HOME'}
            </span>
            <span className="font-medium">{addressData.name || 'Name not set'}</span>
            <span className="text-gray-500">{addressData.phone || 'Phone not set'}</span>
          </div>
          <div className="text-gray-700 text-sm">{addressData.address || 'Address not set'}</div>
          {addressData.additionalInfo && (
            <div className="text-gray-500 text-xs">{addressData.additionalInfo}</div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 mb-2">
            {['home', 'office', 'other'].map(type => (
              <button
                key={type}
                type="button"
                className={`checkout-address-type-btn${addressData.addressType === type ? ' selected' : ''}`}
                onClick={() => handleAddressTypeChange(type)}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
          <Input label="Full Name *" name="name" value={addressData.name} onChange={handleInputChange} required />
          <Input label="Phone Number *" name="phone" type="tel" value={addressData.phone} onChange={handleInputChange} required />
          <Input label="Address *" name="address" value={addressData.address} onChange={handleInputChange} required />
          <Input label="Additional Location Details" name="additionalInfo" value={addressData.additionalInfo} onChange={handleInputChange} placeholder="Landmark, instructions, etc." />
          
          {user && (
            <button type="button" className="save-address-btn" onClick={onSave}>
              Save Address
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const DeliverySection = ({ selected, onSelect, options, selectedLocation, onLocationChange, locations }) => (
  <div className="checkout-delivery-section">
    <h2 className="text-lg font-semibold mb-2">Delivery Option</h2>
    <div className="flex flex-col gap-3">
      {options.map(option => (
        <label key={option.label} className={`delivery-option-row${selected?.label === option.label ? ' selected' : ''}`}>
          <input
            type="radio"
            name="deliveryOption"
            checked={selected?.label === option.label}
            onChange={() => onSelect(option)}
            className="mr-3"
          />
          <div className="flex-1">
            <div className="delivery-option-label">{option.label}</div>
            <div className="delivery-option-eta">{option.eta}</div>
          </div>
        </label>
      ))}
    </div>
    
    {locations.length > 0 && (
      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Delivery Location</label>
        <select className="w-full p-2 border rounded" value={selectedLocation} onChange={onLocationChange} required>
          {locations.map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)}
        </select>
      </div>
    )}
  </div>
);

const OrderSummary = ({ items, deliveryFee, user, loading }) => {
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0), [items]);
  const total = subtotal + deliveryFee;

  return (
    <div className="checkout-summary">
      <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex justify-between items-center text-sm">
            <span>{item.name} x {item.quantity || 1}</span>
            <span>Rs. {item.price * (item.quantity || 1)}</span>
          </div>
        ))}
        <hr className="my-2" />
        <div className="flex justify-between items-center">
          <span>Subtotal</span>
          <span>Rs. {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Delivery Fee</span>
          <span>Rs. {deliveryFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center font-bold text-lg">
          <span>Total</span>
          <span>Rs. {total.toFixed(2)}</span>
        </div>
      </div>
      
      {!user && (
        <div className="mt-6 p-3 bg-yellow-100 border border-yellow-300 rounded-md text-center">
          <p className="text-yellow-800 font-semibold">Please log in to place an order.</p>
        </div>
      )}
      
      <Button type="submit" className="w-full mt-6" disabled={loading || !user}>
        {loading ? 'Placing Order...' : 'Place Order'}
      </Button>
    </div>
  );
};

// --- Main Checkout Component ---

// Helper to remove undefined and productImageURL fields
function cleanUndefined(obj) {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  } else if (obj && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined && key !== 'productImageURL') {
        acc[key] = cleanUndefined(value);
      }
      return acc;
    }, {});
  }
  return obj;
}

const Checkout = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, clearCart } = useCart();
  
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  
  const [isEditingAddress, setEditingAddress] = useState(true);
  const [isAddressSaved, setAddressSaved] = useState(false);
  const [addressData, setAddressData] = useState({
    name: '', phone: '', addressType: 'home', address: '', additionalInfo: ''
  });

  useEffect(() => {
    // Determine items for checkout: from cart or single product
    const loadCheckoutItems = async () => {
      if (productId) {
        // "Buy Now" mode
        try {
          const productDoc = await getDoc(doc(db, 'products', productId));
          if (productDoc.exists()) {
            setCheckoutItems([{ id: productDoc.id, ...productDoc.data(), quantity: 1 }]);
          } else {
            toast.error("Product not found.");
            navigate('/');
          }
        } catch (error) {
          console.error("Error fetching product:", error);
          toast.error("Could not load product details.");
        }
      } else if (cartItems.length > 0) {
        // Cart checkout mode
        setCheckoutItems(cartItems);
      } else {
        toast.error("Your cart is empty.");
        navigate('/cart');
      }
    };

    // --- Fetch initial data ---
    const fetchInitialData = async () => {
      // Fetch delivery options (can be from Firestore or hardcoded)
      const options = [
        { label: 'Standard Delivery', fee: 50, eta: '3-5 business days' },
        { label: 'Express Delivery', fee: 100, eta: '1-2 business days' },
        { label: 'Same Day Delivery', fee: 200, eta: 'Same day (if ordered before 2 PM)' }
      ];
      setDeliveryOptions(options);
      setSelectedDelivery(options[0]);

      // Fetch delivery locations
      const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'];
      setDeliveryLocations(locations);
      setSelectedLocation(locations[0]);

      // Fetch user's saved address
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().address) {
            const savedAddress = userDoc.data().address;
            setAddressData(savedAddress);
            setAddressSaved(true);
            setEditingAddress(false);
          }
        } catch (error) {
          console.error("Error fetching address:", error);
        }
      }
    };

    loadCheckoutItems();
    fetchInitialData();
  }, [productId, user, cartItems, navigate]);

  const handleSaveAddress = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { address: addressData }, { merge: true });
      toast.success('Address saved!');
      setAddressSaved(true);
      setEditingAddress(false);
    } catch (err) {
      toast.error('Failed to save address');
    }
=======
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

const deliveryAreas = [
  'kadam chowk', 'bhanu chowk', 'siva chowk', 'pirari chowk',
  'mills area', 'thapa chowk', 'murli chowk', 'campus chowk',
  'railway station area', 'janaki chowk', 'janak chowk'
];

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    additionalInfo: '',
  });
  const DELIVERY_FEE = 0; // Set to 0 for free, or e.g. 50 for paid delivery

  useEffect(() => {
    if (location.state && location.state.product) {
      setProduct(location.state.product);
    } else {
      setProduct(null);
    }
  }, [location.state]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
<<<<<<< HEAD
    if (!user) {
      toast.error('You must be logged in to place an order.');
      return;
    }
    if (!addressData.name || !addressData.phone || !addressData.address) {
      toast.error('Please fill in and save your shipping address.');
      return;
    }
    if (checkoutItems.length === 0 || !selectedDelivery) {
      toast.error('Something went wrong. Please try again.');
      return;
    }
    
    setLoading(true);
    try {
      const totalAmount = checkoutItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0) + selectedDelivery.fee;
      
      const orderPayload = {
        userId: user.uid,
        userEmail: user.email,
        items: checkoutItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          imageUrl: item.imageUrl || item.productImageURL || item.image || ''
        })),
        shippingAddress: addressData,
        deliveryOption: selectedDelivery,
        deliveryLocation: selectedLocation,
        totalAmount,
        status: 'pending',
        createdAt: serverTimestamp(),
        isGuest: false,
      };

      const cleanOrderPayload = cleanUndefined(orderPayload);
      const orderRef = await addDoc(collection(db, 'orders'), cleanOrderPayload);

      await notificationSystem.sendOrderNotification({
        orderId: orderRef.id,
        productName: checkoutItems.length > 1 ? `${checkoutItems.length} items` : checkoutItems[0].name,
        totalAmount: totalAmount,
        userId: user.uid
      });
      
      // If checkout was from cart, clear it
      if (!productId) {
        clearCart();
      }

      toast.success('Order placed successfully!');
      navigate('/order-success');

=======
    if (!formData.name || !formData.phone || !formData.address) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!product) {
      toast.error('No product selected');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'orders'), {
        productId: product.id,
        productName: product.name,
        productImageURL: product.imageUrl,
        price: product.price,
          customerName: formData.name,
          phone: formData.phone,
          address: formData.address,
        additionalInfo: formData.additionalInfo,
          status: 'Pending',
          createdAt: serverTimestamp(),
        isGuest: true
      });
      toast.success('Order placed successfully!');
      navigate('/order-success');
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card><Card.Content className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Checkout...</h2>
        </Card.Content></Card>
=======
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
          <Card>
            <Card.Content className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No product selected</h2>
            <Button onClick={() => navigate('/')}>Go to Home</Button>
            </Card.Content>
          </Card>
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
<<<<<<< HEAD
      <form className="checkout-grid" onSubmit={handleSubmit}>
        <div className="checkout-main">
          <AddressSection 
            user={user}
            addressData={addressData} 
            onAddressChange={setAddressData}
            onSave={handleSaveAddress}
            isSaved={isAddressSaved}
            isEditing={isEditingAddress}
            setEditing={setEditingAddress}
          />
          <DeliverySection 
            selected={selectedDelivery}
            onSelect={setSelectedDelivery}
            options={deliveryOptions}
            selectedLocation={selectedLocation}
            onLocationChange={(e) => setSelectedLocation(e.target.value)}
            locations={deliveryLocations}
          />
        </div>
        
        <OrderSummary 
          items={checkoutItems} 
          deliveryFee={selectedDelivery?.fee || 0} 
          user={user}
          loading={loading}
        />
      </form>
=======
      <div className="w-full max-w-2xl mx-auto px-4">
              <Card>
                <Card.Header>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout</h1>
                </Card.Header>
          <Card.Content className="p-6 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Full Name *"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    label="Phone Number *"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Area *
                    </label>
                    <select
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Select delivery area</option>
                      {deliveryAreas.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Information
                </label>
                <textarea
                  name="additionalInfo"
                  value={formData.additionalInfo}
                    onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Landmark, instructions, etc."
                  rows={2}
                />
                  </div>
              <div className="flex justify-end">
                <Button type="submit" className="admin-btn" loading={loading}>
                  Place Order
                </Button>
            </div>
            </form>
            <div className="border-t pt-4 mt-4">
              <h2 className="text-lg font-semibold mb-2">Order Summary</h2>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-gray-50 rounded-lg p-4 shadow-sm">
                <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center bg-white rounded-lg border">
                  <img src={product.imageUrl} alt={product.name} className="w-20 h-20 object-cover rounded" />
                      </div>
                <div className="flex-1 w-full">
                  <div className="font-bold text-gray-900 text-lg mb-1">{product.name}</div>
                  <div className="text-gray-600 mb-1">Quantity: <span className="font-semibold">{product.quantity || 1}</span></div>
                  <div className="text-gray-600 mb-1">Price: <span className="font-semibold">Rs {product.price}</span></div>
                  <div className="text-gray-600 mb-1">Delivery Fee: <span className="font-semibold">{DELIVERY_FEE === 0 ? 'Free' : `Rs ${DELIVERY_FEE}`}</span></div>
                  <div className="border-t mt-2 pt-2 flex justify-between font-bold text-base">
                      <span>Total</span>
                    <span>Rs {(product.price * (product.quantity || 1)) + DELIVERY_FEE}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
    </div>
  );
};

export default Checkout;