import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  icon,
  className = '',
  ...props 
}) => {
  const baseClasses = `
    btn
    inline-flex items-center justify-center
    font-medium transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:transform active:scale-95
  `;
  
  const variants = {
    primary: `
      bg-gradient-to-r from-primary-600 to-primary-700
      hover:from-primary-700 hover:to-primary-800
      text-white shadow-md hover:shadow-lg
      focus:ring-primary-500
    `,
    secondary: `
      bg-gray-100 hover:bg-gray-200
      text-gray-900 border border-gray-300
      focus:ring-gray-500
    `,
    outline: `
      border-2 border-primary-600
      text-primary-600 hover:bg-primary-50
      focus:ring-primary-500
    `,
    ghost: `
      text-gray-700 hover:bg-gray-100
      focus:ring-gray-500
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-red-700
      hover:from-red-700 hover:to-red-800
      text-white shadow-md hover:shadow-lg
      focus:ring-red-500
    `,
    success: `
      bg-gradient-to-r from-green-600 to-green-700
      hover:from-green-700 hover:to-green-800
      text-white shadow-md hover:shadow-lg
      focus:ring-green-500
    `
  };
  
  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };
  
  return (
    <button
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {icon && <span className="w-5 h-5">{icon}</span>}
          {children}
        </div>
      )}
    </button>
  );
};

export default Button;