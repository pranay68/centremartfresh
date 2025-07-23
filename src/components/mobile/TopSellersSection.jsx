import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const TopSellersSection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const fetchProducts = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      // Implement your product fetching logic here
      // Example:
      // const response = await fetch(`/api/top-sellers?page=${page}&limit=${ITEMS_PER_PAGE}`);
      // const newProducts = await response.json();
      // setProducts(prev => [...prev, ...newProducts]);
    } catch (error) {
      console.error('Error fetching top sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page]);

  return (
    <section className="mobile-product-section">
      <div className="mobile-section-header">
        <h2 className="mobile-section-title">🔥 TOP SELLERS</h2>
        <Link to="/top-sellers" className="mobile-section-link">
          View All <ChevronRight size={16} />
        </Link>
      </div>
      
      <div className="mobile-product-grid">
        {products.map((product) => (
          <div key={product.id} className="mobile-product-card">
            <img 
              src={product.image} 
              alt={product.name}
              loading="lazy"
              className="mobile-product-image"
            />
            <div className="mobile-product-info">
              <h3 className="mobile-product-name">{product.name}</h3>
              <p className="mobile-product-price">${product.price}</p>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="mobile-loading-indicator">
          Loading more products...
        </div>
      )}
    </section>
  );
};

export default TopSellersSection; 