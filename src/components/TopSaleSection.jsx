import React, { useState, useEffect } from 'react';
import { FaChartLine, FaFire } from 'react-icons/fa';
import ProductCard from './ProductGrid/ProductCard';
import './TopSaleSection.css';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const TopSaleSection = ({ products = [], onProductClick, isAdmin = false, onEdit, onAuthRequired }) => {
  const [topSellers, setTopSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopSellers = async () => {
      try {
        // Get all orders
        const ordersQuery = query(collection(db, 'orders'));
        const ordersSnapshot = await getDocs(ordersQuery);
        const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Count sales for each product
        const salesCount = {};
        orders.forEach(order => {
          if (order.items) {
            order.items.forEach(item => {
              if (item.id) {
                salesCount[item.id] = (salesCount[item.id] || 0) + (item.quantity || 1);
              }
            });
          }
        });

        // Sort products by sales count and get top 6
        const topProducts = products
          .map(product => ({
            ...product,
            salesCount: salesCount[product.id] || 0
          }))
          .sort((a, b) => b.salesCount - a.salesCount)
          .slice(0, 6);

        setTopSellers(topProducts);
      } catch (error) {
        console.error('Error fetching top sellers:', error);
      } finally {
        setLoading(false);
      }
    };

    if (products.length > 0) {
      fetchTopSellers();
    }
  }, [products]);

  const displayProducts = topSellers.length > 0 ? topSellers : products.slice(0, 6);

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
        {loading ? (
          <div className="loading-products">
            <div className="loading-spinner"></div>
            <p>Loading top sellers...</p>
          </div>
        ) : displayProducts.length > 0 ? (
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