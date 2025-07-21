import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { Search, Mic, TrendingUp, Clock, X, Filter, Keyboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { semanticSearch } from '../utils/semanticSearch';

const PowerSearch = ({ products, onSearch, searchTerm, setSearchTerm }) => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    rating: ''
  });
  const [isListening, setIsListening] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
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

  // Get unique categories for filters
  const categories = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }
    return [...new Set(products.map(p => p.category).filter(Boolean))];
  }, [products]);

  // Main search logic: fuzzy, then semantic
  const handleSearch = useCallback(async (term) => {
    setSearchTerm(term);
    setLoading(true);
    let filteredProducts = products;
    if (term.trim()) {
      // Fuzzy search first
      const results = fuse.search(term);
      filteredProducts = results.map(r => r.item);
      // If no fuzzy results, try semantic search
      if (filteredProducts.length === 0) {
        filteredProducts = await semanticSearch(term, 50);
      }
    }
    // Apply filters
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
    onSearch(term, filteredProducts);
    setLoading(false);
    navigate(`/search?query=${encodeURIComponent(term)}`);
  }, [setSearchTerm, products, onSearch, fuse, filters, navigate]);

  // Handle input change
  const handleInputChange = useCallback((value) => {
    setSearchTerm(value);
  }, [setSearchTerm]);

  // Voice search
  const handleVoiceSearch = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchTerm(transcript);
        handleSearch(transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      alert('Voice search is not supported in this browser');
    }
  }, [setSearchTerm, handleSearch]);

  // Apply filters (re-run search with filters)
  const applyFilters = useCallback(() => {
    handleSearch(searchTerm);
    setShowFilters(false);
  }, [handleSearch, searchTerm]);

  const clearFilters = useCallback(() => {
    setFilters({ category: '', minPrice: '', maxPrice: '', rating: '' });
    handleSearch(searchTerm);
  }, [handleSearch, searchTerm]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          handleSearch(searchTerm);
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
  }, [searchTerm, handleSearch, handleVoiceSearch]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 600, margin: '0 auto' }} ref={searchRef}>
      <div className="search-input-wrapper" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="search-input-container" style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', background: '#fff', border: '2px solid #e1e5e9', borderRadius: 12, padding: '0 16px', transition: 'all 0.3s', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Search className="search-icon" size={20} style={{ color: '#6b7280', marginRight: 8 }} />
          <input
            ref={inputRef}
            type="text"
            className="power-search-input"
            placeholder="Search for products, categories, or anything... (Ctrl+K for shortcuts)"
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', padding: '16px 8px', fontSize: 16, background: 'transparent', color: '#1f2937' }}
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => handleInputChange('')}
              style={{ background: 'none', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>
          )}
          <button
            className={`voice-search-btn${isListening ? ' listening' : ''}`}
            onClick={handleVoiceSearch}
            title="Voice Search (Ctrl+M)"
            style={{ background: 'none', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: isListening ? 'white' : '#6b7280', marginLeft: 4, backgroundColor: isListening ? '#ef4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Mic size={18} />
          </button>
          <button
            className={`filter-btn${showFilters ? ' active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filters (Ctrl+F)"
            style={{ background: showFilters ? '#3b82f6' : 'none', color: showFilters ? 'white' : '#6b7280', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', marginLeft: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Filter size={18} />
          </button>
        </div>
        <button className="search-submit-btn" onClick={() => handleSearch(searchTerm)} style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', border: 'none', padding: '16px 24px', borderRadius: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
          {loading ? 'Searching...' : 'Search'}
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
              >
                <option value="">All Categories</option>
                {categories && categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>Price Range</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: 'white' }}
                />
                <span style={{ color: '#6b7280', fontWeight: 500 }}>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
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
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
              </select>
            </div>
            <button onClick={applyFilters} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '12px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', marginTop: 8 }}>
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PowerSearch; 