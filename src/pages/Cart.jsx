import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Trash2, 
  Heart, 
  Save, 
  Truck, 
  Shield,
  Lock,
  CreditCard,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Package,
  Clock
} from 'lucide-react';
import CartItem from '../components/CartItem';
import './Cart.css';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Mock cart data
  const mockCartItems = [
    {
      id: 1,
      name: "Premium Wireless Bluetooth Headphones",
      price: 2499,
      originalPrice: 3499,
      quantity: 1,
      stock: 15,
      image: "https://via.placeholder.com/300x200?text=Headphones",
      brand: "SoundMaster",
      color: "Black",
      size: "Standard",
      rating: 4.5,
      reviewCount: 1247,
      features: ["Noise Cancellation", "30-hour battery"],
      prime: true,
      freeShipping: true,
      location: "Karachi, Pakistan"
    },
    {
      id: 2,
      name: "Smart Fitness Watch",
      price: 1899,
      quantity: 2,
      stock: 8,
      image: "https://via.placeholder.com/300x200?text=Watch",
      brand: "FitTech",
      color: "Blue",
      size: "Large",
      rating: 4.2,
      reviewCount: 856,
      features: ["Heart Rate Monitor", "GPS Tracking"],
      prime: true,
      freeShipping: true,
      location: "Lahore, Pakistan"
    },
    {
      id: 3,
      name: "Wireless Gaming Mouse",
      price: 899,
      originalPrice: 1299,
      quantity: 1,
      stock: 25,
      image: "https://via.placeholder.com/300x200?text=Mouse",
      brand: "GamePro",
      color: "RGB",
      size: "Medium",
      rating: 4.7,
      reviewCount: 2341,
      features: ["RGB Lighting", "Programmable Buttons"],
      freeShipping: true,
      location: "Islamabad, Pakistan"
    }
  ];

  const mockSavedItems = [
    {
      id: 4,
      name: "Bluetooth Speaker",
      price: 1299,
      image: "https://via.placeholder.com/300x200?text=Speaker",
      brand: "AudioMax",
      rating: 4.1,
      reviewCount: 432
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCartItems(mockCartItems);
      setSavedItems(mockSavedItems);
      setLoading(false);
    }, 1000);
  }, []);

  const handleQuantityChange = (itemId, newQuantity) => {
    setCartItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  const handleMoveToWishlist = (item) => {
    handleRemoveItem(item.id);
    // Add to wishlist logic here
  };

  const handleSaveForLater = (item) => {
    handleRemoveItem(item.id);
    setSavedItems(prev => [...prev, item]);
  };

  const handleSelectForComparison = (item) => {
    // Add to comparison logic here
  };

  const handleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map(item => item.id)));
    }
  };

  const calculateSubtotal = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id))
      .reduce((total, item) => {
        const price = item.originalPrice && item.originalPrice > item.price 
          ? item.originalPrice 
          : item.price;
        return total + (price * item.quantity);
      }, 0);
  };

  const calculateDiscount = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id))
      .reduce((total, item) => {
        if (item.originalPrice && item.originalPrice > item.price) {
          return total + ((item.originalPrice - item.price) * item.quantity);
        }
        return total;
      }, 0);
  };

  const calculateShipping = () => {
    const selectedItemsList = cartItems.filter(item => selectedItems.has(item.id));
    const hasFreeShipping = selectedItemsList.some(item => item.freeShipping);
    return hasFreeShipping ? 0 : 200;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount() + calculateShipping();
  };

  const getSelectedItemsCount = () => {
    return selectedItems.size;
  };

  const getTotalItemsCount = () => {
    return cartItems.length;
  };

  if (loading) {
    return (
      <div className="cart-loading">
        <div className="loading-skeleton">
          <div className="header-skeleton"></div>
          <div className="items-skeleton">
            <div className="item-skeleton"></div>
            <div className="item-skeleton"></div>
            <div className="item-skeleton"></div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="empty-cart">
        <div className="empty-cart-content">
          <ShoppingCart size={64} className="empty-cart-icon" />
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added any items to your cart yet.</p>
          <button className="btn btn-primary" onClick={() => window.history.back()}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Shopping Cart ({getTotalItemsCount()} items)</h1>
        <div className="cart-actions">
          <button 
            className="select-all-btn"
            onClick={handleSelectAll}
          >
            {selectedItems.size === cartItems.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          <div className="cart-items-header">
            <div className="items-count">
              {getSelectedItemsCount()} of {getTotalItemsCount()} items selected
            </div>
            <div className="items-actions">
              <button className="action-btn">
                <Trash2 size={16} />
                Delete Selected
              </button>
              <button className="action-btn">
                <Save size={16} />
                Save for Later
              </button>
            </div>
          </div>

          <div className="cart-items-list">
            {cartItems.map(item => (
              <div key={item.id} className="cart-item-wrapper">
                <div className="item-selection">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => handleItemSelection(item.id)}
                  />
                </div>
                <CartItem
                  item={item}
                  onUpdateQuantity={handleQuantityChange}
                  onRemove={handleRemoveItem}
                  onMoveToWishlist={handleMoveToWishlist}
                  onSaveForLater={handleSaveForLater}
                  onSelectForComparison={handleSelectForComparison}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="cart-summary">
          <div className="summary-header">
            <h3>Order Summary</h3>
          </div>

          <div className="summary-content">
            <div className="summary-row">
              <span>Subtotal ({getSelectedItemsCount()} items):</span>
              <span>Rs {calculateSubtotal().toLocaleString()}</span>
            </div>
            
            {calculateDiscount() > 0 && (
              <div className="summary-row discount">
                <span>Discount:</span>
                <span>-Rs {calculateDiscount().toLocaleString()}</span>
              </div>
            )}
            
            <div className="summary-row">
              <span>Shipping:</span>
              <span>
                {calculateShipping() === 0 ? (
                  <span className="free-shipping">Free</span>
                ) : (
                  `Rs ${calculateShipping()}`
                )}
              </span>
            </div>

            <div className="summary-total">
              <span>Total:</span>
              <span>Rs {calculateTotal().toLocaleString()}</span>
            </div>

            <div className="summary-benefits">
              <div className="benefit">
                <CheckCircle size={16} />
                <span>Free delivery on orders over Rs 1000</span>
              </div>
              <div className="benefit">
                <Shield size={16} />
                <span>Secure checkout</span>
              </div>
              <div className="benefit">
                <Package size={16} />
                <span>Easy returns</span>
              </div>
            </div>

            <button className="btn btn-primary checkout-btn">
              <Lock size={16} />
              Proceed to Checkout
              <ArrowRight size={16} />
            </button>

            <div className="payment-methods">
              <span>We accept:</span>
              <div className="payment-icons">
                <CreditCard size={20} />
                <CreditCard size={20} />
                <CreditCard size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Items */}
      {savedItems.length > 0 && (
        <div className="saved-items">
          <h3>Saved for Later ({savedItems.length} items)</h3>
          <div className="saved-items-grid">
            {savedItems.map(item => (
              <div key={item.id} className="saved-item">
                <img src={item.image} alt={item.name} />
                <div className="saved-item-info">
                  <h4>{item.name}</h4>
                  <p className="saved-item-price">Rs {item.price}</p>
                  <button className="btn btn-outline">Move to Cart</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="recommendations">
        <h3>You might also like</h3>
        <div className="recommendations-grid">
          {/* Add recommendation items here */}
        </div>
      </div>
    </div>
  );
};

export default Cart;