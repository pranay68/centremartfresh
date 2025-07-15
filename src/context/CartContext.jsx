import React, { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from './AuthContext';
import userDataManager from '../utils/userDataManager';
import toast from 'react-hot-toast';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load cart data on mount and when user changes
  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      try {
        const savedCart = await userDataManager.smartLoad(user, 'cart');
    if (savedCart) {
          setCartItems(savedCart);
        } else {
          setCartItems({});
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        setCartItems({});
    }
      setLoading(false);
    };

    loadCart();
  }, [user]);

  // Save cart data whenever it changes
  useEffect(() => {
    if (!loading) {
      const saveCart = async () => {
        try {
          await userDataManager.smartSave(user, 'cart', cartItems);
        } catch (error) {
          console.error('Error saving cart:', error);
        }
      };
      saveCart();
    }
  }, [cartItems, user, loading]);

  const addToCart = async (product, quantity = 1) => {
    const newCartItems = {
      ...cartItems,
      [product.id]: {
        ...product,
        quantity: (cartItems[product.id]?.quantity || 0) + quantity
      }
    };
    
    setCartItems(newCartItems);
    
    // Show success message
    const itemName = product.name || product.title;
    toast.success(`Added ${quantity}x ${itemName} to cart! 🛒`);
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCartItems(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity
      }
    }));
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => {
      const newCart = { ...prev };
      const removedItem = newCart[productId];
      delete newCart[productId];
      
      // Show removal message
      if (removedItem) {
        const itemName = removedItem.name || removedItem.title;
        toast.success(`Removed ${itemName} from cart! 🗑️`);
      }
      
      return newCart;
    });
  };

  const clearCart = () => {
    setCartItems({});
    toast.success('Cart cleared! 🗑️');
  };

  const getTotalPrice = () => {
    return Object.values(cartItems).reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return total + (price * quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return Object.values(cartItems).reduce((total, item) => {
      return total + (parseInt(item.quantity) || 0);
    }, 0);
  };

  const getCartItemsArray = () => {
    return Object.values(cartItems);
  };

  const value = {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getCartItemsArray,
    loading
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};