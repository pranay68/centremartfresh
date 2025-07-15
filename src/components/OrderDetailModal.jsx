import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { MapPin } from 'lucide-react';
import OrderStatusTracker from './OrderStatusTracker';
import './OrdersPage.css';

const OrderDetailModal = ({ order, onClose, onCancel, canceling }) => {
  if (!order) return null;
  const calculateTotal = (items) => (items || []).reduce((total, item) => total + (item.price * item.quantity), 0);
  return (
    <Modal open={!!order} onClose={onClose}>
      <div className="order-modal-content">
        <h2 className="order-modal-title">Order #{order.id?.slice(-8)}</h2>
        <div className="order-modal-date">Placed on: {order.createdAt?.toLocaleDateString()}</div>
        <OrderStatusTracker status={order.status} />
        <div className="order-modal-section">
          <h3>Items Ordered</h3>
          {order.items?.map((item, idx) => (
            <div key={idx} className="order-modal-item">
              <img src={item.imageUrl || 'https://via.placeholder.com/50x50'} alt={item.name} className="order-modal-item-img" />
              <div className="order-modal-item-info">
                <span className="order-modal-item-name">{item.name}</span>
                <span className="order-modal-item-qty">Qty: {item.quantity}</span>
              </div>
              <span className="order-modal-item-price">Rs. {(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>
        {order.deliveryAddress && (
          <div className="order-modal-section">
            <h3>Delivery Address</h3>
            <div className="order-modal-address">
              <MapPin size={16} />
              <span>{order.deliveryAddress}</span>
            </div>
          </div>
        )}
        <div className="order-modal-section">
          <h3>Payment</h3>
          <div className="order-modal-payment">
            <span>Method: {order.paymentMethod || 'N/A'}</span>
            <span>Total: Rs. {calculateTotal(order.items).toLocaleString()}</span>
          </div>
        </div>
        {['pending','processing'].includes(order.status) && (
          <div className="order-modal-actions">
            <Button variant="danger" loading={canceling} onClick={() => onCancel(order.id)}>
              Cancel Order
            </Button>
          </div>
        )}
        <div className="order-modal-actions">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};

export default OrderDetailModal; 