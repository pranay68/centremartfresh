import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ShoppingCart, 
  TrendingUp, 
  Eye, 
  Star, 
  MapPin, 
  Palette,
  Zap,
  Clock,
  AlertCircle,
  ThumbsUp,
  MessageCircle,
  Share2,
  Truck,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import './ProductCard.css';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

const ProductCard = ({ 
  product, 
  loading = false, 
  onProductClick,
  onQuickAdd,
  onWishlist,
  onCompare,
  onQuickView,
  isInWishlist = false,
  isInCompare = false,
  compact = false,
  onAuthRequired = null
}) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [showLocation, setShowLocation] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');
  const [isHovered, setIsHovered] = useState(false);
  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (!product?.id) return;
    const reviewsQuery = query(
      collection(db, 'productReviews'),
      where('productId', '==', product.id)
    );
    const unsub = onSnapshot(reviewsQuery, (snap) => {
      const reviews = snap.docs.map(doc => doc.data());
      setReviewCount(reviews.length);
      if (reviews.length) {
        const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
        setAvgRating(avg.toFixed(1));
      } else {
        setAvgRating(null);
      }
    });
    return () => unsub();
  }, [product?.id]);

  const themes = {
    default: { bg: '#667eea', text: 'white' },
    dark: { bg: '#1e293b', text: 'white' },
    green: { bg: '#059669', text: 'white' },
    purple: { bg: '#7c3aed', text: 'white' },
    orange: { bg: '#ea580c', text: 'white' }
  };

  const handleAuthRequired = () => {
    toast.error('Please sign in to continue');
    if (onAuthRequired) {
      onAuthRequired();
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    
    if (!user) {
      handleAuthRequired();
      return;
    }

    if (product) {
      if (onQuickAdd) {
        onQuickAdd(product);
      } else {
        addToCart(product);
        toast.success('Added to cart!');
      }
    }
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    
    if (!user) {
      handleAuthRequired();
      return;
    }

    if (product && onWishlist) {
      onWishlist(product);
    }
  };

  const handleCompare = (e) => {
    e.stopPropagation();
    
    if (!user) {
      handleAuthRequired();
      return;
    }

    if (product && onCompare) {
      onCompare(product);
    }
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    
    if (!user) {
      handleAuthRequired();
      return;
    }

    if (product && onQuickView) {
      onQuickView(product);
    }
  };

  const handleBuyNow = (e) => {
    e.stopPropagation();
    
    if (!user) {
      handleAuthRequired();
      return;
    }

    if (product && onProductClick) {
      onProductClick(product);
    }
  };

  const handleThemeChange = (e) => {
    e.stopPropagation();
    const themeKeys = Object.keys(themes);
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setCurrentTheme(themeKeys[nextIndex]);
  };

  const handleProductClick = () => {
    if (product && onProductClick) {
      onProductClick(product);
    }
  };

  if (loading) {
    return (
      <div className={`product-card loading ${compact ? 'compact' : ''}`}>
        <div className="product-image-skeleton"></div>
        <div className="product-content">
          <div className="product-title-skeleton"></div>
          <div className="product-price-skeleton"></div>
          <div className="product-actions-skeleton"></div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const theme = themes[currentTheme];
  const isOnSale = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = isOnSale 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const isLowStock = product.stock && product.stock <= 5 && product.stock > 0;
  const isOutOfStock = product.stock === 0;
  const hasFreeShipping = product.freeShipping || product.price > 1000;
  const isPrime = product.prime || product.fastDelivery;

  return (
    <div 
      className={`product-card ${isOnSale ? 'on-sale' : ''} ${isOutOfStock ? 'out-of-stock' : ''} ${isPrime ? 'prime' : ''}`}
      style={{ '--theme-bg': theme.bg, '--theme-text': theme.text }}
      onClick={handleProductClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="product-image-container">
        <img 
          src={product.imageUrl || product.image} 
          alt={product.name} 
          className="product-image"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x200?text=Product+Image';
          }}
        />
        {/* Sale/Discount Badge */}
        {isOnSale && (
          <div className="sale-badge">
            <Zap size={12} />
            <span>{discountPercentage}% OFF</span>
          </div>
        )}
      </div>
      <div className="product-content">
        <h3 className="product-title">{product.name}</h3>
        <div className="product-price-container">
          <span className="current-price">Rs {product.price}</span>
          {isOnSale && (
            <span className="original-price">Rs {product.originalPrice}</span>
          )}
          {isOnSale && (
            <span className="discount-badge">-{discountPercentage}%</span>
          )}
        </div>
        <div className="product-rating">
          {avgRating ? (
            <>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="star-icon" fill={i < Math.round(avgRating) ? '#fbbf24' : '#e5e7eb'} stroke="#fbbf24" />
              ))}
              <span className="review-count">({reviewCount})</span>
            </>
          ) : (
            <span className="review-count">No reviews</span>
          )}
        </div>
        <div className="product-actions">
          {!isOutOfStock ? (
            <>
              <button 
                className="btn btn-primary add-to-cart-btn"
                onClick={handleAddToCart}
              >
                <ShoppingCart size={16} />
                Add to Cart
              </button>
              <button 
                className="btn btn-secondary buy-now-btn"
                onClick={handleBuyNow}
              >
                Buy Now
              </button>
            </>
          ) : (
            <button 
              className="btn btn-disabled"
              disabled
            >
              Out of Stock
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;