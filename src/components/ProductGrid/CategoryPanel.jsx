import React from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import './CategoryPanel.css';

const CategoryPanel = ({ title = '', products = [], onProductClick, onAuthRequired }) => {
  if (!Array.isArray(products) || products.length === 0) return null;

  // Get category icon based on title
  const getCategoryIcon = (category) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('mobile') || categoryLower.includes('phone')) return '📱';
    if (categoryLower.includes('laptop') || categoryLower.includes('computer')) return '💻';
    if (categoryLower.includes('shoe') || categoryLower.includes('footwear')) return '👟';
    if (categoryLower.includes('clothing') || categoryLower.includes('fashion')) return '👕';
    if (categoryLower.includes('electronics') || categoryLower.includes('gadget')) return '⚡';
    if (categoryLower.includes('book') || categoryLower.includes('study')) return '📚';
    if (categoryLower.includes('sport') || categoryLower.includes('fitness')) return '🏃';
    if (categoryLower.includes('home') || categoryLower.includes('kitchen')) return '🏠';
    if (categoryLower.includes('beauty') || categoryLower.includes('cosmetic')) return '💄';
    if (categoryLower.includes('toy') || categoryLower.includes('game')) return '🎮';
    return '🛍️'; // Default icon
  };

  const categoryIcon = getCategoryIcon(title);

  return (
    <section className="category-panel">
      <div className="category-panel-header">
        <div className="category-title-section">
          <div className="category-icon">{categoryIcon}</div>
          <div className="category-info">
            <h2 className="category-panel-title">{title}</h2>
            <p className="category-description">
              Discover the best {title.toLowerCase()} products
            </p>
          </div>
        </div>
        <Link 
          to={`/category/${encodeURIComponent(title.toLowerCase())}`} 
          className="see-all-link"
        >
          <span>View All</span>
          <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="category-products product-bar-grid">
        {products.slice(0, 4).map(product => (
          <div key={product.id || product.name} className="product-wrapper">
            <ProductCard product={product} onProductClick={onProductClick} onAuthRequired={onAuthRequired} compact={true} />
          </div>
        ))}
      </div>

      {products.length > 4 && (
        <div className="category-footer">
          <Link 
            to={`/category/${encodeURIComponent(title.toLowerCase())}`} 
            className="view-more-btn"
          >
            View All {products.length} {title} Products
          </Link>
        </div>
      )}
    </section>
  );
};

export default CategoryPanel;
