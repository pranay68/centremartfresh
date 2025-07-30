import React, { useEffect, useState, useCallback } from "react";
import { 
  collection, 
  getDocs, 
  query, 
  limit, 
  startAfter, 
  orderBy,
  addDoc,
  doc,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "../../firebase/config";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";

const CATEGORIES = ["Electronics", "Fashion", "Home", "Books", "Toys", "Beauty", "Sports"];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    category: "",
    description: ""
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bulkData, setBulkData] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);

  // Cache timeout in milliseconds (5 minutes)
  const CACHE_TIMEOUT = 5 * 60 * 1000;
  const [lastFetch, setLastFetch] = useState(null);
  const [cachedProducts, setCachedProducts] = useState(new Map());

  const fetchProducts = useCallback(async (initial = false) => {
    if (loading || (!hasMore && !initial)) return;

    // Check cache for initial load
    if (initial && lastFetch && (Date.now() - lastFetch) < CACHE_TIMEOUT && cachedProducts.size > 0) {
      setProducts(Array.from(cachedProducts.values()));
      return;
    }

    setLoading(true);
    try {
      const productsRef = collection(db, "products");
      let q;
      
      if (initial) {
        // For initial load, we'll select only essential fields to reduce payload
        q = query(
          productsRef,
          orderBy("createdAt", "desc"),
          limit(15),
        );
      } else {
        q = query(
          productsRef,
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(10),
        );
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      const newProducts = docs.map(doc => {
        const data = {
          id: doc.id,
          ...doc.data()
        };
        
        // Update cache for each product
        if (initial) {
          cachedProducts.set(doc.id, data);
        }
        return data;
      });

      if (initial) {
        setProducts(newProducts);
        setCachedProducts(new Map(newProducts.map(p => [p.id, p])));
        setLastFetch(Date.now());
      } else {
        setProducts(prev => [...prev, ...newProducts]);
        // Update cache with new products
        const updatedCache = new Map(cachedProducts);
        newProducts.forEach(p => updatedCache.set(p.id, p));
        setCachedProducts(updatedCache);
      }

      setLastDoc(docs[docs.length - 1]);
      setHasMore(docs.length === (initial ? 15 : 10));
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, lastDoc, cachedProducts, lastFetch, CACHE_TIMEOUT]);

  useEffect(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  useEffect(() => {
    if (!hasMore || loading) return;

    const handleScroll = () => {
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;

      if (scrolledToBottom) {
        fetchProducts(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, lastDoc, fetchProducts]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price || !productForm.category) return;
    
    setUploading(true);
    try {
      // First upload the image if present
      let imageUrl = null;
      if (imageFile) {
        // Add your image upload logic here
        // imageUrl = await uploadImage(imageFile);
      }

      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        imageUrl,
        createdAt: new Date().toISOString(),
      };

      const productsRef = collection(db, "products");
      const docRef = await addDoc(productsRef, productData);
      
      // Update local state and cache efficiently
      const newProduct = { id: docRef.id, ...productData };
      setProducts(prev => [newProduct, ...prev]);
      setCachedProducts(new Map([[docRef.id, newProduct], ...cachedProducts]));
      
      // Reset form
      setProductForm({ name: "", price: "", category: "", description: "" });
      setImageFile(null);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error adding product:", error);
      // Add your error handling (e.g., show toast)
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkData.trim()) return;
    
    setBulkUploading(true);
    try {
      const lines = bulkData.trim().split('\n');
      const validProducts = [];
      
      // Parse and validate all lines first
      for (const line of lines) {
        const [name, price, description, category, imageUrl] = line.split('|').map(s => s.trim());
        if (!name || !price || !category || !CATEGORIES.includes(category)) continue;
        
        validProducts.push({
          name,
          price: parseFloat(price),
          description: description || '',
          category,
          imageUrl: imageUrl || null,
          createdAt: new Date().toISOString()
        });
      }

      if (validProducts.length === 0) {
        throw new Error("No valid products found in the data");
      }

      // Batch write to Firestore
      const batch = writeBatch(db);
      const newProducts = [];
      const productsRef = collection(db, "products");

      for (const product of validProducts) {
        const docRef = doc(productsRef);
        batch.set(docRef, product);
        newProducts.push({ id: docRef.id, ...product });
      }

      await batch.commit();

      // Update local state and cache efficiently
      setProducts(prev => [...newProducts, ...prev]);
      const updatedCache = new Map(cachedProducts);
      newProducts.forEach(p => updatedCache.set(p.id, p));
      setCachedProducts(updatedCache);

      setBulkData("");
      setShowBulkModal(false);
    } catch (error) {
      console.error("Error in bulk upload:", error);
      // Add your error handling (e.g., show toast)
    } finally {
      setBulkUploading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await deleteDoc(doc(db, "products", id));
      
      // Update local state and cache efficiently
      setProducts(prev => prev.filter(p => p.id !== id));
      const updatedCache = new Map(cachedProducts);
      updatedCache.delete(id);
      setCachedProducts(updatedCache);
    } catch (error) {
      console.error("Error deleting product:", error);
      // Add your error handling (e.g., show toast)
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Products</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)}>Add Product</Button>
          <Button variant="outline" onClick={() => setShowBulkModal(true)}>
            Bulk Upload
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => (
          <Card key={product.id} hover>
            <div className="aspect-w-16 aspect-h-9">
              <img
                src={product.imageUrl || 'https://via.placeholder.com/300x200'}
                alt={product.name}
                className="w-full h-48 object-cover rounded-t-xl"
              />
            </div>
            <Card.Content className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{product.description}</p>
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-bold text-primary-600">
                  Rs. {product.price?.toLocaleString()}
                </span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {product.category}
                </span>
              </div>
            </Card.Content>
            <Card.Footer className="p-4 pt-0">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="admin-btn flex-1">
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="danger" 
                  onClick={() => handleDeleteProduct(product.id)}
                  className="admin-btn"
                >
                  Delete
                </Button>
              </div>
            </Card.Footer>
          </Card>
        ))}
      </div>

      {products.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading products...</p>
        </div>
      )}

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Product"
        size="lg"
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          <Input
            label="Product Name"
            value={productForm.name}
            onChange={(e) => setProductForm({...productForm, name: e.target.value})}
            required
          />
          <Input
            label="Price"
            type="number"
            step="0.01"
            value={productForm.price}
            onChange={(e) => setProductForm({...productForm, price: e.target.value})}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={productForm.category}
              onChange={(e) => setProductForm({...productForm, category: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 admin-btn"
              required
            >
              <option value="">Select Category</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm({...productForm, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 admin-btn"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" loading={uploading} className="flex-1">
              Add Product
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Upload Products"
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Format Instructions:</h4>
            <p className="text-sm text-blue-700 mb-2">
              Enter one product per line in this format:
            </p>
            <code className="text-xs bg-blue-100 p-2 rounded block">
              Product Name | Price | Description | Category | Image URL (optional)
            </code>
            <p className="text-xs text-blue-600 mt-2">
              Available categories: {CATEGORIES.join(', ')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Data
            </label>
            <textarea
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              rows={10}
              placeholder="iPhone 14 | 999 | Latest iPhone model | Electronics | https://example.com/image.jpg&#10;Samsung TV | 599 | 55 inch Smart TV | Electronics&#10;Nike Shoes | 129 | Running shoes | Fashion"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm admin-btn"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleBulkUpload} 
              loading={bulkUploading} 
              className="flex-1"
            >
              Upload Products
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowBulkModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;
