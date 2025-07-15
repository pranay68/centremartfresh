import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import CoffinDanceModal from '../components/CoffinDanceModal';

const OrderSuccess = () => {
  const [showCoffin, setShowCoffin] = useState(true);

  useEffect(() => {
    setShowCoffin(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <CoffinDanceModal open={showCoffin} onClose={() => setShowCoffin(false)} />
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <Card.Content className="text-center py-12">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h1>
            <p className="text-lg text-gray-600 mb-6">
              Thank you for your order. We'll process it shortly and keep you updated.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">
                <strong>Payment Method:</strong> Cash on Delivery<br />
                <strong>Delivery:</strong> Free delivery to your selected area<br />
                <strong>Estimated Delivery:</strong> 1-3 business days
              </p>
            </div>
            <div className="space-y-3">
              <Link to="/" className="block">
                <Button className="w-full">Continue Shopping</Button>
              </Link>
              <Link to="/account" className="block">
                <Button variant="outline" className="w-full">View My Orders</Button>
              </Link>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default OrderSuccess;