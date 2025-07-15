import React from 'react';
import { FaLeaf, FaNewspaper } from 'react-icons/fa';
import ProductCard from './ProductGrid/ProductCard';
import './NewArrivalsSection.css';

const NewArrivalsSection = ({ products = [], onProductClick, isAdmin = false, onEdit, onAuthRequired }) => {
  // Filter new arrival products (you can add a newArrival property to products)
  const newArrivalProducts = products.filter(product => product.newArrival) || [];

  // If no new arrival products, show some products as fallback
  const displayProducts = newArrivalProducts.length > 0 
    ? newArrivalProducts 
    : products.slice(0, 8); // Show first 8 products as fallback

  if (displayProducts.length === 0 && !isAdmin) return null;

  return (
    <section className="new-arrivals-section">
      <div className="new-arrivals-header">
        <div className="new-arrivals-title-section">
          <div className="new-arrivals-icon">
            <FaLeaf className="leaf-icon" />
          </div>
          <div className="new-arrivals-info">
            <h2 className="new-arrivals-title">🌱 NEW ARRIVALS</h2>
            <p className="new-arrivals-subtitle">Fresh Products Just In - Be the First to Shop!</p>
          </div>
        </div>

        {isAdmin && (
          <button className="edit-section-btn" onClick={() => onEdit('newArrivals')}>
            ✏️ Edit New Arrivals
          </button>
        )}
      </div>

      <div className="new-arrivals-products product-bar-grid">
        {displayProducts.length > 0 ? (
          displayProducts.map((product, index) => (
            <div key={product.id} className="new-arrivals-product">
              <div className="new-badge">
                <FaNewspaper className="new-icon" />
                <span>NEW</span>
              </div>
              <ProductCard 
                product={product} 
                onProductClick={onProductClick}
                onAuthRequired={onAuthRequired}
              />
            </div>
          ))
        ) : (
          <div className="no-new-arrivals">
            <FaLeaf className="no-arrivals-icon" />
            <p>No new arrivals available</p>
            {isAdmin && (
              <button className="add-new-arrivals-btn">
                + Add New Arrivals
              </button>
            )}
          </div>
        )}
      </div>

      {displayProducts.length > 6 && (
        <div className="new-arrivals-footer">
          <button className="view-all-new-arrivals-btn">
            View All New Arrivals
          </button>
        </div>
      )}
    </section>
  );
};

export default NewArrivalsSection; 