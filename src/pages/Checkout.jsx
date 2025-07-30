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
    </div>
  );
};

export default Checkout;