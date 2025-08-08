import React, { useState, useEffect } from 'react';
import { getAllProductsWithOverrides, setProductStock } from '../../utils/productOperations';
import { getStockStatus } from '../../utils/sortProducts';
import './StockManagement.css';

const StockManagement = () => {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('all'); // all, out_of_stock, low_stock
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsData = getAllProductsWithOverrides();
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (productId, newStock) => {
    try {
      const updated = setProductStock(productId, newStock);
      setProducts(products.map(p => 
        p.id === productId ? { ...p, stock: updated } : p
      ));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
    }
  };

  const startEditing = (product) => {
    setEditingId(product.id);
    setEditValue((product.stock ?? 0).toString());
  };

  const filteredProducts = products.filter(product => {
    const status = getStockStatus(product.stock);
    if (filter === 'all') return true;
    return status === filter;
  });

  if (loading) {
    return <div className="stock-management loading">Loading...</div>;
  }

  return (
    <div className="stock-management">
      <div className="stock-header">
        <h2>Stock Management</h2>
        <div className="stock-filters">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All Products ({products.length})
          </button>
          <button 
            className={filter === 'out_of_stock' ? 'active' : ''} 
            onClick={() => setFilter('out_of_stock')}
          >
            Out of Stock ({products.filter(p => (p.stock || 0) === 0).length})
          </button>
          <button 
            className={filter === 'low_stock' ? 'active' : ''} 
            onClick={() => setFilter('low_stock')}
          >
            Low Stock ({products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 2).length})
          </button>
        </div>
      </div>

      <div className="stock-table">
        <div className="table-header">
          <div className="col-product">Product</div>
          <div className="col-category">Category</div>
          <div className="col-stock">Stock</div>
          <div className="col-status">Status</div>
          <div className="col-actions">Actions</div>
        </div>
        
        <div className="table-body">
          {filteredProducts.map(product => {
            const status = getStockStatus(product.stock);
            
            return (
              <div key={product.id} className={`table-row ${status}`}>
                <div className="col-product">
                  {product.image && <img src={product.image} alt={product.name} />}
                  <span>{product.name}</span>
                </div>
                <div className="col-category">{product.category}</div>
                <div className="col-stock">
                  {editingId === product.id ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleStockUpdate(product.id, editValue);
                        }
                      }}
                      min="0"
                      autoFocus
                    />
                  ) : (
                    <span>{product.stock || 0}</span>
                  )}
                </div>
                <div className="col-status">
                  <span className={`status-badge ${status}`}>
                    {status === 'out_of_stock' ? 'Out of Stock' :
                     status === 'low_stock' ? 'Low Stock' : 'In Stock'}
                  </span>
                </div>
                <div className="col-actions">
                  {editingId === product.id ? (
                    <>
                      <button 
                        className="save-btn"
                        onClick={() => handleStockUpdate(product.id, editValue)}
                      >
                        Save
                      </button>
                      <button 
                        className="cancel-btn"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button 
                      className="edit-btn"
                      onClick={() => startEditing(product)}
                    >
                      Edit Stock
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StockManagement; 