import React, { useState, useEffect, useRef, useMemo } from 'react';
import './VirtualizedTable.css';

const VirtualizedTable = ({ 
  data, 
  itemHeight = 50, 
  containerHeight = 600, 
  renderItem, 
  headers = [],
  className = '' 
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(null);
  
  const visibleItemCount = Math.ceil(containerHeight / itemHeight);
  const bufferSize = Math.min(10, Math.ceil(visibleItemCount / 2));
  
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
    const end = Math.min(data.length, start + visibleItemCount + bufferSize * 2);
    
    return {
      startIndex: start,
      endIndex: end,
      visibleItems: data.slice(start, end)
    };
  }, [data, scrollTop, itemHeight, visibleItemCount, bufferSize]);

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const totalHeight = data.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div 
      className={`virtualized-table ${className}`}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      ref={scrollElementRef}
    >
      {/* Headers */}
      {headers.length > 0 && (
        <div 
          className="virtualized-table-header"
          style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 10, 
            backgroundColor: '#f8f9fa',
            borderBottom: '2px solid #dee2e6'
          }}
        >
          <div className="table-row" style={{ display: 'flex', minHeight: itemHeight }}>
            {headers.map((header, index) => (
              <div 
                key={index} 
                className="table-cell" 
                style={{ 
                  flex: header.width || 1, 
                  padding: '8px 12px', 
                  fontWeight: 600,
                  borderRight: '1px solid #dee2e6'
                }}
              >
                {header.label}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Virtual container */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={(item && item.id) || (startIndex + index)} style={{ minHeight: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(VirtualizedTable);
