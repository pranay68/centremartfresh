import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { Search, Mic, TrendingUp, Clock, X, Filter, Keyboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
<<<<<<< HEAD
import { useNavigate } from 'react-router-dom';
import { semanticSearch } from '../utils/semanticSearch';

const PowerSearch = ({ products, onSearch, searchTerm, setSearchTerm }) => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
=======
import './PowerSearch.css';

const PowerSearch = ({ products, onSearch, searchTerm, setSearchTerm }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    rating: ''
  });
  const [isListening, setIsListening] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef(null);
<<<<<<< HEAD
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowShortcuts(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
=======
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
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
<<<<<<< HEAD
          // setSearchHistory(history.slice(-5)); // Last 5 searches
=======
          setSearchHistory(history.slice(-5)); // Last 5 searches
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
        }
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    } else {
      const localHistory = JSON.parse(localStorage.getItem('centremart_search_history') || '[]');
<<<<<<< HEAD
      // setSearchHistory(localHistory.slice(-5));
=======
      setSearchHistory(localHistory.slice(-5));
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
    }
  }, [user]);

  const loadTrendingSearches = useCallback(() => {
    // Generate trending searches based on product categories and popular items
    if (!products || !Array.isArray(products)) {
<<<<<<< HEAD
      // setTrendingSearches([]);
=======
      setTrendingSearches([]);
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
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
<<<<<<< HEAD
    // setTrendingSearches(trending);
=======
    setTrendingSearches(trending);
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
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

<<<<<<< HEAD
  // Remove saveSearchHistory and all references to searchHistory
  // In handleSearch, just navigate to search results page
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    navigate(`/search?query=${encodeURIComponent(term)}`);
  }, [setSearchTerm, navigate]);

  // Only update input value on change, do NOT trigger search
  const handleInputChange = useCallback((value) => {
    setSearchTerm(value);
    // DO NOT call onSearch or trigger search here!
  }, [setSearchTerm]);
=======
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
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d

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
<<<<<<< HEAD
      // if (!isOpen) return;

      // const allSuggestions = [
      //   ...searchHistory,
      //   ...trendingSearches,
      //   ...suggestions.map(s => s.name)
      // ];
=======
      if (!isOpen) return;

      const allSuggestions = [
        ...searchHistory,
        ...trendingSearches,
        ...suggestions.map(s => s.name)
      ];
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
<<<<<<< HEAD
          // setSelectedIndex(prev => 
          //   prev < allSuggestions.length - 1 ? prev + 1 : 0
          // );
          break;
        case 'ArrowUp':
          e.preventDefault();
          // setSelectedIndex(prev => 
          //   prev > 0 ? prev - 1 : allSuggestions.length - 1
          // );
          break;
        case 'Enter':
          e.preventDefault();
          // if (selectedIndex >= 0 && allSuggestions[selectedIndex]) {
          //   handleSearch(allSuggestions[selectedIndex]);
          // } else if (searchTerm.trim()) {
            handleSearch(searchTerm);
          // }
          break;
        case 'Escape':
          // setIsOpen(false);
          // setSelectedIndex(-1);
=======
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
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
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
<<<<<<< HEAD
  }, [searchTerm, handleSearch, handleVoiceSearch]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 600, margin: '0 auto' }} ref={searchRef}>
      <div className="search-input-wrapper" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="search-input-container" style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', background: '#fff', border: '2px solid #e1e5e9', borderRadius: 12, padding: '0 16px', transition: 'all 0.3s', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Search className="search-icon" size={20} style={{ color: '#6b7280', marginRight: 8 }} />
=======
  }, [isOpen, selectedIndex, searchHistory, trendingSearches, suggestions, searchTerm, handleSearch, handleVoiceSearch]);

  return (
    <div className="power-search-container" ref={searchRef}>
      <div className="search-input-wrapper">
        <div className="search-input-container">
          <Search className="search-icon" size={20} />
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
          <input
            ref={inputRef}
            type="text"
            className="power-search-input"
            placeholder="Search for products, categories, or anything... (Ctrl+K for shortcuts)"
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
<<<<<<< HEAD
            onFocus={() => {}}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch(searchTerm);
            }}
            style={{ flex: 1, border: 'none', outline: 'none', padding: '16px 8px', fontSize: 16, background: 'transparent', color: '#1f2937' }}
=======
            onFocus={() => setIsOpen(true)}
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => handleInputChange('')}
<<<<<<< HEAD
              style={{ background: 'none', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
=======
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
            >
              <X size={16} />
            </button>
          )}
          <button
<<<<<<< HEAD
            className={`voice-search-btn${isListening ? ' listening' : ''}`}
            onClick={handleVoiceSearch}
            title="Voice Search (Ctrl+M)"
            style={{ background: 'none', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: isListening ? 'white' : '#6b7280', marginLeft: 4, backgroundColor: isListening ? '#ef4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
=======
            className={`voice-search-btn ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceSearch}
            title="Voice Search (Ctrl+M)"
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
          >
            <Mic size={18} />
          </button>
          <button
<<<<<<< HEAD
            className={`filter-btn${showFilters ? ' active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filters (Ctrl+F)"
            style={{ background: showFilters ? '#3b82f6' : 'none', color: showFilters ? 'white' : '#6b7280', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', marginLeft: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Filter size={18} />
          </button>
        </div>
        <button className="search-submit-btn" onClick={() => handleSearch(searchTerm)} style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', border: 'none', padding: '16px 24px', borderRadius: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
          Search
        </button>
      </div>
      {/* Filters Panel */}
      {showFilters && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '2px solid #e1e5e9', borderRadius: 12, marginTop: 8, padding: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 1000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: 0, color: '#1f2937', fontSize: 18, fontWeight: 600 }}>Filters</h3>
            <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}>
              Clear All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: 'white' }}
=======
            className={`filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filters (Ctrl+F)"
          >
            <Filter size={18} />
          </button>
          <button
            className="shortcuts-btn"
            onClick={() => setShowShortcuts(true)}
            title="Keyboard Shortcuts (Ctrl+K)"
          >
            <Keyboard size={18} />
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
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
              >
                <option value="">All Categories</option>
                {categories && categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
<<<<<<< HEAD
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>Price Range</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
=======
            
            <div className="filter-group">
              <label>Price Range</label>
              <div className="price-inputs">
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
<<<<<<< HEAD
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: 'white' }}
                />
                <span style={{ color: '#6b7280', fontWeight: 500 }}>-</span>
=======
                />
                <span>-</span>
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
<<<<<<< HEAD
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: 'white' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>Minimum Rating</label>
              <select
                value={filters.rating}
                onChange={(e) => setFilters({...filters, rating: e.target.value})}
                style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: 'white' }}
=======
                />
              </div>
            </div>
            
            <div className="filter-group">
              <label>Minimum Rating</label>
              <select
                value={filters.rating}
                onChange={(e) => setFilters({...filters, rating: e.target.value})}
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
              </select>
            </div>
<<<<<<< HEAD
            <button onClick={applyFilters} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '12px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', marginTop: 8 }}>
=======
            
            <button className="apply-filters-btn" onClick={applyFilters}>
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
              Apply Filters
            </button>
          </div>
        </div>
      )}
<<<<<<< HEAD
=======

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

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-header">
              <h3>Search Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)}>×</button>
            </div>
            <div className="shortcuts-content">
              <div className="shortcut-item">
                <span className="shortcut-key">Ctrl+K</span>
                <span>Show shortcuts</span>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-key">Ctrl+M</span>
                <span>Voice search</span>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-key">Ctrl+F</span>
                <span>Toggle filters</span>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-key">↑/↓</span>
                <span>Navigate suggestions</span>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-key">Enter</span>
                <span>Select item</span>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-key">Esc</span>
                <span>Close suggestions</span>
              </div>
            </div>
          </div>
        </div>
      )}
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
    </div>
  );
};

<<<<<<< HEAD
export default PowerSearch;
=======
export default PowerSearch; 
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
