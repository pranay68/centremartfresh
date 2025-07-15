import React from 'react';
import { FaCrown, FaStar, FaChartLine, FaFire } from 'react-icons/fa';
import ProductCard from './ProductGrid/ProductCard';
import './TopSaleSection.css';

const TopSaleSection = ({ products = [], onProductClick, isAdmin = false, onEdit, onAuthRequired }) => {
  // Filter top selling products (you can add a topSale property to products)
  const topSaleProducts = products.filter(product => product.topSale) || [];

  // If no top sale products, show some products with high ratings or random selection
  const displayProducts = topSaleProducts.length > 0 
    ? topSaleProducts 
    : products.slice(0, 6); // Show first 6 products as fallback

  if (displayProducts.length === 0 && !isAdmin) return null;

  return (
    <section className="top-sale-section">
      <div className="top-sale-header">
        <div className="top-sale-title-section">
          <div className="top-sale-icon">
            <FaChartLine className="chart-line-icon" />
          </div>
          <div className="top-sale-info">
            <h2 className="top-sale-title">🔥 TOP SELLERS</h2>
            <p className="top-sale-subtitle">Most Popular Products This Week</p>
          </div>
        </div>

        {isAdmin && (
          <button className="edit-section-btn" onClick={() => onEdit('topSale')}>
            ✏️ Edit Top Sellers
          </button>
        )}
      </div>

      <div className="top-sale-products product-bar-grid">
        {displayProducts.length > 0 ? (
          displayProducts.map((product, index) => (
            <div key={product.id} className="top-sale-product">
              <div className="product-badge">
                <span className="badge-number">#{index + 1}</span>
                <FaFire className="badge-icon" />
              </div>
              <ProductCard 
                product={product} 
                onProductClick={onProductClick}
                compact={true}
                onAuthRequired={onAuthRequired}
              />
            </div>
          ))
        ) : (
          <div className="no-top-sale">
            <FaChartLine className="no-sale-icon" />
            <p>No top selling products available</p>
            {isAdmin && (
              <button className="add-top-sale-btn">
                + Add Top Selling Products
              </button>
            )}
          </div>
        )}
      </div>

      {displayProducts.length > 4 && (
        <div className="top-sale-footer">
          <button className="view-all-top-sale-btn">
            View All Top Sellers
          </button>
        </div>
      )}
    </section>
  );
};

export default TopSaleSection; 