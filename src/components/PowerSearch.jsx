import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { Search, Mic, TrendingUp, Clock, X, Filter, Keyboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './PowerSearch.css';

const PowerSearch = ({ products, onSearch, searchTerm, setSearchTerm }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    rating: ''
  });
  const [isListening, setIsListening] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowShortcuts(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const inputRef = useRef(null);
  const { user } = useAuth();

  // Fuse.js configuration for fuzzy search
  const fuseOptions = useMemo(() => ({
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'description', weight: 0.3 },
      { name: 'category', weight: 0.5 }
    ],
    threshold: 0.3,
    includeScore: true,
    includeMatches: true
  }), []);

  const fuse = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return new Fuse([], fuseOptions);
    }
    return new Fuse(products, fuseOptions);
  }, [products, fuseOptions]);

  const loadSearchHistory = useCallback(async () => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const history = userDoc.data().searchHistory || [];
          setSearchHistory(history.slice(-5)); // Last 5 searches
        }
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    } else {
      const localHistory = JSON.parse(localStorage.getItem('centremart_search_history') || '[]');
      setSearchHistory(localHistory.slice(-5));
    }
  }, [user]);

  const loadTrendingSearches = useCallback(() => {
    // Generate trending searches based on product categories and popular items
    if (!products || !Array.isArray(products)) {
      setTrendingSearches([]);
      return;
    }
    
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const popularProducts = products
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);
    
    const trending = [
      ...categories.slice(0, 3),
      ...popularProducts.map(p => p.name).slice(0, 2)
    ];
    setTrendingSearches(trending);
  }, [products]);

  // Get unique categories for filters
  const categories = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }
    return [...new Set(products.map(p => p.category).filter(Boolean))];
  }, [products]);

  // Load search history
  useEffect(() => {
    loadSearchHistory();
    loadTrendingSearches();
  }, [loadSearchHistory, loadTrendingSearches]);

  const saveSearchHistory = useCallback(async (term) => {
    if (!term.trim()) return;

    const newHistory = [term, ...searchHistory.filter(item => item !== term)].slice(0, 5);
    
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          searchHistory: newHistory
        });
      } catch (error) {
        console.error('Error saving search history:', error);
      }
    } else {
      localStorage.setItem('centremart_search_history', JSON.stringify(newHistory));
    }
    
    setSearchHistory(newHistory);
  }, [searchHistory, user]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setIsOpen(false);
    setSelectedIndex(-1);
    saveSearchHistory(term);
    onSearch(term);
  }, [setSearchTerm, saveSearchHistory, onSearch]);

  const handleInputChange = useCallback((value) => {
    setSearchTerm(value);
    setSelectedIndex(-1);
    if (value.trim().length > 0) {
      const results = fuse.search(value);
      const suggestions = results
        .slice(0, 8)
        .map(result => ({
          ...result.item,
          score: result.score,
          matches: result.matches
        }));
      setSuggestions(suggestions);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [setSearchTerm, fuse]);

  const handleVoiceSearch = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchTerm(transcript);
        handleSearch(transcript);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      alert('Voice search is not supported in this browser');
    }
  }, [setSearchTerm, handleSearch]);

  const applyFilters = useCallback(() => {
    if (!products || !Array.isArray(products)) {
      onSearch(searchTerm, []);
      setShowFilters(false);
      return;
    }
    
    let filteredProducts = products;
    
    if (filters.category) {
      filteredProducts = filteredProducts.filter(p => p.category === filters.category);
    }
    
    if (filters.minPrice) {
      filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(filters.minPrice));
    }
    
    if (filters.maxPrice) {
      filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(filters.maxPrice));
    }
    
    if (filters.rating) {
      filteredProducts = filteredProducts.filter(p => (p.rating || 0) >= parseFloat(filters.rating));
    }
    
    onSearch(searchTerm, filteredProducts);
    setShowFilters(false);
  }, [filters, products, searchTerm, onSearch]);

  const clearFilters = useCallback(() => {
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      rating: ''
    });
    onSearch(searchTerm);
  }, [onSearch, searchTerm]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      const allSuggestions = [
        ...searchHistory,
        ...trendingSearches,
        ...suggestions.map(s => s.name)
      ];

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < allSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : allSuggestions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && allSuggestions[selectedIndex]) {
            handleSearch(allSuggestions[selectedIndex]);
          } else if (searchTerm.trim()) {
            handleSearch(searchTerm);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
        case 'Control':
        case 'Meta':
          // Handle Ctrl/Cmd + K for shortcuts
          break;
        default:
          if (e.ctrlKey || e.metaKey) {
            if (e.key === 'k') {
              e.preventDefault();
              setShowShortcuts(true);
            } else if (e.key === 'm') {
              e.preventDefault();
              handleVoiceSearch();
            } else if (e.key === 'f') {
              e.preventDefault();
              setShowFilters(prev => !prev);
            }
          }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, searchHistory, trendingSearches, suggestions, searchTerm, handleSearch, handleVoiceSearch]);

  return (
    <div className="power-search-container" ref={searchRef}>
      <div className="search-input-wrapper">
        <div className="search-input-container">
          <Search className="search-icon" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="power-search-input"
            placeholder="Search for products, categories, or anything... (Ctrl+K for shortcuts)"
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => handleInputChange('')}
            >
              <X size={16} />
            </button>
          )}
          <button
            className={`voice-search-btn ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceSearch}
            title="Voice Search (Ctrl+M)"
          >
            <Mic size={18} />
          </button>
          <button
            className={`filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filters (Ctrl+F)"
          >
            <Filter size={18} />
          </button>
        </div>
        
        <button className="search-submit-btn" onClick={() => handleSearch(searchTerm)}>
          Search
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-header">
            <h3>Filters</h3>
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear All
            </button>
          </div>
          
          <div className="filters-content">
            <div className="filter-group">
              <label>Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="">All Categories</option>
                {categories && categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Price Range</label>
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                />
              </div>
            </div>
            
            <div className="filter-group">
              <label>Minimum Rating</label>
              <select
                value={filters.rating}
                onChange={(e) => setFilters({...filters, rating: e.target.value})}
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
              </select>
            </div>
            
            <button className="apply-filters-btn" onClick={applyFilters}>
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Search Suggestions Dropdown */}
      {isOpen && (
        <div className="search-suggestions">
          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="suggestion-section">
              <div className="section-header">
                <Clock size={16} />
                <span>Recent Searches</span>
              </div>
              {searchHistory.map((term, index) => (
                <div
                  key={index}
                  className={`suggestion-item history-item ${selectedIndex === index ? 'selected' : ''}`}
                  onClick={() => handleSearch(term)}
                >
                  <Clock size={14} />
                  <span>{term}</span>
                </div>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          {trendingSearches.length > 0 && (
            <div className="suggestion-section">
              <div className="section-header">
                <TrendingUp size={16} />
                <span>Trending</span>
              </div>
              {trendingSearches.map((term, index) => {
                const globalIndex = searchHistory.length + index;
                return (
                  <div
                    key={index}
                    className={`suggestion-item trending-item ${selectedIndex === globalIndex ? 'selected' : ''}`}
                    onClick={() => handleSearch(term)}
                  >
                    <TrendingUp size={14} />
                    <span>{term}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search Results */}
          {suggestions.length > 0 && (
            <div className="suggestion-section">
              <div className="section-header">
                <Search size={16} />
                <span>Products</span>
              </div>
              {suggestions.map((product, index) => {
                const globalIndex = searchHistory.length + trendingSearches.length + index;
                return (
                  <div
                    key={product.id || index}
                    className={`suggestion-item product-item ${selectedIndex === globalIndex ? 'selected' : ''}`}
                    onClick={() => handleSearch(product.name)}
                  >
                    <img
                      src={product.imageUrl || 'https://via.placeholder.com/40x40'}
                      alt={product.name}
                      className="product-thumbnail"
                    />
                    <div className="product-info">
                      <span className="product-name">{product.name}</span>
                      <span className="product-price">Rs. {product.price}</span>
                    </div>
                    <span className="product-category">{product.category}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {searchTerm && suggestions.length === 0 && (
            <div className="no-results">
              <p>No products found for "{searchTerm}"</p>
              <p>Try different keywords or check spelling</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PowerSearch; 