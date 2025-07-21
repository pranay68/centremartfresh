import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './AIBrain.css';

const AIBrain = () => {
  const { user } = useAuth();
  const [aiState, setAiState] = useState({
    isActive: false,
    currentTask: '',
    userPreferences: {},
    productRecommendations: [],
    homepageContent: {},
    errorLogs: [],
    customerMessages: [],
    systemHealth: 'optimal'
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // AI Core Functions
  const analyzeUserBehavior = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's browsing history, purchases, wishlist, etc.
      const userData = {
        recentlyViewed: JSON.parse(localStorage.getItem('recentlyViewed') || '[]'),
        wishlist: JSON.parse(localStorage.getItem('wishlist') || '[]'),
        cart: JSON.parse(localStorage.getItem('cart') || '[]'),
        searchHistory: JSON.parse(localStorage.getItem('searchHistory') || '[]')
      };

      // Analyze patterns
      const categoryPreferences = {};
      const priceRange = { min: Infinity, max: 0 };
      const brandPreferences = {};

      [...userData.recentlyViewed, ...userData.wishlist].forEach(product => {
        if (product.category) {
          categoryPreferences[product.category] = (categoryPreferences[product.category] || 0) + 1;
        }
        if (product.price) {
          priceRange.min = Math.min(priceRange.min, product.price);
          priceRange.max = Math.max(priceRange.max, product.price);
        }
        if (product.brand) {
          brandPreferences[product.brand] = (brandPreferences[product.brand] || 0) + 1;
        }
      });

      const preferences = {
        favoriteCategories: Object.entries(categoryPreferences)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([category]) => category),
        priceRange,
        favoriteBrands: Object.entries(brandPreferences)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([brand]) => brand),
        lastUpdated: new Date()
      };

      setAiState(prev => ({
        ...prev,
        userPreferences: preferences
      }));

      return preferences;
    } catch (error) {
      console.error('AI Error analyzing user behavior:', error);
      toast.error('AI analysis failed');
    }
  }, [user]);

  const generateProductRecommendations = useCallback(async () => {
    try {
      const productsRef = collection(db, 'products');
      const snapshot = await getDocs(productsRef);
      const allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const { userPreferences } = aiState;
      let recommendations = [];

      if (userPreferences.favoriteCategories) {
        // Recommend products from favorite categories
        const categoryProducts = allProducts.filter(product => 
          userPreferences.favoriteCategories.includes(product.category)
        );
        recommendations.push(...categoryProducts.slice(0, 6));
      }

      // Add trending products
      const trendingProducts = allProducts
        .filter(p => p.soldCount > 10)
        .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
        .slice(0, 4);
      recommendations.push(...trendingProducts);

      // Add new arrivals
      const newArrivals = allProducts
        .filter(p => p.newArrival)
        .slice(0, 4);
      recommendations.push(...newArrivals);

      // Remove duplicates
      const uniqueRecommendations = recommendations.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );

      setAiState(prev => ({
        ...prev,
        productRecommendations: uniqueRecommendations.slice(0, 12)
      }));

      return uniqueRecommendations;
    } catch (error) {
      console.error('AI Error generating recommendations:', error);
      toast.error('Failed to generate recommendations');
    }
  }, [aiState.userPreferences]);

  const optimizeHomepageContent = useCallback(async () => {
    try {
      const productsRef = collection(db, 'products');
      const snapshot = await getDocs(productsRef);
      const allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Analyze what's working best
      const flashSaleProducts = allProducts
        .filter(p => p.flashSale && p.stock > 0)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 6);

      const topSellers = allProducts
        .filter(p => p.soldCount > 5)
        .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
        .slice(0, 6);

      const newArrivals = allProducts
        .filter(p => p.newArrival)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 6);

      const homepageContent = {
        flashSale: {
          products: flashSaleProducts,
          shouldShow: flashSaleProducts.length > 0,
          priority: flashSaleProducts.length > 0 ? 'high' : 'low'
        },
        topSellers: {
          products: topSellers,
          shouldShow: topSellers.length > 0,
          priority: 'medium'
        },
        newArrivals: {
          products: newArrivals,
          shouldShow: newArrivals.length > 0,
          priority: 'medium'
        },
        lastOptimized: new Date()
      };

      setAiState(prev => ({
        ...prev,
        homepageContent
      }));

      return homepageContent;
    } catch (error) {
      console.error('AI Error optimizing homepage:', error);
      toast.error('Failed to optimize homepage');
    }
  }, []);

  const detectAndFixErrors = useCallback(async () => {
    try {
      const errors = [];
      
      // Check for products with missing images
      const productsRef = collection(db, 'products');
      const snapshot = await getDocs(productsRef);
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const productsWithMissingImages = products.filter(p => !p.imageUrl && !p.image);
      if (productsWithMissingImages.length > 0) {
        errors.push({
          type: 'missing_images',
          count: productsWithMissingImages.length,
          products: productsWithMissingImages.map(p => p.id)
        });
      }

      // Check for products with invalid prices
      const productsWithInvalidPrices = products.filter(p => !p.price || p.price <= 0);
      if (productsWithInvalidPrices.length > 0) {
        errors.push({
          type: 'invalid_prices',
          count: productsWithInvalidPrices.length,
          products: productsWithInvalidPrices.map(p => p.id)
        });
      }

      // Check for products with missing categories
      const productsWithMissingCategories = products.filter(p => !p.category);
      if (productsWithMissingCategories.length > 0) {
        errors.push({
          type: 'missing_categories',
          count: productsWithMissingCategories.length,
          products: productsWithMissingCategories.map(p => p.id)
        });
      }

      setAiState(prev => ({
        ...prev,
        errorLogs: errors,
        systemHealth: errors.length > 0 ? 'needs_attention' : 'optimal'
      }));

      return errors;
    } catch (error) {
      console.error('AI Error detecting issues:', error);
      toast.error('Failed to detect system issues');
    }
  }, []);

  const processCustomerMessage = useCallback(async (message, customerId) => {
    try {
      // Simple AI response logic
      let response = '';
      
      if (message.toLowerCase().includes('order') || message.toLowerCase().includes('track')) {
        response = "I can help you track your order! Please provide your order number or check your order history in your account.";
      } else if (message.toLowerCase().includes('return') || message.toLowerCase().includes('refund')) {
        response = "For returns and refunds, please contact our customer service team. They'll be happy to assist you!";
      } else if (message.toLowerCase().includes('product') || message.toLowerCase().includes('item')) {
        response = "I can help you find products! Try using our search feature or browse by category. What are you looking for?";
      } else if (message.toLowerCase().includes('price') || message.toLowerCase().includes('cost')) {
        response = "All our prices are clearly displayed on product pages. We also have regular sales and discounts!";
      } else {
        response = "Thank you for your message! Our team will get back to you soon. Is there anything specific I can help you with?";
      }

      const messageData = {
        customerId,
        message,
        response,
        timestamp: new Date(),
        status: 'resolved'
      };

      // Save to Firestore
      await addDoc(collection(db, 'customerMessages'), messageData);

      setAiState(prev => ({
        ...prev,
        customerMessages: [...prev.customerMessages, messageData]
      }));

      return response;
    } catch (error) {
      console.error('AI Error processing message:', error);
      return "I'm sorry, I'm having trouble processing your message right now. Please try again later.";
    }
  }, []);

  // Main AI Processing Function
  const runAIAnalysis = useCallback(async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setAiState(prev => ({ ...prev, isActive: true, currentTask: 'Analyzing...' }));

    try {
      // Run all AI tasks
      await analyzeUserBehavior();
      setAiState(prev => ({ ...prev, currentTask: 'Generating recommendations...' }));
      
      await generateProductRecommendations();
      setAiState(prev => ({ ...prev, currentTask: 'Optimizing homepage...' }));
      
      await optimizeHomepageContent();
      setAiState(prev => ({ ...prev, currentTask: 'Checking system health...' }));
      
      await detectAndFixErrors();
      
      setAiState(prev => ({ 
        ...prev, 
        isActive: false, 
        currentTask: 'Complete',
        systemHealth: 'optimal'
      }));
      
      toast.success('AI analysis completed!');
    } catch (error) {
      console.error('AI Analysis failed:', error);
      setAiState(prev => ({ 
        ...prev, 
        isActive: false, 
        currentTask: 'Failed',
        systemHealth: 'error'
      }));
      toast.error('AI analysis failed');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, analyzeUserBehavior, generateProductRecommendations, optimizeHomepageContent, detectAndFixErrors]);

  // Auto-run AI analysis every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        runAIAnalysis();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [user, runAIAnalysis]);

  return {
    aiState,
    runAIAnalysis,
    processCustomerMessage,
    isProcessing
  };
};

export default AIBrain; 