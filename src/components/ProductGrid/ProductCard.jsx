import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { getStockStatus } from '../../utils/sortProducts';
import { getPrimaryImageOrPlaceholder } from '../../utils/imageHelper';

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
  onAuthRequired = null,
  showPrice = true
}) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLocation, setShowLocation] = useState(false);
  const [currentTheme] = useState('default');
  const [isHovered, setIsHovered] = useState(false);
  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);

  // Avoid attaching a Firestore realtime listener per card (can cause severe performance issues
  // when rendering many products). Use pre-computed values from product if available, otherwise
  // leave reviews info empty. Detailed review fetch will happen in product detail panel.
  useEffect(() => {
    if (!product) return;
    if (product.reviewCount || product.review_count) {
      setReviewCount(product.reviewCount || product.review_count || 0);
    } else {
      setReviewCount(0);
    }
    if (product.avgRating || product.avg_rating) {
      setAvgRating((product.avgRating || product.avg_rating).toFixed ? (product.avgRating || product.avg_rating).toFixed(1) : String(product.avgRating || product.avg_rating));
    } else {
      setAvgRating(null);
    }
  }, [product]);

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

  const invokedRef = useRef(false);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    
    if (!user) {
      handleAuthRequired();
      return;
    }

    if (product) {
      // Call callbacks asynchronously and guard them to avoid throwing
      if (onQuickAdd) {
        setTimeout(() => {
          try { onQuickAdd(product); } catch (err) { console.error('onQuickAdd error', err); }
        }, 0);
      } else {
        setTimeout(() => {
          try { if (addToCart) { addToCart(product); toast.success('Added to cart!'); } else { console.warn('addToCart not available'); } } catch (err) { console.error('addToCart error', err); }
        }, 0);
      }
    }
  };

  // Note: wishlist/compare/quickView handlers removed because they were not
  // used in this card markup. Reintroduce only if the UI adds buttons that
  // call these props to avoid unused-definition lint errors.

  const handleBuyNow = (e) => {
    e.stopPropagation();

    if (!user) {
      handleAuthRequired();
      return;
    }

    if (!product) return;

    // Save buy-now item to sessionStorage so Checkout can read it
    try {
      const buyNowItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.images?.[0] || product.image_urls?.[0] || product.image || '',
        quantity: 1
      };
      sessionStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
    } catch (err) {
      console.error('Failed to save buyNowItem to sessionStorage', err);
    }

    // Navigate to checkout and pass state as well for robustness
    try {
      navigate('/checkout', { state: { product } });
    } catch (err) {
      // fallback: set location
      try { window.location.href = '/checkout'; } catch (e) { console.error(e); }
    }
  };

  // Fast pointerdown handler to give instant response when tapping/clicking the card
  const handlePointerDownProduct = (e) => {
    try {
      // if pointerdown originated from action buttons, skip (they handle their own actions)
      if (e.target && e.target.closest && e.target.closest('.product-actions')) return;
      if (!product || !onProductClick) return;
      if (invokedRef.current) return;
      invokedRef.current = true;
      try { onProductClick(product); } catch (err) { console.error('onProductClick (pointerdown) error', err); }
      // reset shortly to allow other interactions
      setTimeout(() => { invokedRef.current = false; }, 400);
    } catch (err) {
      // ignore
    }
  };

  // Theme change control removed from this compact card — keep state but
  // change via parent if needed.

  const handleProductClick = () => {
    try {
      if (product && onProductClick) {
        // call asynchronously to avoid blocking the UI stack
        setTimeout(() => {
          try { onProductClick(product); } catch (err) { console.error('onProductClick handler error', err); }
        }, 0);
      }
    } catch (err) {
      // swallow any unexpected errors to avoid crashing the whole page
      console.error('handleProductClick error', err);
    }
  };

  // When navigating back to the home/list, ensure the products snapshot refreshes
  // to avoid stale UI artifacts. Parent/listener responds to this event.
  useEffect(() => {
    const unlisten = () => {};
    return () => { try { window.dispatchEvent(new Event('supabase_products_refresh')); } catch(e) {} };
  }, []);

  // Show 'frozen' badge if product is frozen
  const isFrozen = product?.frozen || false;

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
  const isOutOfStock = product.stock === 0;
  const isPrime = product.prime || product.fastDelivery;
  const stockStatus = getStockStatus(product.stock);

  return (
    <div 
      className={`product-card ${isOnSale ? 'on-sale' : ''} ${isOutOfStock ? 'out-of-stock' : ''} ${isPrime ? 'prime' : ''} ${stockStatus}`}
      style={{ '--theme-bg': theme.bg, '--theme-text': theme.text }}
      onClick={handleProductClick}
      onPointerDown={handlePointerDownProduct}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isFrozen && (
        <div className="frozen-badge" style={{ position: 'absolute', top: 8, left: 8, background: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>
          Frozen
        </div>
      )}
      <div className="product-image-container">
        <img 
          src={(function(){ try { return getPrimaryImageOrPlaceholder(product); } catch(e){ console.error('image helper failed', e); return null; } })() || 'https://via.placeholder.com/300x200?text=Product+Image'}
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