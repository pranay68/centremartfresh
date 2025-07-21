import React from 'react';

const Spinner = () => (
  <div style={{
    width: 40,
    height: 40,
    border: '4px solid #eee',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: 'auto'
  }} />
);

export default Spinner;

// Add this to your global CSS:
// @keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} } 