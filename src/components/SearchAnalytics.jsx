import React, { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Search, Clock, BarChart3 } from 'lucide-react';
import './SearchAnalytics.css';

const SearchAnalytics = ({ searchTerm, searchResults }) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({
    totalSearches: 0,
    popularSearches: [],
    recentSearches: [],
    searchSuccessRate: 0
  });

  const trackSearch = useCallback(async (term, resultCount) => {
    if (!user) return;

    try {
      const userDoc = doc(db, 'users', user.uid);
      const userData = await getDoc(userDoc);
      
      if (userData.exists()) {
        const currentData = userData.data();
        const searchHistory = currentData.searchHistory || [];
        const searchAnalytics = currentData.searchAnalytics || {
          totalSearches: 0,
          successfulSearches: 0,
          searchTerms: []
        };

        // Update search analytics
        const newAnalytics = {
          ...searchAnalytics,
          totalSearches: searchAnalytics.totalSearches + 1,
          successfulSearches: searchAnalytics.successfulSearches + (resultCount > 0 ? 1 : 0),
          searchTerms: [
            ...searchAnalytics.searchTerms,
            {
              term,
              timestamp: new Date().toISOString(),
              resultCount,
              success: resultCount > 0
            }
          ].slice(-100) // Keep last 100 searches
        };

        await updateDoc(userDoc, {
          searchAnalytics: newAnalytics,
          searchHistory: [term, ...searchHistory.filter(item => item !== term)].slice(0, 10)
        });
      }
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }, [user]);

  const loadAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const searchAnalytics = data.searchAnalytics || {};
        const searchHistory = data.searchHistory || [];

        // Calculate popular searches
        const searchCounts = {};
        searchAnalytics.searchTerms?.forEach(search => {
          searchCounts[search.term] = (searchCounts[search.term] || 0) + 1;
        });

        const popularSearches = Object.entries(searchCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([term, count]) => ({ term, count }));

        // Calculate success rate
        const successRate = searchAnalytics.totalSearches > 0 
          ? Math.round((searchAnalytics.successfulSearches / searchAnalytics.totalSearches) * 100)
          : 0;

        setAnalytics({
          totalSearches: searchAnalytics.totalSearches || 0,
          popularSearches,
          recentSearches: searchHistory,
          searchSuccessRate: successRate
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm && user) {
      trackSearch(searchTerm, searchResults?.length || 0);
    }
  }, [searchTerm, searchResults, trackSearch, user]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (!user) return null;

  return (
    <div className="search-analytics">
      <div className="analytics-header">
        <BarChart3 size={20} />
        <h3>Search Insights</h3>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="card-icon">
            <Search size={16} />
          </div>
          <div className="card-content">
            <span className="card-value">{analytics.totalSearches}</span>
            <span className="card-label">Total Searches</span>
          </div>
        </div>

        <div className="analytics-card">
          <div className="card-icon success">
            <TrendingUp size={16} />
          </div>
          <div className="card-content">
            <span className="card-value">{analytics.searchSuccessRate}%</span>
            <span className="card-label">Success Rate</span>
          </div>
        </div>
      </div>

      {analytics.popularSearches.length > 0 && (
        <div className="analytics-section">
          <h4>Popular Searches</h4>
          <div className="popular-searches">
            {analytics.popularSearches.map((search, index) => (
              <div key={index} className="popular-search-item">
                <span className="search-term">{search.term}</span>
                <span className="search-count">{search.count} searches</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.recentSearches.length > 0 && (
        <div className="analytics-section">
          <h4>Recent Searches</h4>
          <div className="recent-searches">
            {analytics.recentSearches.slice(0, 5).map((term, index) => (
              <div key={index} className="recent-search-item">
                <Clock size={14} />
                <span>{term}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAnalytics; 