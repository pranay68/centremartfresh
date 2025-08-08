import React from 'react';
import { getAllProducts } from '../utils/productOperations';
import './AdminMobilePanel.css';

import { useEffect, useState } from 'react';

const AdminMobilePanel = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    setProducts(getAllProducts());
  }, []);

  return (
    <div className="admin-mobile-panel">
      <h2>Admin Panel</h2>
      <div className="admin-section">
        <h3>Products</h3>
        <ul className="admin-product-list">
          {products.map(product => (
            <li key={product.id} className="admin-product-item">
              <div>
                <span className="admin-product-name">{product.name}</span>
                <span className="admin-product-id"> (ID: {product.id})</span>
              </div>
              <div className="admin-product-details">
                <span className="admin-product-price">Rs. {product.price}</span>
                <span className="admin-product-desc">{product.description}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {/* Add more admin sections here as needed */}
    </div>
  );
};

export default AdminMobilePanel;
