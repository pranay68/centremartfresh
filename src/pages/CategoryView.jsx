import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProductsByCategory } from '../utils/productData';
import ProductCard from '../components/ProductGrid/ProductCard';
import './CategoryView.css';

const CategoryView = () => {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (category) {
      const decodedCategory = decodeURIComponent(category);
      // First letter uppercase for consistent matching
      const formattedCategory = decodedCategory.charAt(0).toUpperCase() + decodedCategory.slice(1);
      const categoryProducts = getProductsByCategory(formattedCategory);
      setProducts(categoryProducts);
      setLoading(false);
    }
  }, [category]);

  if (loading) {
    return (
      <div className="category-view-loading">
        <p>Loading products...</p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="category-view-empty">
        <h2>No products found</h2>
        <p>Sorry, we couldn't find any products in this category.</p>
      </div>
    );
  }

  return (
    <div className="category-view">
      <div className="category-view-header">
        <h1>{decodeURIComponent(category)}</h1>
        <p>{products.length} products found</p>
      </div>
      <div className="category-view-grid">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoryView;
