import React from 'react';
import { FaSearch, FaFilter } from 'react-icons/fa';
import './SearchBar.css';

const SearchBar = ({ value, onChange, onSearch }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(value);
  };

  return (
    <div className="search-bar-container">
      <form onSubmit={handleSubmit} className="search-bar">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search Product"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="search-input"
        />
        <button type="button" className="filter-button">
          <FaFilter />
        </button>
      </form>
    </div>
  );
};

export default SearchBar; 