import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import './HomeNew.css';

// Components
import Header from '../components/Header';
import ProductCard from '../components/ProductGrid/ProductCard';
import SearchBar from '../components/SearchBar';
import BottomNav from '../components/ui/BottomNav';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch products
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Get top sellers (first 5 products for demo)
  const topSellers = products.slice(0, 5);

  // Group products by category
  const productsByCategory = products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {});

  const handleProductClick = (product) => {
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="safe-area-view">
      {/* Main ScrollView Container */}
      <div className="main-scroll-container">
        {/* Fixed Header */}
        <Header />

        {/* Search Bar */}
        <SearchBar 
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={(term) => navigate(`/search?q=${term}`)}
        />

        {/* Top Sellers Section */}
        <section className="top-sellers-section">
          <h2 className="section-title">Top Sellers</h2>
          <div className="horizontal-scroll">
            {topSellers.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onProductClick={handleProductClick}
                compact={true}
              />
            ))}
          </div>
        </section>

        {/* Categories with Products */}
        {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
          <section key={category} className="category-section">
            <h2 className="section-title">{category}</h2>
            <div className="products-grid">
              {categoryProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onProductClick={handleProductClick}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Home;