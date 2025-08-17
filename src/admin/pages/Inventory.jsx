import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import "../AdminPanel.css";
// Switch inventory read to Supabase; keep local stock override setter for now
import publicProducts from '../../utils/publicProducts';
import { setProductStock } from '../../utils/productOperations';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockUpdate, setStockUpdate] = useState({ quantity: '', operation: 'set' });

  const CATEGORIES = [
    'Groceries', 'Home Appliances', 'Sports', 'Kid Stuff', 
    'Medicines', 'Electronics', 'Fashion', 'Books', 'Others'
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await publicProducts.ensureLoaded();
        const data = publicProducts.getAllCached().slice(0, 5000);
        setProducts(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error loading inventory products', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateStock = async () => {
    if (!selectedProduct || !stockUpdate.quantity) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      const quantity = parseInt(stockUpdate.quantity);
      let newStock;

      switch (stockUpdate.operation) {
        case 'set':
          newStock = quantity;
          break;
        case 'add':
          newStock = (selectedProduct.stock || 0) + quantity;
          break;
        case 'subtract':
          newStock = Math.max(0, (selectedProduct.stock || 0) - quantity);
          break;
        default:
          newStock = quantity;
      }

      const updated = setProductStock(selectedProduct.id, newStock);
      setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, stock: updated } : p));
      toast.success('Stock updated successfully!');
      setShowStockModal(false);
      setSelectedProduct(null);
      setStockUpdate({ quantity: '', operation: 'set' });
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (stock < 10) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = products.filter(product => (product.stock || 0) < 10);
  const outOfStockProducts = products.filter(product => (product.stock || 0) === 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{products.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <span className="text-2xl">📦</span>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-3xl font-bold text-yellow-600">{lowStockProducts.length}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-3xl font-bold text-red-600">{outOfStockProducts.length}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <span className="text-2xl">🚫</span>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <Card.Content className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </Card.Content>
      </Card>

      {/* Products Table */}
      <Card>
        <Card.Content className="p-0">
          <div className="admin-table-scroll-wrapper">
            <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '1200px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock || 0);
                  return (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={product.imageUrl || 'https://via.placeholder.com/40'}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover mr-3"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Rs. {product.price?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {product.stock || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowStockModal(true);
                          }}
                          className="admin-btn"
                        >
                          Update Stock
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found</p>
        </div>
      )}

      {/* Stock Update Modal */}
      <Modal
        isOpen={showStockModal}
        onClose={() => {
          setShowStockModal(false);
          setSelectedProduct(null);
          setStockUpdate({ quantity: '', operation: 'set' });
        }}
        title={`Update Stock - ${selectedProduct?.name}`}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Current Stock</p>
            <p className="text-2xl font-bold text-gray-900">{selectedProduct?.stock || 0}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operation
            </label>
            <select
              value={stockUpdate.operation}
              onChange={(e) => setStockUpdate({...stockUpdate, operation: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="set">Set to</option>
              <option value="add">Add</option>
              <option value="subtract">Subtract</option>
            </select>
          </div>

          <Input
            label="Quantity"
            type="number"
            min="0"
            value={stockUpdate.quantity}
            onChange={(e) => setStockUpdate({...stockUpdate, quantity: e.target.value})}
            placeholder="Enter quantity"
          />

          <div className="flex gap-2 pt-4">
            <Button onClick={updateStock} className="flex-1 admin-btn">
              Update Stock
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowStockModal(false);
                setSelectedProduct(null);
                setStockUpdate({ quantity: '', operation: 'set' });
              }}
              className="admin-btn"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;