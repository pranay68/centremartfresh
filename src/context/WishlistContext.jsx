import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.wishlist) {
      setWishlist(userProfile.wishlist);
    } else if (!user) {
      // Load from localStorage for guest users
      const savedWishlist = localStorage.getItem('centremart_wishlist');
      if (savedWishlist) {
        try {
          setWishlist(JSON.parse(savedWishlist));
        } catch (error) {
          console.error('Error loading wishlist from localStorage:', error);
        }
      }
    }
  }, [userProfile, user]);

  // Save to localStorage for guest users
  useEffect(() => {
    if (!user) {
      localStorage.setItem('centremart_wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, user]);

  const addToWishlist = async (product) => {
    try {
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          wishlist: arrayUnion(product.id)
        });
      }
      
      setWishlist(prev => [...prev, product.id]);
      toast.success('Added to wishlist!');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add to wishlist');
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          wishlist: arrayRemove(productId)
        });
      }
      
      setWishlist(prev => prev.filter(id => id !== productId));
      toast.success('Removed from wishlist!');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove from wishlist');
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.includes(productId);
  };

  const value = {
    wishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};