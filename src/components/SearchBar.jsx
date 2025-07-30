import React, { useState } from 'react';

const SearchBar = ({ products, onSearchResults }) => {
  const [query, setQuery] = useState('');

  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '')
      .replace(/moblie|mobl|mobliee/g, 'mobile')
      .replace(/sho|sneekar|snkar/g, 'shoe')
      .replace(/laptap|labtop/g, 'laptop')
      .replace(/tv|teevee|tvee/g, 'television'); // You can go crazy with this

  const handleSearch = (e) => {
    const input = e.target.value;
    setQuery(input);

    const cleaned = normalize(input);

    const results = products.filter((p) => {
      const name = normalize(p.name || '');
      const desc = normalize(p.description || '');
      const cat = normalize(p.category || '');

      return (
        name.includes(cleaned) ||
        desc.includes(cleaned) ||
        cat.includes(cleaned)
      );
    });

    onSearchResults(results);
  };

  return (
    <input
      type="text"
      value={query}
      onChange={handleSearch}
      placeholder="Search anything..."
      style={{
        width: '100%',
        padding: '10px',
        fontSize: '1rem',
        border: '1px solid #ccc',
        borderRadius: '8px',
        marginBottom: '1rem',
      }}
    />
  );
};

export default SearchBar;
