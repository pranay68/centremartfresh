import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('default');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('centremart_theme');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  // Apply theme to document
  const applyTheme = (theme) => {
    // Remove all existing theme classes
    document.body.classList.remove('theme-dark', 'theme-modern', 'theme-scifi', 'theme-default');
    
    // Add new theme class
    document.body.classList.add(`theme-${theme}`);
    
    // Save to localStorage
    localStorage.setItem('centremart_theme', theme);
  };

  const changeTheme = (theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
  };

  const value = {
    currentTheme,
    changeTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 