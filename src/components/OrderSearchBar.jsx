import React from 'react';
import { Search } from 'lucide-react';
import './OrdersPage.css';

const OrderSearchBar = ({ searchTerm, setSearchTerm, statusFilter, setStatusFilter }) => (
  <div className="orders-filters">
    <div className="search-bar">
      <Search size={18} className="search-icon" />
      <input
        type="text"
        placeholder="Search by order ID or product name..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="search-input"
      />
    </div>
    <select
      value={statusFilter}
      onChange={e => setStatusFilter(e.target.value)}
      className="status-filter"
    >
      <option value="">All Status</option>
      <option value="pending">Pending</option>
      <option value="processing">Processing</option>
      <option value="shipped">Shipped</option>
      <option value="delivered">Delivered</option>
      <option value="cancelled">Cancelled</option>
    </select>
  </div>
);

export default OrderSearchBar; 