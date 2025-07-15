import React from 'react';
import './OrdersPage.css';

const steps = ['pending','processing','shipped','delivered','cancelled'];

const OrderStatusTracker = ({ status }) => {
  return (
    <div className="order-status-tracker">
      {steps.map((step, idx) => (
        <div key={step} className="tracker-step">
          <div className={`tracker-dot ${status === step ? 'active' : ''}`}>{idx+1}</div>
          <div className={`tracker-label ${status === step ? 'active' : ''}`}>{step.charAt(0).toUpperCase() + step.slice(1)}</div>
          {idx < steps.length-1 && <div className={`tracker-bar ${status === step ? 'active' : ''}`}></div>}
        </div>
      ))}
    </div>
  );
};

export default OrderStatusTracker; 