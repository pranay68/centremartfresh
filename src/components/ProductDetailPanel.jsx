import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaShoppingCart, FaMapMarkerAlt, FaStar, FaTruck, FaShieldAlt, FaUndo, FaClock, FaCreditCard } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import './ProductDetailPanel.css';
import RatingAndReviews from './RatingAndReviews';
import ProductQA from './ProductQA';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import CustomerSupportChat from './CustomerSupportChat';

const ProductDetailPanel = ({ product, onClose }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [reviews, setReviews] = useState([]);
  const [qna, setQna] = useState([]);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!product?.id) return;
    // Reviews
    const reviewsQuery = query(
      collection(db, 'productReviews'),
      where('productId', '==', product.id),
      orderBy('createdAt', 'desc')
    );
    const unsubReviews = onSnapshot(reviewsQuery, (snap) => {
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    // Q&A
    const qnaQuery = query(
      collection(db, 'productQnA'),
      where('productId', '==', product.id),
      orderBy('createdAt', 'desc')
    );
    const unsubQna = onSnapshot(qnaQuery, (snap) => {
      setQna(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubReviews(); unsubQna(); };
  }, [product?.id]);

  const deliveryAreas = [
    'kadam chowk', 'bhanu chowk', 'siva chowk', 'pirari chowk',
    'mills area', 'thapa chowk', 'murli chowk', 'campus chowk',
    'railway station area', 'janaki chowk', 'janak chowk'
  ];

  if (!product) return null;

  const images = [product.imageUrl, ...(product.additionalImages || [])];

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    const finalPrice = Math.round(calculatePrice(quantity));
    navigate('/checkout', { 
      state: { 
        product: { 
          ...product, 
          quantity,
          finalPrice,
          hasBulkDiscount: quantity >= 6,
          originalTotal: product.price * quantity,
          savings: quantity >= 6 ? Math.round(product.price * quantity * 0.01) : 0
        } 
      } 
    });
  };

  const calculatePrice = (qty) => {
    const basePrice = product.price || 0;
    const totalPrice = basePrice * qty;
    if (qty >= 6) {
      return totalPrice * 0.99; // 1% discount for 6 or more items
    }
    return totalPrice;
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  const handleSubmitReview = async ({ rating, text }) => {
    // TODO: Add user info if available
    await addDoc(collection(db, 'productReviews'), {
      productId: product.id,
      userName: 'Anonymous',
      rating,
      text,
      createdAt: serverTimestamp(),
    });
  };

  const handleSubmitQnA = async ({ question }) => {
    // TODO: Add user info if available
    await addDoc(collection(db, 'productQnA'), {
      productId: product.id,
      userName: 'Anonymous',
      question,
      answer: '',
      createdAt: serverTimestamp(),
    });
  };

  const handleContactSeller = () => {
    // Dispatch a custom event to open global chat in Home with an initial message
    const message = `Hi, is "${product.name}" available right now?`;
    const event = new CustomEvent('open-support-chat', { detail: { initialMessage: message } });
    window.dispatchEvent(event);
    setShowChat(true); // Fallback if chat is rendered here instead of globally
  };

  return (
    <div className="product-detail-panel">
      <div className="panel-header">
        <button className="return-btn" onClick={onClose}>
          <FaArrowLeft />
          Back to Products
        </button>
        <div className="panel-title">Product Details</div>
      </div>

      <div className="panel-content">
        {/* Main Product Section - 3 Columns: Image | Info | Delivery */}
        <div className="product-main-section">
          {/* Left Column - Image Gallery */}
          <div className="product-gallery">
            <div className="main-image-container">
              <img 
                src={images[selectedImage]} 
                alt={product.name}
                className="main-image"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/500x500?text=Product+Image';
                }}
              />
            </div>
            
            {images.length > 1 && (
              <div className="thumbnail-images">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/80x80?text=Image';
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Middle Column - Product Info */}
          <div className="product-info">
            {/* Product Title */}
            <h1 className="product-name">{product.name}</h1>
            
            {/* Ratings */}
            <div className="product-rating">
              <div className="stars">
                {(() => {
                  const avg = reviews.length ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0;
                  return [1,2,3,4,5].map(star => (
                    <FaStar key={star} className={star <= Math.round(avg) ? 'filled' : 'empty'} />
                  ));
                })()}
              </div>
              <span className="rating-text">
                {reviews.length ? `${(reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)} (${reviews.length} review${reviews.length > 1 ? 's' : ''})` : 'No reviews yet'}
              </span>
            </div>

            {/* Price Section */}
            <div className="product-price-section">
              <div className="price">Rs {Math.round(calculatePrice(quantity))}</div>
              {product.originalPrice && product.originalPrice > product.price && (
                <div className="original-price">Rs {product.originalPrice}</div>
              )}
              {product.discount && (
                <div className="discount-badge">{product.discount}% OFF</div>
              )}
              {quantity >= 6 && (
                <div className="bulk-discount-badge">1% bulk discount applied</div>
              )}
            </div>

            {/* Total Price */}
            <div className="total-price-section">
              <span>Total: Rs {Math.round(calculatePrice(quantity))}</span>
              {quantity >= 6 && (
                <span className="savings">You save: Rs {Math.round(product.price * quantity * 0.01)}</span>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="quantity-selector">
              <label>Quantity:</label>
              <div className="quantity-controls">
                <button 
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span>{quantity}</span>
                <button 
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= 99}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="btn btn-primary add-to-cart" onClick={handleAddToCart}>
                <FaShoppingCart />
                Add to Cart
              </button>
              <button className="btn btn-secondary buy-now" onClick={handleBuyNow}>
                Buy Now
              </button>
              <button
                className="btn btn-outline contact-seller"
                onClick={handleContactSeller}
                title="Chat with seller to check availability"
                onMouseEnter={() => {/* tooltip hint via title */}}
              >
                Contact Seller
              </button>
            </div>

            {/* Product Benefits */}
            <div className="product-benefits">
              <div className="benefit-item">
                <FaTruck />
                <div>
                  <h4>Free Shipping</h4>
                  <p>On orders over $50</p>
                </div>
              </div>
              <div className="benefit-item">
                <FaShieldAlt />
                <div>
                  <h4>Secure Payment</h4>
                  <p>100% secure checkout</p>
                </div>
              </div>
              <div className="benefit-item">
                <FaUndo />
                <div>
                  <h4>Easy Returns</h4>
                  <p>30-day return policy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Delivery Options */}
          <div className="delivery-section">
            <div className="delivery-card">
              <h3 className="delivery-title">🚚 Delivery Options</h3>
              
              {/* Location Selector */}
              <div className="location-selector">
                <label>📍 Select Delivery Area:</label>
                <select 
                  value={selectedLocation} 
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="location-select"
                >
                  <option value="">Choose your area</option>
                  {deliveryAreas.map(area => (
                    <option key={area} value={area}>
                      {area.charAt(0).toUpperCase() + area.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div className="payment-method">
                <FaCreditCard className="payment-icon" />
                <div className="payment-info">
                  <span className="payment-label">Payment Method:</span>
                  <span className="payment-value">Cash on Delivery</span>
                </div>
              </div>

              {/* Delivery Time */}
              <div className="delivery-time">
                <FaClock className="time-icon" />
                <div className="time-info">
                  <span className="time-label">Delivery Time:</span>
                  <span className="time-value">Under 2 hours</span>
                </div>
              </div>

              {/* Delivery Charge */}
              <div className="delivery-charge">
                <FaTruck className="charge-icon" />
                <div className="charge-info">
                  <span className="charge-label">Delivery Charge:</span>
                  <span className="charge-value">Free</span>
                </div>
              </div>
            </div>

            {/* Fastest Delivery Highlight */}
            <div className="fastest-delivery">
              <div className="delivery-highlight">
                <FaTruck className="highlight-icon" />
                <div className="highlight-content">
                  <h4>Fastest Delivery in Janakpur</h4>
                  <p>Under 20 minutes to 5 hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrolling Content - Description and Specs */}
        <div className="product-details-section">
          {product.description && (
            <div className="product-description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>
          )}

          {product.features && product.features.length > 0 && (
            <div className="product-features">
              <h3>Key Features</h3>
              <ul>
                {product.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {product.specifications && (
            <div className="product-specifications">
              <h3>Specifications</h3>
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

          {/* Add demo reviews and Q&A after the product.specifications block */}
          {(
            <div className="product-reviews-qna">
              <RatingAndReviews reviews={reviews} onSubmitReview={handleSubmitReview} />
              <ProductQA productId={product.id} productName={product.name} />
            </div>
          )}
        </div>
      </div>
      {showChat && (
        <CustomerSupportChat
          isOpen={true}
          onClose={() => setShowChat(false)}
          customerId={null}
          customerName={null}
          initialMessage={`Hi, is "${product.name}" available right now?`}
        />
      )}
    </div>
  );
};

export default ProductDetailPanel; 