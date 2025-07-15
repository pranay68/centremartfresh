import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Mic, Filter, X, TrendingUp, Clock, Keyboard } from 'lucide-react';
import './SearchBar.css';

const SearchBar = ({ products, onSearchResults, onSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    rating: '',
    inStock: false
  });
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Load search history and trending searches
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history.slice(-5));
    
    // Generate trending searches from products
    if (products && products.length > 0) {
      const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
      const popularProducts = products
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);
      
      setTrendingSearches([
        ...categories.slice(0, 2),
        ...popularProducts.map(p => p.name).slice(0, 1)
      ]);
    }
  }, [products]);

  // Normalize search terms
  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '')
      .replace(/moblie|mobl|mobliee/g, 'mobile')
      .replace(/sho|sneekar|snkar/g, 'shoe')
      .replace(/laptap|labtop/g, 'laptop')
      .replace(/tv|teevee|tvee/g, 'television')
      .replace(/phone|mobile|cell/g, 'phone');

  // Generate search suggestions
  const generateSuggestions = useCallback((input) => {
    if (!input.trim() || !products) return [];

    const normalizedInput = normalize(input);
    const results = [];

    // Direct matches
    products.forEach(product => {
      const name = normalize(product.name || '');
      const desc = normalize(product.description || '');
      const cat = normalize(product.category || '');
      
      if (name.includes(normalizedInput) || desc.includes(normalizedInput) || cat.includes(normalizedInput)) {
        results.push({
          ...product,
          matchType: name.includes(normalizedInput) ? 'name' : 
                     desc.includes(normalizedInput) ? 'description' : 'category',
          relevance: name.includes(normalizedInput) ? 3 : 
                     desc.includes(normalizedInput) ? 2 : 1
        });
      }
    });

    // Sort by relevance and return top 8
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 8);
  }, [products]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (value.trim().length > 0) {
      const suggestions = generateSuggestions(value);
      setSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle search submission
  const handleSearch = (searchTerm = query) => {
    if (!searchTerm.trim()) return;

    // Save to search history
    const newHistory = [searchTerm, ...searchHistory.filter(item => item !== searchTerm)].slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    setSearchHistory(newHistory);

    // Apply filters
    let filteredResults = products.filter(product => {
      const name = normalize(product.name || '');
      const desc = normalize(product.description || '');
      const cat = normalize(product.category || '');
      const searchTermNormalized = normalize(searchTerm);

      return name.includes(searchTermNormalized) || 
             desc.includes(searchTermNormalized) || 
             cat.includes(searchTermNormalized);
    });

    // Apply additional filters
    if (filters.category) {
      filteredResults = filteredResults.filter(p => p.category === filters.category);
    }
    if (filters.minPrice) {
      filteredResults = filteredResults.filter(p => p.price >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      filteredResults = filteredResults.filter(p => p.price <= parseFloat(filters.maxPrice));
    }
    if (filters.rating) {
      filteredResults = filteredResults.filter(p => (p.rating || 0) >= parseFloat(filters.rating));
    }
    if (filters.inStock) {
      filteredResults = filteredResults.filter(p => p.stock > 0);
    }

    onSearchResults(filteredResults);
    onSearch(searchTerm);
    setShowSuggestions(false);
    setQuery(searchTerm);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    handleSearch(suggestion.name);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Voice search
  const handleVoiceSearch = () => {
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
        setQuery(transcript);
        handleSearch(transcript);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      alert('Voice search is not supported in this browser');
    }
  };

  // Get unique categories
  const categories = [...new Set(products?.map(p => p.category).filter(Boolean) || [])];

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <Search className="search-icon" />
    <input
          ref={inputRef}
      type="text"
      value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search products, categories, brands..."
          className="search-input"
        />
        <div className="search-actions">
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="clear-btn"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={handleVoiceSearch}
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            title="Voice Search"
          >
            <Mic size={16} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-btn ${showFilters ? 'active' : ''}`}
            title="Filters"
          >
            <Filter size={16} />
          </button>
          <button
            onClick={() => handleSearch()}
            className="search-btn"
            title="Search"
          >
            <Keyboard size={16} />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Category:</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Price Range:</label>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>Rating:</label>
            <select
              value={filters.rating}
              onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
            >
              <option value="">Any Rating</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="2">2+ Stars</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => setFilters(prev => ({ ...prev, inStock: e.target.checked }))}
              />
              In Stock Only
            </label>
          </div>
          
          <button
            onClick={() => handleSearch()}
            className="apply-filters-btn"
          >
            Apply Filters
          </button>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="suggestions-dropdown" ref={suggestionsRef}>
          {/* Search History */}
          {searchHistory.length > 0 && !query && (
            <div className="suggestion-section">
              <div className="section-header">
                <Clock size={14} />
                <span>Recent Searches</span>
              </div>
              {searchHistory.map((item, index) => (
                <div
                  key={index}
                  className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
                  onClick={() => handleSearch(item)}
                >
                  <Clock size={14} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          {trendingSearches.length > 0 && !query && (
            <div className="suggestion-section">
              <div className="section-header">
                <TrendingUp size={14} />
                <span>Trending</span>
              </div>
              {trendingSearches.map((item, index) => (
                <div
                  key={index}
                  className={`suggestion-item ${selectedIndex === index + searchHistory.length ? 'selected' : ''}`}
                  onClick={() => handleSearch(item)}
                >
                  <TrendingUp size={14} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Search Results */}
          {suggestions.length > 0 && (
            <div className="suggestion-section">
              <div className="section-header">
                <Search size={14} />
                <span>Products</span>
              </div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={`suggestion-item product-suggestion ${selectedIndex === index + searchHistory.length + trendingSearches.length ? 'selected' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="product-info">
                    <img 
                      src={suggestion.image || '/placeholder.png'} 
                      alt={suggestion.name}
                      className="product-thumbnail"
                    />
                    <div className="product-details">
                      <div className="product-name">{suggestion.name}</div>
                      <div className="product-category">{suggestion.category}</div>
                      <div className="product-price">${suggestion.price}</div>
                    </div>
                  </div>
                  <div className="match-type">{suggestion.matchType}</div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {query && suggestions.length === 0 && (
            <div className="no-results">
              <span>No products found for "{query}"</span>
              <button onClick={() => handleSearch()}>Search anyway</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
