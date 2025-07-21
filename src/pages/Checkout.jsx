import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, addDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import notificationSystem from '../utils/notificationSystem';
import toast from 'react-hot-toast';
import './Checkout.css';

const Checkout = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [editAddress, setEditAddress] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);
  const [notifyOnOrder, setNotifyOnOrder] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addressType: 'home',
    address: '',
    additionalInfo: '',
    invoiceEmail: ''
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      try {
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
          setProduct({ id: productDoc.id, ...productDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      }
    };

    const fetchDeliveryOptions = async () => {
      try {
        const options = [
          { label: 'Standard Delivery', fee: 50, eta: '3-5 business days' },
          { label: 'Express Delivery', fee: 100, eta: '1-2 business days' },
          { label: 'Same Day Delivery', fee: 200, eta: 'Same day (if ordered before 2 PM)' }
        ];
        setDeliveryOptions(options);
        setSelectedDelivery(options[0]);
      } catch (error) {
        console.error('Error fetching delivery options:', error);
      }
    };

    const fetchLocations = async () => {
      try {
        const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'];
        setDeliveryLocations(locations);
        setSelectedLocation(locations[0]);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    const fetchAddress = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().address) {
          const address = userDoc.data().address;
          setFormData(prev => ({
            ...prev,
            name: address.name || '',
            phone: address.phone || '',
            addressType: address.addressType || 'home',
            address: address.address || '',
            additionalInfo: address.additionalInfo || ''
          }));
          setAddressSaved(true);
        }
      } catch (error) {
        console.error('Error fetching address:', error);
      }
    };

    fetchProduct();
    fetchDeliveryOptions();
    fetchLocations();
    fetchAddress();
  }, [productId, user]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddressTypeChange = (type) => {
    setFormData({ ...formData, addressType: type });
  };

  const handleDeliveryChange = (option) => {
    setSelectedDelivery(option);
  };

  const handleLocationChange = (e) => {
    setSelectedLocation(e.target.value);
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        address: {
          name: formData.name,
          phone: formData.phone,
          addressType: formData.addressType,
          address: formData.address,
          additionalInfo: formData.additionalInfo,
        }
      }, { merge: true });
      toast.success('Address saved!');
      setAddressSaved(true);
      setEditAddress(false);
    } catch (err) {
      toast.error('Failed to save address');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!product) {
      toast.error('No product selected');
      return;
    }
    if (!selectedDelivery) {
      toast.error('Please select a delivery option');
      return;
    }
    setLoading(true);
    try {
      const orderRef = await addDoc(collection(db, 'orders'), {
        productId: product.id,
        productName: product.name,
        productImageURL: product.imageUrl,
        price: product.price,
        customerName: formData.name,
        phone: formData.phone,
        addressType: formData.addressType,
        address: formData.address,
        additionalInfo: formData.additionalInfo,
        invoiceEmail: formData.invoiceEmail,
        deliveryOption: selectedDelivery.label,
        deliveryFee: selectedDelivery.fee,
        deliveryLocation: selectedLocation || '',
        status: 'pending',
        totalAmount: product.price + selectedDelivery.fee,
        createdAt: serverTimestamp(),
        userId: user ? user.uid : null,
        userEmail: user ? user.email : null,
        isGuest: !user,
        notifyOnOrder: notifyOnOrder
      });

      // Send notification to admin
      await notificationSystem.sendOrderNotification({
        orderId: orderRef.id,
        productName: product.name,
        totalAmount: product.price + selectedDelivery.fee,
        userId: user ? user.uid : 'guest'
      });

      toast.success('Order placed successfully!');
      navigate('/order-success');
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <Card.Content className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No product selected</h2>
            <Button onClick={() => navigate('/')}>Go to Home</Button>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <form className="checkout-grid" onSubmit={handleSubmit}>
        {/* Left: Delivery Info */}
        <div className="checkout-main">
          {/* Address Section */}
          <div className="checkout-address-section">
            <div className="checkout-address-header">
              <h2 className="text-lg font-semibold">Shipping Address</h2>
              {addressSaved && !editAddress && (
                <button
                  type="button"
                  className="checkout-edit-btn"
                  onClick={() => setEditAddress(true)}
                >
                  Edit
                </button>
              )}
            </div>
            <div className={`address-transition ${editAddress ? 'edit-mode' : 'view-mode'}`}> 
              {editAddress ? (
                <div className="space-y-3">
                  <div className="flex gap-2 mb-2">
                    {['home', 'office', 'other'].map(type => (
                      <button
                        key={type}
                        type="button"
                        className={`checkout-address-type-btn${formData.addressType === type ? ' selected' : ''}`}
                        onClick={() => handleAddressTypeChange(type)}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
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
                  <Input
                    label="Address *"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    label="Additional Location Details"
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    placeholder="Landmark, instructions, etc."
                  />
                  <button
                    type="button"
                    className="save-address-btn"
                    onClick={handleSaveAddress}
                  >
                    Save Address
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex gap-2 mb-1">
                    <span className="checkout-address-type-btn selected">
                      {formData.addressType?.toUpperCase() || 'HOME'}
                    </span>
                    <span className="font-medium">{formData.name || 'Name not set'}</span>
                    <span className="text-gray-500">{formData.phone || 'Phone not set'}</span>
                  </div>
                  <div className="text-gray-700 text-sm">
                    {formData.address || 'Address not set'}
                  </div>
                  {formData.additionalInfo && (
                    <div className="text-gray-500 text-xs">
                      {formData.additionalInfo}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Delivery Option Section */}
          <div className="checkout-delivery-section">
            <h2 className="text-lg font-semibold mb-2">Delivery Option</h2>
            <div className="flex flex-col gap-3">
              {deliveryOptions.map(option => (
                <label
                  key={option.label}
                  className={`delivery-option-row${selectedDelivery && selectedDelivery.label === option.label ? ' selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="deliveryOption"
                    checked={selectedDelivery && selectedDelivery.label === option.label}
                    onChange={() => handleDeliveryChange(option)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="delivery-option-label">{option.label}</div>
                    <div className="delivery-option-eta">{option.eta}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Delivery Location Dropdown */}
          {deliveryLocations.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Delivery Location</label>
              <select
                className="w-full p-2 border rounded"
                value={selectedLocation}
                onChange={handleLocationChange}
                required
              >
                {deliveryLocations.map((loc, idx) => (
                  <option key={idx} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Order Summary */}
        <div className="checkout-summary">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Product</span>
              <span>{product.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Price</span>
              <span>Rs. {product.price}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Delivery Fee</span>
              <span>Rs. {selectedDelivery?.fee || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total</span>
              <span>Rs. {(product.price + (selectedDelivery?.fee || 0)).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center mt-4 mb-2">
            <input
              type="checkbox"
              id="notifyOnOrder"
              checked={notifyOnOrder}
              onChange={e => setNotifyOnOrder(e.target.checked)}
              style={{ accentColor: '#7f53ac', width: 18, height: 18, marginRight: 8 }}
            />
            <label htmlFor="notifyOnOrder" style={{ fontSize: '0.97rem', color: '#555', cursor: 'pointer' }}>
              Allow order status notifications to your phone/email
            </label>
          </div>
          <Button
            type="submit"
            className="w-full mt-6"
            disabled={loading}
            style={loading ? {
              background: 'linear-gradient(90deg, #e0e7ff 0%, #f1f5f9 100%)',
              color: '#7f53ac',
              border: '2px solid #7f53ac44',
              boxShadow: '0 0 16px 4px #7f53ac33, 0 2px 8px #ff660022',
              opacity: 1,
              filter: 'grayscale(0.1) brightness(1.08)',
              textShadow: '0 1px 8px #e0e7ff, 0 0 2px #7f53ac44',
              cursor: 'not-allowed',
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '0.04em',
              transition: 'box-shadow 0.2s, background 0.2s, color 0.2s',
            } : {}}
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Checkout;