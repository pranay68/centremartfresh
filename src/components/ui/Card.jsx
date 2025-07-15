import React from 'react';

const Card = ({ children, className = '', hover = false }) => {
  return (
    <div className={`
      bg-white rounded-xl shadow-sm border border-gray-200
      ${hover ? 'hover:shadow-md transition-shadow duration-200' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-t border-gray-200 ${className}`}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;