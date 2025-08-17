import React from 'react';
import { Calendar, DollarSign } from 'lucide-react';
import './OrdersPage.css';

const OrderList = ({ orders, loading, onOrderClick, onCancel }) => {
  if (loading) {
    return (
      <div className="loading-orders">
        <div className="loading-spinner"></div>
        <p>Loading your orders...</p>
      </div>
    );
  }
  if (!orders || orders.length === 0) {
    return (
      <div className="no-orders">
        <span className="no-orders-icon">📦</span>
        <h2>No orders found</h2>
        <p>Try adjusting your search or filter.</p>
      </div>
    );
  }
  return (
    <div className="orders-content">
      <div className="orders-list">
        {orders.map((order, index) => (
          <div 
            key={order.id} 
            className={`order-card hoverable ${String(order.status || '').toLowerCase() === 'cancelled' ? 'order-cancelled' : ''}`}
            onClick={() => onOrderClick(order)}
            style={String(order.status || '').toLowerCase() === 'cancelled' ? { textDecoration: 'line-through', opacity: 0.6 } : {}}
          >
            <div className="order-header">
              <div className="order-info">
                <h3 className="order-product-name">{order.productName || (order.items && order.items[0]?.name) || 'Order'}</h3>
                <div className="order-id text-xs text-gray-400 mb-1">Order ID: <span className="font-mono">{order.id?.slice(-8) || order.id}</span></div>
                {order.items && order.items.length > 1 && (
                  <div className="order-product-qty text-xs text-gray-500">+{order.items.length - 1} more item(s)</div>
                )}
                <p className="order-date">
                  <Calendar size={14} />
                  {order.createdAt?.toLocaleDateString()}
                </p>
                {order.productDescription && (
                  <div className="order-product-desc text-xs text-gray-500">{order.productDescription}</div>
                )}
              </div>
              <div className="order-status-badge" style={{ backgroundColor: order.statusColor, color: order.statusTextColor }}>
                {order.statusIcon}
                <span>{order.statusText}</span>
              </div>
            </div>
            <div className="order-summary">
              <div className="order-items">
                <span>{order.items?.length || 1} item{(order.items?.length || 1) > 1 ? 's' : ''}</span>
              </div>
              <div className="order-total">
                <DollarSign size={16} />
                <span>
                  Rs. {
                    (() => {
                      const total = order.total || order.totalAmount;
                      if (total) return Number(total).toLocaleString();
                      if (order.price && order.quantity) return (Number(order.price) * Number(order.quantity)).toLocaleString();
                      if (order.price) return Number(order.price).toLocaleString();
                      return '0.00';
                    })()
                  }
                </span>
              </div>
            </div>
            {/* Cancel Order Button */}
            {['Pending', 'Processing', 'Shipped'].includes(order.status) && (
              <div className="order-actions">
                <button
                  className="cancel-order-btn"
                  onClick={e => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to cancel this order?')) {
                      if (typeof onCancel === 'function') {
                        onCancel(order.id);
                      } else if (order.onCancel) {
                        order.onCancel(order.id);
                      }
                    }
                  }}
                >
                  Cancel Order
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderList; 