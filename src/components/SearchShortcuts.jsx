import React, { useEffect, useState } from 'react';
import { Search, Mic, Filter, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import './SearchShortcuts.css';

const SearchShortcuts = ({ isVisible, onShortcut }) => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Show shortcuts on Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowShortcuts(true);
      }

      // Hide shortcuts on Escape
      if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shortcuts = [
    {
      key: 'Ctrl/Cmd + K',
      description: 'Open search',
      icon: <Search size={16} />
    },
    {
      key: 'Ctrl/Cmd + M',
      description: 'Voice search',
      icon: <Mic size={16} />
    },
    {
      key: 'Ctrl/Cmd + F',
      description: 'Open filters',
      icon: <Filter size={16} />
    },
    {
      key: '↑/↓',
      description: 'Navigate suggestions',
      icon: <ArrowUp size={16} />
    },
    {
      key: 'Enter',
      description: 'Select item',
      icon: <ArrowRight size={16} />
    },
    {
      key: 'Esc',
      description: 'Close suggestions',
      icon: <ArrowDown size={16} />
    }
  ];

  if (!showShortcuts) return null;

  return (
    <div className="search-shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
      <div className="search-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h3>Search Shortcuts</h3>
          <button 
            className="close-shortcuts-btn"
            onClick={() => setShowShortcuts(false)}
          >
            ×
          </button>
        </div>
        
        <div className="shortcuts-grid">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="shortcut-item">
              <div className="shortcut-icon">
                {shortcut.icon}
              </div>
              <div className="shortcut-content">
                <span className="shortcut-key">{shortcut.key}</span>
                <span className="shortcut-description">{shortcut.description}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="shortcuts-footer">
          <p>Press any key to close</p>
        </div>
      </div>
    </div>
  );
};

export default SearchShortcuts; 