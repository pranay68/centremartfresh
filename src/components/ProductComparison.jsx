import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Scale, 
  X, 
  Plus, 
  Star, 
  ShoppingCart, 
  Heart,
  Check,
  X as XIcon,
  ArrowLeft,
  ArrowRight,
  Trash2
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import toast from 'react-hot-toast';
import './ProductComparison.css';

const ProductComparison = ({ products = [], onAddToCart, onAddToWishlist, onAuthRequired }) => {
  const { user } = useAuth();
  const [comparisonProducts, setComparisonProducts] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    // Load comparison products from localStorage
    const saved = localStorage.getItem('productComparison');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setComparisonProducts(parsed);
        if (parsed.length > 0) {
          setShowComparison(true);
        }
      } catch (error) {
        console.error('Error loading comparison products:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save to localStorage whenever comparison products change
    localStorage.setItem('productComparison', JSON.stringify(comparisonProducts));
  }, [comparisonProducts]);

  const addToComparison = (product) => {
    if (comparisonProducts.length >= 4) {
      toast.error('You can compare up to 4 products at a time');
      return;
    }

    if (comparisonProducts.find(p => p.id === product.id)) {
      toast.error('Product is already in comparison');
      return;
    }

    const productWithSpecs = {
      ...product,
      specifications: generateSpecifications(product),
      features: generateFeatures(product)
    };

    setComparisonProducts(prev => [...prev, productWithSpecs]);
    toast.success('Added to comparison');
  };

  const removeFromComparison = (productId) => {
    setComparisonProducts(prev => prev.filter(p => p.id !== productId));
    toast.success('Removed from comparison');
  };

  const clearComparison = () => {
    setComparisonProducts([]);
    setShowComparison(false);
    localStorage.removeItem('productComparison');
    toast.success('Comparison cleared');
  };

  const generateSpecifications = (product) => {
    // Generate specifications based on product category and data
    const specs = {
      'Brand': product.brand || 'Unknown',
      'Model': product.model || product.name,
      'Category': product.category || 'General',
      'Price': `Rs. ${product.price?.toLocaleString() || 'N/A'}`,
      'Rating': `${product.rating || 0}/5`,
      'Reviews': product.reviews?.length || 0,
      'Availability': product.stock > 0 ? 'In Stock' : 'Out of Stock'
    };

    // Add category-specific specs
    if (product.category?.toLowerCase().includes('mobile') || product.category?.toLowerCase().includes('phone')) {
      specs['Screen Size'] = '6.1 inch';
      specs['Storage'] = '128GB';
      specs['RAM'] = '8GB';
      specs['Camera'] = '48MP + 12MP + 12MP';
      specs['Battery'] = '4000mAh';
    } else if (product.category?.toLowerCase().includes('laptop')) {
      specs['Processor'] = 'Intel Core i5';
      specs['RAM'] = '8GB DDR4';
      specs['Storage'] = '512GB SSD';
      specs['Display'] = '15.6 inch FHD';
      specs['Graphics'] = 'Integrated';
    } else if (product.category?.toLowerCase().includes('shoe')) {
      specs['Material'] = 'Leather/Canvas';
      specs['Sole'] = 'Rubber';
      specs['Closure'] = 'Lace-up';
      specs['Style'] = 'Casual';
    }

    return specs;
  };

  const generateFeatures = (product) => {
    const features = [];
    
    if (product.category?.toLowerCase().includes('mobile')) {
      features.push('5G Compatible', 'Wireless Charging', 'Water Resistant', 'Face Recognition');
    } else if (product.category?.toLowerCase().includes('laptop')) {
      features.push('Backlit Keyboard', 'Fingerprint Reader', 'USB-C Ports', 'HDMI Output');
    } else if (product.category?.toLowerCase().includes('shoe')) {
      features.push('Comfortable Fit', 'Breathable', 'Durable', 'Lightweight');
    } else {
      features.push('High Quality', 'Durable', 'Modern Design', 'Best Value');
    }

    return features;
  };

  const handleAddToCart = (product) => {
    if (!user) {
      onAuthRequired();
      return;
    }
    onAddToCart(product);
  };

  const handleAddToWishlist = (product) => {
    if (!user) {
      onAuthRequired();
      return;
    }
    onAddToWishlist(product);
  };

  const getComparisonData = () => {
    if (comparisonProducts.length === 0) return [];

    const allSpecs = new Set();
    const allFeatures = new Set();

    comparisonProducts.forEach(product => {
      Object.keys(product.specifications).forEach(spec => allSpecs.add(spec));
      product.features.forEach(feature => allFeatures.add(feature));
    });

    return {
      specifications: Array.from(allSpecs),
      features: Array.from(allFeatures)
    };
  };

  const comparisonData = getComparisonData();

  if (!showComparison && comparisonProducts.length === 0) {
    return (
      <div className="product-comparison-widget">
        <div className="comparison-header">
          <Scale size={20} />
          <span>Product Comparison</span>
          <span className="comparison-count">0 items</span>
        </div>
        <div className="comparison-empty">
          <p>Add products to compare them side by side</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-comparison">
      {/* Comparison Widget */}
      {!showComparison && comparisonProducts.length > 0 && (
        <div className="comparison-widget">
          <div className="widget-header">
            <Scale size={20} />
            <span>Product Comparison</span>
            <span className="widget-count">{comparisonProducts.length} items</span>
          </div>
          <div className="widget-products">
            {comparisonProducts.slice(0, 3).map(product => (
              <div key={product.id} className="widget-product">
                <img src={product.imageUrl} alt={product.name} />
                <span className="product-name">{product.name}</span>
                <button 
                  className="remove-btn"
                  onClick={() => removeFromComparison(product.id)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {comparisonProducts.length > 3 && (
              <div className="widget-more">
                +{comparisonProducts.length - 3} more
              </div>
            )}
          </div>
          <Button onClick={() => setShowComparison(true)}>
            Compare Now
          </Button>
        </div>
      )}

      {/* Full Comparison View */}
      {showComparison && (
        <div className="comparison-full">
          <div className="comparison-header">
            <div className="header-left">
              <button 
                className="back-btn"
                onClick={() => setShowComparison(false)}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <h2>Product Comparison</h2>
              <span className="product-count">
                {comparisonProducts.length} products
              </span>
            </div>
            <div className="header-actions">
              <Button variant="outline" onClick={clearComparison}>
                <Trash2 size={16} className="mr-2" />
                Clear All
              </Button>
            </div>
          </div>

          {comparisonProducts.length === 0 ? (
            <div className="comparison-empty">
              <Scale size={48} className="empty-icon" />
              <h3>No products to compare</h3>
              <p>Add products from the catalog to start comparing</p>
            </div>
          ) : (
            <div className="comparison-content">
              {/* Products Row */}
              <div className="comparison-products">
                <div className="product-header">
                  <h3>Products</h3>
                </div>
                {comparisonProducts.map(product => (
                  <div key={product.id} className="comparison-product">
                    <div className="product-image">
                      <img src={product.imageUrl} alt={product.name} />
                      <button 
                        className="remove-product"
                        onClick={() => removeFromComparison(product.id)}
                      >
                        <XIcon size={16} />
                      </button>
                    </div>
                    <div className="product-info">
                      <h4 className="product-name">{product.name}</h4>
                      <div className="product-rating">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            className={i < Math.floor(product.rating || 0) ? 'filled' : ''}
                          />
                        ))}
                        <span className="rating-text">
                          ({product.rating || 0})
                        </span>
                      </div>
                      <div className="product-price">
                        Rs. {product.price?.toLocaleString()}
                      </div>
                      <div className="product-actions">
                        <Button 
                          size="sm"
                          onClick={() => handleAddToCart(product)}
                        >
                          <ShoppingCart size={14} className="mr-1" />
                          Add to Cart
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAddToWishlist(product)}
                        >
                          <Heart size={14} className="mr-1" />
                          Wishlist
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Specifications */}
              <div className="comparison-section">
                <div className="section-header">
                  <h3>Specifications</h3>
                </div>
                {comparisonData.specifications.map(spec => (
                  <div key={spec} className="spec-row">
                    <div className="spec-name">{spec}</div>
                    {comparisonProducts.map(product => (
                      <div key={product.id} className="spec-value">
                        {product.specifications[spec] || 'N/A'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="comparison-section">
                <div className="section-header">
                  <h3>Features</h3>
                </div>
                {comparisonData.features.map(feature => (
                  <div key={feature} className="feature-row">
                    <div className="feature-name">{feature}</div>
                    {comparisonProducts.map(product => (
                      <div key={product.id} className="feature-value">
                        {product.features.includes(feature) ? (
                          <Check size={16} className="feature-check" />
                        ) : (
                          <XIcon size={16} className="feature-x" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="comparison-section">
                <div className="section-header">
                  <h3>Description</h3>
                </div>
                <div className="description-row">
                  <div className="description-label">Details</div>
                  {comparisonProducts.map(product => (
                    <div key={product.id} className="description-value">
                      <p>{product.description || 'No description available'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductComparison; 