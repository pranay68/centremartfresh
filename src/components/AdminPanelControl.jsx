import React, { useState } from 'react';
import { FaCog, FaEye, FaEyeSlash, FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import './AdminPanelControl.css';

const AdminPanelControl = ({ isVisible, onToggle, onEdit, onSave, onDelete, sections = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const defaultSections = [
    { id: 'flashSale', name: 'Flash Sale', icon: '🔥', enabled: true },
    { id: 'topSale', name: 'Top Sellers', icon: '⭐', enabled: true },
    { id: 'newArrivals', name: 'New Arrivals', icon: '🌱', enabled: true },
    { id: 'categories', name: 'Categories', icon: '📂', enabled: true }
  ];

  const allSections = sections.length > 0 ? sections : defaultSections;

  const handleSectionToggle = (sectionId) => {
    const updatedSections = allSections.map(section => 
      section.id === sectionId 
        ? { ...section, enabled: !section.enabled }
        : section
    );
    onSave && onSave(updatedSections);
  };

  const handleEditSection = (section) => {
    onEdit && onEdit(section);
  };

  const handleDeleteSection = (sectionId) => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      onDelete && onDelete(sectionId);
    }
  };

  const handleAddSection = () => {
    const newSection = {
      id: `section_${Date.now()}`,
      name: 'New Section',
      icon: '📦',
      enabled: true
    };
    onSave && onSave([...allSections, newSection]);
  };

  if (!isVisible) return null;

  return (
    <div className={`admin-panel-control ${isExpanded ? 'expanded' : ''}`}>
      <div className="admin-panel-header">
        <button 
          className="admin-toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <FaCog className="admin-icon" />
          <span>Admin Panel</span>
          <span className="toggle-arrow">{isExpanded ? '▼' : '▲'}</span>
        </button>
      </div>

      {isExpanded && (
        <div className="admin-panel-content">
          <div className="admin-section-header">
            <h3>Section Management</h3>
            <button 
              className="add-section-btn"
              onClick={handleAddSection}
            >
              <FaPlus /> Add Section
            </button>
          </div>

          <div className="sections-list">
            {allSections.map((section) => (
              <div key={section.id} className="section-item">
                <div className="section-info">
                  <span className="section-icon">{section.icon}</span>
                  <span className="section-name">{section.name}</span>
                </div>
                
                <div className="section-controls">
                  <button 
                    className={`toggle-btn ${section.enabled ? 'enabled' : 'disabled'}`}
                    onClick={() => handleSectionToggle(section.id)}
                    title={section.enabled ? 'Hide Section' : 'Show Section'}
                  >
                    {section.enabled ? <FaEye /> : <FaEyeSlash />}
                  </button>
                  
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditSection(section)}
                    title="Edit Section"
                  >
                    <FaEdit />
                  </button>
                  
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteSection(section.id)}
                    title="Delete Section"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-actions">
            <button 
              className="save-all-btn"
              onClick={() => onSave && onSave(allSections)}
            >
              <FaSave /> Save All Changes
            </button>
            
            <button 
              className="close-admin-btn"
              onClick={() => setIsExpanded(false)}
            >
              <FaTimes /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanelControl; 