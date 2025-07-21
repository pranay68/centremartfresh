import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Users, ShoppingBag, MessageCircle, Settings, Zap } from 'lucide-react';
import AIBrain from './AIBrain';
import './AIDashboard.css';

const AIDashboard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { aiState, runAIAnalysis, isProcessing } = AIBrain();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Brain },
    { id: 'recommendations', label: 'Recommendations', icon: TrendingUp },
    { id: 'errors', label: 'System Health', icon: AlertTriangle },
    { id: 'users', label: 'User Insights', icon: Users },
    { id: 'products', label: 'Product Analytics', icon: ShoppingBag },
    { id: 'messages', label: 'AI Chat', icon: MessageCircle },
    { id: 'settings', label: 'AI Settings', icon: Settings }
  ];

  const getHealthColor = (health) => {
    switch (health) {
      case 'optimal': return '#22c55e';
      case 'needs_attention': return '#fbbf24';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getHealthIcon = (health) => {
    switch (health) {
      case 'optimal': return '✅';
      case 'needs_attention': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  if (!isOpen) {
    return (
      <div className="ai-dashboard-toggle" onClick={() => setIsOpen(true)}>
        <Brain size={20} />
        <span>AI Dashboard</span>
      </div>
    );
  }

  return (
    <div className="ai-dashboard">
      <div className="ai-dashboard-header">
        <div className="ai-dashboard-title">
          <Brain size={24} />
          <span>AI Dashboard</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="ai-dashboard-close">
          ×
        </button>
      </div>

      <div className="ai-dashboard-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`ai-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="ai-dashboard-content">
        {activeTab === 'overview' && (
          <div className="ai-overview">
            <div className="ai-stats-grid">
              <div className="ai-stat-card">
                <div className="ai-stat-icon">🧠</div>
                <div className="ai-stat-info">
                  <h3>AI Status</h3>
                  <p className={`ai-stat-value ${aiState.systemHealth}`}>
                    {getHealthIcon(aiState.systemHealth)} {aiState.systemHealth}
                  </p>
                </div>
              </div>

              <div className="ai-stat-card">
                <div className="ai-stat-icon">📊</div>
                <div className="ai-stat-info">
                  <h3>Recommendations</h3>
                  <p className="ai-stat-value">{aiState.productRecommendations.length}</p>
                </div>
              </div>

              <div className="ai-stat-card">
                <div className="ai-stat-icon">⚠️</div>
                <div className="ai-stat-info">
                  <h3>Issues Found</h3>
                  <p className="ai-stat-value">{aiState.errorLogs.length}</p>
                </div>
              </div>

              <div className="ai-stat-card">
                <div className="ai-stat-icon">💬</div>
                <div className="ai-stat-info">
                  <h3>Messages</h3>
                  <p className="ai-stat-value">{aiState.customerMessages.length}</p>
                </div>
              </div>
            </div>

            <div className="ai-actions">
              <button 
                onClick={runAIAnalysis}
                disabled={isProcessing}
                className="ai-action-btn primary"
              >
                <Zap size={16} />
                {isProcessing ? 'Running Analysis...' : 'Run AI Analysis'}
              </button>
              
              <div className="ai-current-task">
                {aiState.currentTask && (
                  <div className="ai-task-display">
                    <span>Current Task: {aiState.currentTask}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="ai-recommendations">
            <h3>Product Recommendations</h3>
            <div className="ai-recommendations-list">
              {aiState.productRecommendations.map((product, index) => (
                <div key={product.id} className="ai-recommendation-item">
                  <div className="ai-recommendation-rank">#{index + 1}</div>
                  <div className="ai-recommendation-info">
                    <h4>{product.name}</h4>
                    <p>${product.price} • {product.category}</p>
                  </div>
                  <div className="ai-recommendation-score">
                    Score: {Math.round((product.rating || 0) * 10 + (product.soldCount || 0))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="ai-errors">
            <h3>System Health</h3>
            <div className="ai-health-status">
              <div className="ai-health-indicator" style={{ backgroundColor: getHealthColor(aiState.systemHealth) }}>
                {getHealthIcon(aiState.systemHealth)} {aiState.systemHealth}
              </div>
            </div>
            
            {aiState.errorLogs.length > 0 && (
              <div className="ai-error-list">
                {aiState.errorLogs.map((error, index) => (
                  <div key={index} className="ai-error-item">
                    <div className="ai-error-type">{error.type}</div>
                    <div className="ai-error-count">{error.count} items affected</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="ai-users">
            <h3>User Insights</h3>
            {aiState.userPreferences.favoriteCategories && (
              <div className="ai-user-preferences">
                <h4>Favorite Categories</h4>
                <div className="ai-preferences-list">
                  {aiState.userPreferences.favoriteCategories.map(category => (
                    <span key={category} className="ai-preference-tag">{category}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="ai-products">
            <h3>Product Analytics</h3>
            <div className="ai-product-stats">
              <div className="ai-product-stat">
                <h4>Flash Sale Products</h4>
                <p>{aiState.homepageContent.flashSale?.products?.length || 0}</p>
              </div>
              <div className="ai-product-stat">
                <h4>Top Sellers</h4>
                <p>{aiState.homepageContent.topSellers?.products?.length || 0}</p>
              </div>
              <div className="ai-product-stat">
                <h4>New Arrivals</h4>
                <p>{aiState.homepageContent.newArrivals?.products?.length || 0}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="ai-messages">
            <h3>AI Chat Messages</h3>
            <div className="ai-messages-list">
              {aiState.customerMessages.map((message, index) => (
                <div key={index} className="ai-message-item">
                  <div className="ai-message-customer">Customer {message.customerId}</div>
                  <div className="ai-message-content">{message.message}</div>
                  <div className="ai-message-response">{message.response}</div>
                  <div className="ai-message-time">
                    {message.timestamp.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="ai-settings">
            <h3>AI Settings</h3>
            <div className="ai-settings-list">
              <div className="ai-setting-item">
                <label>Auto Analysis Interval</label>
                <select defaultValue="30">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
              <div className="ai-setting-item">
                <label>Recommendation Count</label>
                <input type="number" defaultValue="12" min="1" max="50" />
              </div>
              <div className="ai-setting-item">
                <label>Enable Auto Responses</label>
                <input type="checkbox" defaultChecked />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIDashboard; 