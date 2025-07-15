import React from 'react';
import './ProductSkeleton.css';

const ProductSkeleton = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-img shimmer"></div>
      <div className="skeleton-title shimmer"></div>
      <div className="skeleton-price-section">
        <div className="skeleton-mrp shimmer"></div>
        <div className="skeleton-discount shimmer"></div>
      </div>
      <div className="skeleton-final-price shimmer"></div>
    </div>
  );
};

export default ProductSkeleton;
