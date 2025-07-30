import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '50px 20px',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ fontSize: '6rem', margin: '0', color: '#e74c3c' }}>404</h1>
      <h2 style={{ margin: '20px 0', color: '#2c3e50' }}>Page Not Found</h2>
      <p style={{ fontSize: '1.2rem', color: '#7f8c8d', marginBottom: '30px' }}>
        The page you're looking for doesn't exist.
      </p>
      <Link 
        to="/" 
        style={{
          padding: '12px 24px',
          backgroundColor: '#3498db',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px',
          fontSize: '1.1rem',
          transition: 'background-color 0.3s'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
      >
        Go Home
      </Link>
    </div>
  );
};

export default NotFound;
