
import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import './ThemeSwitcher.css';

const ThemeSwitcher = () => {
  const { currentTheme, changeTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { id: 'default', name: 'Default', icon: '☀️', description: 'Classic look' },
    { id: 'dark', name: 'Dark Mode', icon: '🌙', description: 'Easy on eyes' },
    { id: 'modern', name: 'Modern', icon: '🎨', description: 'Clean & minimal' },
    { id: 'scifi', name: 'Sci-Fi', icon: '🚀', description: 'Futuristic vibes' }
  ];

  const handleThemeChange = (themeId) => {
    changeTheme(themeId);
    setIsOpen(false);
  };

  const getCurrentThemeInfo = () => {
    return themes.find(theme => theme.id === currentTheme) || themes[0];
  };

  return (
    <div className="theme-switcher">
      <button 
        className="theme-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Change theme"
      >
        <span className="theme-icon">{getCurrentThemeInfo().icon}</span>
        <span className="theme-label">Theme</span>
      </button>

      {isOpen && (
        <div className="theme-dropdown">
          <div className="theme-dropdown-header">
            <h4>Choose Theme</h4>
            <button 
              className="close-btn"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="theme-options">
            {themes.map((theme) => (
              <button
                key={theme.id}
                className={`theme-option ${currentTheme === theme.id ? 'active' : ''}`}
                onClick={() => handleThemeChange(theme.id)}
              >
                <span className="theme-option-icon">{theme.icon}</span>
                <div className="theme-option-info">
                  <span className="theme-option-name">{theme.name}</span>
                  <span className="theme-option-desc">{theme.description}</span>
                </div>
                {currentTheme === theme.id && (
                  <span className="theme-option-check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="theme-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ThemeSwitcher; 