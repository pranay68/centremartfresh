import React from 'react';

const ProductCard = ({ product, onProductClick }) => {
  if (!product) return null;

  return (
    <div className="product-card" onClick={() => onProductClick && onProductClick(product)}>
      <div className="product-image-container">
        {product.image ? (
          <img src={product.image} alt={product.name} className="product-image" loading="lazy" />
        ) : (
          <div className="product-image-placeholder" />
        )}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <div className="product-category">{product.category}</div>
        <div className="product-price">Rs {product.price}</div>
        <div className="product-actions">
          <button className="add-to-cart-btn">Add to Cart</button>
          <button className="buy-now-btn">Buy Now</button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;