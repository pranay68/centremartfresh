import React from 'react';
import { getAllProducts } from '../data/productsService';
import './AdminMobilePanel.css';

const AdminMobilePanel = () => {
  const products = getAllProducts();

  return (
    <div className="admin-mobile-panel">
      <h2>Admin Panel</h2>
      <div className="admin-section">
        <h3>Products</h3>
        <ul className="admin-product-list">
          {products.map(product => (
            <li key={product.id} className="admin-product-item">
              <span className="admin-product-name">{product.name}</span>
              <span className="admin-product-price">Rs. {product.price}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Add more admin sections here as needed */}
    </div>
  );
};

export default AdminMobilePanel;
