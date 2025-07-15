import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Star, 
  Truck, 
  Shield,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Minus,
  Plus,
  Grid3X3,
  List,
  SortAsc,
  SortDesc
} from 'lucide-react';
import './AdvancedSearch.css';

const AdvancedSearch = ({ 
  onSearch, 
  onFilterChange, 
  onSortChange,
  onViewChange,
  filters = {},
  sortBy = 'relevance',
  viewMode = 'grid',
  totalResults = 0,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    rating: true,
    brand: true,
    availability: true,
    features: true
  });

  const [localFilters, setLocalFilters] = useState({
    priceRange: [0, 10000],
    rating: [],
    brand: [],
    availability: [],
    features: [],
    prime: false,
    freeShipping: false,
    onSale: false,
    ...filters
  });

  const [sortOptions] = useState([
    { value: 'relevance', label: 'Relevance' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Customer Rating' },
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'discount', label: 'Biggest Discounts' }
  ]);

  const [brands] = useState([
    'Apple', 'Samsung', 'Nike', 'Adidas', 'Sony', 'LG', 'Dell', 'HP',
    'Canon', 'Nikon', 'Bose', 'JBL', 'Philips', 'Panasonic', 'Asus'
  ]);

  const [features] = useState([
    'Wireless', 'Bluetooth', 'Waterproof', 'Touchscreen', '4K', 'HD',
    'Smart', 'Portable', 'Rechargeable', 'Foldable', 'Lightweight'
  ]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery, localFilters);
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...localFilters };
    
    if (Array.isArray(newFilters[filterType])) {
      if (newFilters[filterType].includes(value)) {
        newFilters[filterType] = newFilters[filterType].filter(item => item !== value);
      } else {
        newFilters[filterType] = [...newFilters[filterType], value];
      }
    } else {
      newFilters[filterType] = value;
    }
    
    setLocalFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const handlePriceRangeChange = (min, max) => {
    const newFilters = { ...localFilters, priceRange: [min, max] };
    setLocalFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const handleSortChange = (sortValue) => {
    if (onSortChange) {
      onSortChange(sortValue);
    }
  };

  const handleViewChange = (viewMode) => {
    if (onViewChange) {
      onViewChange(viewMode);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      priceRange: [0, 10000],
      rating: [],
      brand: [],
      availability: [],
      features: [],
      prime: false,
      freeShipping: false,
      onSale: false
    };
    setLocalFilters(clearedFilters);
    if (onFilterChange) {
      onFilterChange(clearedFilters);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.rating.length > 0) count += localFilters.rating.length;
    if (localFilters.brand.length > 0) count += localFilters.brand.length;
    if (localFilters.availability.length > 0) count += localFilters.availability.length;
    if (localFilters.features.length > 0) count += localFilters.features.length;
    if (localFilters.prime) count++;
    if (localFilters.freeShipping) count++;
    if (localFilters.onSale) count++;
    return count;
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={14}
        className={index < rating ? 'star-filled' : 'star-empty'}
      />
    ));
  };

  return (
    <div className="advanced-search">
      {/* Search Bar */}
      <div className="search-bar">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-container">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search for products, brands, and more..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="clear-search-btn"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button type="submit" className="search-btn" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Results Header */}
      <div className="results-header">
        <div className="results-info">
          <span className="results-count">
            {totalResults.toLocaleString()} results
          </span>
          {getActiveFiltersCount() > 0 && (
            <span className="active-filters">
              ({getActiveFiltersCount()} filters applied)
            </span>
          )}
        </div>

        <div className="results-controls">
          <div className="sort-controls">
            <label>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="sort-select"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="view-controls">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => handleViewChange('grid')}
              title="Grid view"
            >
              <Grid3X3 size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => handleViewChange('list')}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>

          <button
            className="filter-toggle-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
            {getActiveFiltersCount() > 0 && (
              <span className="filter-badge">{getActiveFiltersCount()}</span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-header">
            <h3>Filters</h3>
            <button
              className="clear-filters-btn"
              onClick={clearAllFilters}
            >
              Clear all
            </button>
          </div>

          <div className="filters-content">
            {/* Price Range */}
            <div className="filter-section">
              <button
                className="section-header"
                onClick={() => toggleSection('price')}
              >
                <span>Price Range</span>
                {expandedSections.price ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.price && (
                <div className="section-content">
                  <div className="price-range">
                    <div className="price-inputs">
                      <input
                        type="number"
                        placeholder="Min"
                        value={localFilters.priceRange[0]}
                        onChange={(e) => handlePriceRangeChange(parseInt(e.target.value) || 0, localFilters.priceRange[1])}
                        className="price-input"
                      />
                      <span>to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={localFilters.priceRange[1]}
                        onChange={(e) => handlePriceRangeChange(localFilters.priceRange[0], parseInt(e.target.value) || 10000)}
                        className="price-input"
                      />
                    </div>
                    <div className="price-slider">
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        value={localFilters.priceRange[0]}
                        onChange={(e) => handlePriceRangeChange(parseInt(e.target.value), localFilters.priceRange[1])}
                        className="range-slider"
                      />
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        value={localFilters.priceRange[1]}
                        onChange={(e) => handlePriceRangeChange(localFilters.priceRange[0], parseInt(e.target.value))}
                        className="range-slider"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rating Filter */}
            <div className="filter-section">
              <button
                className="section-header"
                onClick={() => toggleSection('rating')}
              >
                <span>Customer Rating</span>
                {expandedSections.rating ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.rating && (
                <div className="section-content">
                  {[4, 3, 2, 1].map(rating => (
                    <label key={rating} className="rating-option">
                      <input
                        type="checkbox"
                        checked={localFilters.rating.includes(rating)}
                        onChange={() => handleFilterChange('rating', rating)}
                      />
                      <div className="stars">{renderStars(rating)}</div>
                      <span>& Up</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Brand Filter */}
            <div className="filter-section">
              <button
                className="section-header"
                onClick={() => toggleSection('brand')}
              >
                <span>Brand</span>
                {expandedSections.brand ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.brand && (
                <div className="section-content">
                  <div className="brand-search">
                    <input
                      type="text"
                      placeholder="Search brands..."
                      className="brand-search-input"
                    />
                  </div>
                  <div className="brand-options">
                    {brands.map(brand => (
                      <label key={brand} className="brand-option">
                        <input
                          type="checkbox"
                          checked={localFilters.brand.includes(brand)}
                          onChange={() => handleFilterChange('brand', brand)}
                        />
                        <span>{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Availability Filter */}
            <div className="filter-section">
              <button
                className="section-header"
                onClick={() => toggleSection('availability')}
              >
                <span>Availability</span>
                {expandedSections.availability ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.availability && (
                <div className="section-content">
                  <label className="availability-option">
                    <input
                      type="checkbox"
                      checked={localFilters.prime}
                      onChange={() => handleFilterChange('prime', !localFilters.prime)}
                    />
                    <Shield size={16} />
                    <span>Prime</span>
                  </label>
                  
                  <label className="availability-option">
                    <input
                      type="checkbox"
                      checked={localFilters.freeShipping}
                      onChange={() => handleFilterChange('freeShipping', !localFilters.freeShipping)}
                    />
                    <Truck size={16} />
                    <span>Free Shipping</span>
                  </label>
                  
                  <label className="availability-option">
                    <input
                      type="checkbox"
                      checked={localFilters.onSale}
                      onChange={() => handleFilterChange('onSale', !localFilters.onSale)}
                    />
                    <span className="sale-icon">%</span>
                    <span>On Sale</span>
                  </label>
                </div>
              )}
            </div>

            {/* Features Filter */}
            <div className="filter-section">
              <button
                className="section-header"
                onClick={() => toggleSection('features')}
              >
                <span>Features</span>
                {expandedSections.features ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {expandedSections.features && (
                <div className="section-content">
                  {features.map(feature => (
                    <label key={feature} className="feature-option">
                      <input
                        type="checkbox"
                        checked={localFilters.features.includes(feature)}
                        onChange={() => handleFilterChange('features', feature)}
                      />
                      <span>{feature}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch; 