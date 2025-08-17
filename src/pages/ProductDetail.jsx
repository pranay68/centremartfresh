import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Heart, 
  Share2, 
  Star, 
  Truck, 
  Shield,
  Check,
  AlertCircle,
  Minus,
  Plus,
  Eye,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Camera,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  Package,
  Clock,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ReviewCard from '../components/ReviewCard';
import './ProductDetail.css';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import publicProducts from '../utils/publicProducts';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [qna, setQna] = useState([]);
  const [stats, setStats] = useState({ responseRate: 100, deliverySpeed: 100, productDescribed: 100 });
  const { user } = useAuth();
  const [reviewForm, setReviewForm] = useState({ rating: 0, text: '', photo: null });
  const [qnaForm, setQnaForm] = useState({ question: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingQna, setSubmittingQna] = useState(false);

  // Mock product data
  const mockProduct = {
    id: id,
    name: "Premium Wireless Bluetooth Headphones",
    brand: "SoundMaster",
    price: 2499,
    originalPrice: 3499,
    rating: 4.5,
    reviewCount: 1247,
    stock: 15,
    description: "Experience crystal clear sound with our premium wireless headphones. Features noise cancellation, 30-hour battery life, and premium comfort.",
    features: [
      "Active Noise Cancellation",
      "30-hour battery life",
      "Bluetooth 5.0",
      "Premium comfort design",
      "Built-in microphone",
      "Quick charge support"
    ],
    specifications: {
      "Connectivity": "Bluetooth 5.0",
      "Battery Life": "30 hours",
      "Charging Time": "2 hours",
      "Weight": "250g",
      "Warranty": "2 years",
      "Color": "Black, White, Blue"
    },
    images: [
      "https://via.placeholder.com/500x500?text=Headphones+1",
      "https://via.placeholder.com/500x500?text=Headphones+2",
      "https://via.placeholder.com/500x500?text=Headphones+3",
      "https://via.placeholder.com/500x500?text=Headphones+4"
    ],
    variants: [
      { id: 1, color: "Black", price: 2499, stock: 15 },
      { id: 2, color: "White", price: 2499, stock: 8 },
      { id: 3, color: "Blue", price: 2699, stock: 5 }
    ],
    reviews: [
      {
        id: 1,
        author: "John Doe",
        rating: 5,
        title: "Excellent sound quality!",
        comment: "These headphones are amazing! The sound quality is crystal clear and the noise cancellation works perfectly. Battery life is impressive too.",
        date: "2024-01-15",
        helpfulCount: 23,
        notHelpfulCount: 2,
        verified: true,
        images: ["https://via.placeholder.com/200x200?text=Review+1"]
      },
      {
        id: 2,
        author: "Sarah Smith",
        rating: 4,
        title: "Great value for money",
        comment: "Good quality headphones at a reasonable price. Comfortable to wear for long periods. Only giving 4 stars because the app could be better.",
        date: "2024-01-10",
        helpfulCount: 15,
        notHelpfulCount: 1,
        verified: true
      }
    ],
    relatedProducts: [
      {
        id: "rel1",
        name: "Wireless Earbuds Pro",
        price: 1899,
        originalPrice: 2499,
        rating: 4.3,
        reviewCount: 856,
        image: "https://via.placeholder.com/300x200?text=Earbuds",
        stock: 25,
        prime: true,
        freeShipping: true
      },
      {
        id: "rel2",
        name: "Bluetooth Speaker",
        price: 1299,
        rating: 4.1,
        reviewCount: 432,
        image: "https://via.placeholder.com/300x200?text=Speaker",
        stock: 12
      }
    ],
    prime: true,
    freeShipping: true,
    location: "Karachi, Pakistan",
    seller: "SoundMaster Official",
    returnPolicy: "30 days return policy",
    warranty: "2 years manufacturer warranty"
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        // Ensure local snapshot is loaded
        await publicProducts.ensureLoaded();
        // Try to find product in local snapshot
        const local = publicProducts.getById(id);
        if (local && mounted) {
          // Normalize fields to the shape this component expects
          const normalized = {
            id: local.id,
            name: local.name || local.raw?.name || local.raw?.Description || '',
            brand: local.brand || local.supplierName || '',
            price: local.price ?? local.sp ?? 0,
            originalPrice: local.mrp ?? null,
            rating: local.rating ?? 0,
            reviewCount: local.reviewCount ?? 0,
            stock: local.stock ?? 0,
            description: local.raw?.Description || local.raw?.description || '',
            features: local.features || [],
            specifications: local.specifications || {},
            images: Array.isArray(local.image_urls) && local.image_urls.length ? local.image_urls.slice() : (Array.isArray(local.images) && local.images.length ? local.images.slice() : (local.imageUrl ? [local.imageUrl] : [])),
            image_urls: Array.isArray(local.image_urls) ? local.image_urls.slice() : (Array.isArray(local.images) ? local.images.slice() : (local.imageUrl ? [local.imageUrl] : [])),
            variants: local.variants || [],
            reviews: [],
            relatedProducts: [],
            prime: !!local.prime,
            freeShipping: !!local.freeShipping,
            location: local.location || '',
            seller: local.supplierName || local.seller || '',
            returnPolicy: local.returnPolicy || '',
            warranty: local.warranty || ''
          };
          setProduct(normalized);
          setLoading(false);
          return;
        }
      } catch (err) {
        // ignore and fall back to Firestore
        console.warn('publicProducts load failed', err);
      }

      // Fallback: try Firestore product document/query
      try {
        // First try by doc id
        const q = query(collection(db, 'products'), where('id', '==', id));
        const snap = await getDocs(q);
        if (mounted && snap && !snap.empty) {
          const doc = snap.docs[0];
          setProduct({ id: doc.id, ...doc.data() });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Firestore product fetch failed', e);
      }

      // Last-resort: use mock product so UI doesn't crash
      if (mounted) {
        setProduct(mockProduct);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // Fetch reviews and Q&A from Firestore
  useEffect(() => {
    if (!id) return;
    // Reviews
    const reviewsQuery = query(collection(db, 'productReviews'), where('productId', '==', id), orderBy('createdAt', 'desc'));
    const unsubReviews = onSnapshot(reviewsQuery, (snap) => {
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    // Q&A
    const qnaQuery = query(collection(db, 'productQnA'), where('productId', '==', id), orderBy('createdAt', 'desc'));
    const unsubQna = onSnapshot(qnaQuery, (snap) => {
      setQna(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    // TODO: Calculate stats from reviews and Q&A
    // setStats({ ... });
    return () => { unsubReviews(); unsubQna(); };
  }, [id]);

  // Calculate stats
  useEffect(() => {
    if (!reviews.length) return setStats({ responseRate: 100, deliverySpeed: 100, productDescribed: 100 });
    const total = reviews.length;
    const described = reviews.filter(r => (r.rating || 0) >= 4).length;
    setStats({
      responseRate: qna.length ? Math.round((qna.filter(q => q.answer).length / qna.length) * 100) : 100,
      deliverySpeed: 100, // always positive
      productDescribed: Math.round((described / total) * 100)
    });
  }, [reviews, qna]);

  // Calculate average rating and breakdown
  const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0';
  const ratingCounts = [5,4,3,2,1].map(star => reviews.filter(r => r.rating === star).length);

  // Submit review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.rating || !reviewForm.text) return;
    setSubmittingReview(true);
    await addDoc(collection(db, 'productReviews'), {
      productId: id,
      userId: user?.uid || 'guest',
      userName: user?.displayName || user?.email || 'Anonymous',
      rating: reviewForm.rating,
      text: reviewForm.text,
      photo: reviewForm.photo || null,
      createdAt: serverTimestamp(),
      verified: true // TODO: Only allow if user purchased
    });
    setReviewForm({ rating: 0, text: '', photo: null });
    setSubmittingReview(false);
  };
  // Submit QnA
  const handleQnaSubmit = async (e) => {
    e.preventDefault();
    if (!qnaForm.question) return;
    setSubmittingQna(true);
    await addDoc(collection(db, 'productQnA'), {
      productId: id,
      userId: user?.uid || 'guest',
      userName: user?.displayName || user?.email || 'Anonymous',
      question: qnaForm.question,
      answer: '',
      answeredBy: '',
      createdAt: serverTimestamp(),
      isOfficial: false
    });
    setQnaForm({ question: '' });
    setSubmittingQna(false);
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;
    setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    try {
      if (!product) {
        console.warn('handleAddToCart called without product');
        return;
      }
      setIsInCart(true);
      // Add to cart logic here - guard against missing cart context in consumer
      const event = new CustomEvent('add-to-cart', { detail: { productId: product.id, quantity } });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error in handleAddToCart (ProductDetail):', err);
    }
  };

  const handleBuyNow = () => {
    try {
      // Save product and quantity to sessionStorage for checkout
      if (product) {
        const buyNowItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: (product.images?.[0] || product.image_urls?.[0] || product.image || ''),
          quantity: quantity,
          finalPrice: (() => {
            const base = (product.price || 0) * quantity;
            if (quantity >= 6) return Math.round(base * 0.99);
            return Math.round(base);
          })(),
          hasBulkDiscount: quantity >= 6
        };
        try { sessionStorage.setItem('buyNowItem', JSON.stringify(buyNowItem)); } catch (e) { console.error('Failed to save buyNowItem', e); }
      }
      navigate('/checkout');
    } catch (err) {
      console.error('Error in handleBuyNow (ProductDetail):', err);
    }
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href
      });
    }
  };

  const handleBack = async () => {
    try { window.dispatchEvent(new Event('close-all-modals')); } catch (e) {}
    try { await publicProducts.refresh(); } catch (e) {}
    try {
      // Use history.back and reload once the popstate fires to guarantee a clean UI
      let popped = false;
      const onPop = () => {
        popped = true;
        try { window.location.reload(); } catch (e) {}
      };
      window.addEventListener('popstate', onPop, { once: true });
      // Go back in history
      window.history.back();
      // Fallback: if popstate didn't fire in 700ms, reload anyway
      setTimeout(() => {
        if (!popped) {
          try { window.location.reload(); } catch (e) {}
        }
      }, 700);
    } catch (e) {
      try { window.location.href = '/'; } catch (err) {}
    }
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
  };

  const calculateDiscount = () => {
    if (!product.originalPrice || product.originalPrice <= product.price) return 0;
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        className={index < rating ? 'star-filled' : 'star-empty'}
      />
    ));
  };

  if (loading) {
    return (
      <div className="product-detail-loading">
        <div className="loading-skeleton">
          <div className="image-skeleton"></div>
          <div className="content-skeleton">
            <div className="title-skeleton"></div>
            <div className="price-skeleton"></div>
            <div className="description-skeleton"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="product-not-found">Product not found</div>;
  }

  const discount = calculateDiscount();
  const isLowStock = product.stock <= 5 && product.stock > 0;
  const isOutOfStock = product.stock === 0;

  return (
    <div className="product-detail">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button onClick={handleBack} className="back-btn">
          <ArrowLeft size={16} />
          Back
        </button>
        <span>Electronics</span>
        <span>Audio</span>
        <span>{product.name}</span>
      </div>

      <div className="product-detail-content">
        {/* Left-side stats panel */}
        <div className="product-stats-panel">
          <h4>Product Stats</h4>
          <div className="stat-row"><span>Seller Response Rate</span><span>{stats.responseRate}%</span></div>
          <div className="stat-row"><span>Delivery Speed</span><span className="stat-positive">{stats.deliverySpeed}%</span></div>
          <div className="stat-row"><span>Product as Described</span><span>{stats.productDescribed}%</span></div>
        </div>
        {/* Main product info and images */}
        <div className="product-main-content">
        {/* Product Images */}
        <div className="product-images">
          <div className="main-image">
            <img 
              src={(Array.isArray(product.image_urls) && product.image_urls.length>0) ? product.image_urls[selectedImage] : (Array.isArray(product.images) ? product.images[selectedImage] : (product.image_url || product.imageUrl || product.image || ''))}
              alt={product.name}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/500x500?text=Product+Image';
              }}
            />
            <button className="zoom-btn">
              <ZoomIn size={20} />
            </button>
          </div>
          
          <div className="image-thumbnails">
            {(Array.isArray(product.image_urls) && product.image_urls.length>0 ? product.image_urls : (Array.isArray(product.images) ? product.images : [])).map((image, index) => (
              <button
                key={index}
                className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                onClick={() => setSelectedImage(index)}
              >
                <img 
                  src={image} 
                  alt={`${product.name} ${index + 1}`}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/100x100?text=Thumbnail';
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="product-info">
          <div className="product-header">
            <h1 className="product-title">{product.name}</h1>
            <div className="product-brand">by {product.brand}</div>
            
            <div className="product-rating">
              <div className="stars" style={{ cursor: 'pointer' }} onClick={() => {
                const el = document.querySelector('.ratings-summary-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}>
                {renderStars(Math.round(avgRating))}
              </div>
              <span className="rating-text">{avgRating}</span>
              <span className="review-count">({reviews.length} reviews)</span>
              <button 
                className="view-reviews-btn"
                onClick={() => setShowReviews(true)}
              >
                View all reviews
              </button>
            </div>
          </div>

          <div className="product-price">
            <span className="current-price">Rs {product.price}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <>
                <span className="original-price">Rs {product.originalPrice}</span>
                <span className="discount-badge">{discount}% OFF</span>
              </>
            )}
          </div>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="product-variants">
              <h4>Color:</h4>
              <div className="variant-options">
                {product.variants.map(variant => (
                  <button
                    key={variant.id}
                    className={`variant-btn ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
                    onClick={() => handleVariantSelect(variant)}
                  >
                    {variant.color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock Status */}
          <div className="stock-status">
            {isOutOfStock ? (
              <div className="out-of-stock">
                <AlertCircle size={16} />
                <span>Out of stock</span>
              </div>
            ) : isLowStock ? (
              <div className="low-stock">
                <AlertCircle size={16} />
                <span>Only {product.stock} left in stock</span>
              </div>
            ) : (
              <div className="in-stock">
                <Check size={16} />
                <span>In stock</span>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="quantity-selector">
            <label>Quantity:</label>
            <div className="quantity-controls">
              <button 
                className="quantity-btn"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus size={14} />
              </button>
              <span className="quantity-display">{quantity}</span>
              <button 
                className="quantity-btn"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={isOutOfStock || quantity >= product.stock}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="product-actions">
            {!isOutOfStock ? (
              <>
                <button 
                  className="btn btn-primary add-to-cart-btn"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart size={20} />
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
              <button className="btn btn-disabled" disabled>
                Out of Stock
              </button>
            )}
            
            <button 
              className={`btn btn-outline wishlist-btn ${isWishlisted ? 'active' : ''}`}
              onClick={handleWishlist}
            >
              <Heart size={20} />
              {isWishlisted ? 'Wishlisted' : 'Wishlist'}
            </button>
            
            <button 
              className="btn btn-outline share-btn"
              onClick={handleShare}
            >
              <Share2 size={20} />
              Share
            </button>
          </div>

          {/* Delivery Info */}
          <div className="delivery-info">
            {product.freeShipping && (
              <div className="delivery-option">
                <Truck size={16} />
                <span>Free delivery by Tomorrow</span>
              </div>
            )}
            
            {product.prime && (
              <div className="delivery-option">
                <Shield size={16} />
                <span>Prime - Fast delivery</span>
              </div>
            )}
            
            <div className="delivery-option">
              <Package size={16} />
              <span>Easy returns</span>
            </div>
          </div>

          {/* Seller Info */}
          <div className="seller-info">
            <h4>Sold by {product.seller}</h4>
            <div className="seller-details">
              <div className="seller-location">
                <MapPin size={14} />
                <span>{product.location}</span>
              </div>
              <div className="seller-contact">
                <Phone size={14} />
                <span>Contact seller</span>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Ratings summary & breakdown */}
        <div className="ratings-summary-section">
          <h3>Reviews ({reviews.length})</h3>
          <div className="ratings-summary">
            <div className="avg-rating">
              <span className="avg-rating-number">{avgRating}</span>
              <span className="stars">{renderStars(Math.round(avgRating))}</span>
              <span className="total-reviews">({reviews.length} reviews)</span>
            </div>
            <div className="rating-breakdown">
              {ratingCounts.map((count, i) => (
                <div className="rating-bar-row" key={5-i}>
                  <span>{5-i} a</span>
                  <div className="rating-bar"><div className="rating-bar-fill" style={{width: reviews.length ? `${(count/reviews.length)*100}%` : 0}}></div></div>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews list */}
        <div className="reviews-section">
          <h4>Customer Reviews</h4>
          <div className="reviews-list">
            {reviews.length === 0 && <div className="no-reviews">No reviews yet.</div>}
            {reviews.map(r => (
              <div className="review-item" key={r.id}>
                <div className="review-header">
                  {/* Customer PFP (placeholder if not available) */}
                  <img
                    src={r.userPhoto || '/default-pfp.png'}
                    alt="pfp"
                    className="review-pfp"
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', marginRight: 12 }}
                  />
                  {/* Customer name (first 3 chars, rest as *) */}
                  <span className="review-author">
                    {r.userName ? `${r.userName.slice(0,3)}${'*'.repeat(Math.max(0, r.userName.length-3))}` : '***'}
                  </span>
                  <span className="review-rating">{renderStars(r.rating)}</span>
                  <span className="review-date">{r.createdAt?.toDate?.().toLocaleDateString?.() || ''}</span>
                </div>
                <div className="review-body">{r.text}</div>
                {/* Show review images/videos if present */}
                {Array.isArray(r.media) && r.media.length > 0 && (
                  <div className="review-media">
                    {r.media.map((url, idx) => url.match(/\.(mp4|webm|ogg)$/i)
                      ? <video key={idx} src={url} controls style={{ maxWidth: 120, borderRadius: 8, marginRight: 8 }} />
                      : <img key={idx} src={url} alt="Review media" style={{ maxWidth: 120, borderRadius: 8, marginRight: 8 }} />
                    )}
                  </div>
                )}
                {/* If only photo field (legacy) */}
                {r.photo && (
                  <img src={r.photo} alt="Review" className="review-photo" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Q&A section */}
        <div className="qna-section">
          <h4>Questions & Answers</h4>
          <div className="qna-list">
            {qna.length === 0 && <div className="no-qna">No questions yet.</div>}
            {qna.map(q => (
              <div className="qna-item" key={q.id}>
                <div className="qna-question">
                  <span className="qna-user">{q.userName ? `${q.userName.slice(0,3)}${'*'.repeat(Math.max(0, q.userName.length-3))}` : '***'}:</span> {q.question}
                </div>
                {q.answer ? (
                  <div className="qna-answer"><span className="qna-answered-by">Store:</span> {q.answer}</div>
                ) : (
                  <div className="qna-unanswered">No answer yet.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Tabs */}
      <div className="product-tabs">
        <div className="tab-headers">
          <button 
            className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => setActiveTab('description')}
          >
            Description
          </button>
          <button 
            className={`tab-btn ${activeTab === 'specifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('specifications')}
          >
            Specifications
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews ({product.reviews.length})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'description' && (
            <div className="description-tab">
              <h3>Product Description</h3>
              <p>{product.description}</p>
              
              <h4>Key Features</h4>
              <ul className="features-list">
                {product.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="specifications-tab">
              <h3>Technical Specifications</h3>
              <div className="specs-grid">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="spec-item">
                    <span className="spec-label">{key}:</span>
                    <span className="spec-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="reviews-tab">
              <div className="reviews-header">
                <h3>Customer Reviews</h3>
                <div className="reviews-summary">
                  <div className="overall-rating">
                    <span className="rating-number">{product.rating}</span>
                    <div className="stars">{renderStars(product.rating)}</div>
                    <span className="total-reviews">{product.reviewCount} reviews</span>
                  </div>
                </div>
              </div>
              
              <div className="reviews-list">
                {product.reviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      <div className="related-products">
        <h3>Customers also bought</h3>
        <div className="related-products-grid">
          {product.relatedProducts.map(relatedProduct => (
            <ProductCard 
              key={relatedProduct.id} 
              product={relatedProduct}
              onProductClick={(product) => navigate(`/product/${product.id}`)}
              compact={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
