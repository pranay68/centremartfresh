<<<<<<< HEAD
import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BulkProductUpload from '../components/BulkProductUpload';
import { toast } from 'react-hot-toast';
import './AdminProductPanel.css';
import { Link } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import { FaSearch } from 'react-icons/fa';
import { uploadToCloudinary } from '../../utils/cloudinaryUpload';

const Products = () => {
  // Categories state
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // Products state
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    deliveryFee: '',
    offer: '',
    stock: 0
  });
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    deliveryFee: '',
    offer: '',
    stock: 0
  });
  const [imageFile, setImageFile] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [offerForm, setOfferForm] = useState({
    discount: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);
  const [inlineNewCategory, setInlineNewCategory] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showChangeOfferModal, setShowChangeOfferModal] = useState(false);
  const [csvProducts, setCsvProducts] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const [categoriesList, setCategoriesList] = useState([]);
  const [newInlineCategory, setNewInlineCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState(null);
  const [deliveryEta, setDeliveryEta] = useState('');

  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [filterMarginMin, setFilterMarginMin] = useState('');
  const [filterMarginMax, setFilterMarginMax] = useState('');

  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState(30);
  const listRef = useRef();

  // Sticky header and bulk actions bar state
  const [isSticky, setIsSticky] = useState(false);
  const tableWrapperRef = useRef();
  useEffect(() => {
    const handleScroll = () => {
      if (!tableWrapperRef.current) return;
      const { top } = tableWrapperRef.current.getBoundingClientRect();
      setIsSticky(top <= 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch products from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          stock: data.stock || 0,
          deliveryFee: data.deliveryFee || 0,
          offer: data.offer || '',
          createdAt: data.createdAt ? data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt : new Date().toISOString(),
          price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
          name: data.name || '',
          description: data.description || '',
          category: data.category || '',
          imageUrl: data.imageUrl || ''
        };
      });
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter products by category
  useEffect(() => {
    if (selectedCategory === 'All Products') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category === selectedCategory));
    }
  }, [selectedCategory, products]);

  // Advanced filtering logic
  useEffect(() => {
    let filtered = products;
    if (selectedCategory !== 'All Products') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (filterSupplier) {
      filtered = filtered.filter(p => (p.supplier || p['Supplier Name']) === filterSupplier);
    }
    if (filterPriceMin) {
      filtered = filtered.filter(p => Number(p.price || p['SP']) >= Number(filterPriceMin));
    }
    if (filterPriceMax) {
      filtered = filtered.filter(p => Number(p.price || p['SP']) <= Number(filterPriceMax));
    }
    if (filterStock) {
      filtered = filtered.filter(p => Number(p.stock || p['Stock']) === Number(filterStock));
    }
    if (filterMarginMin) {
      filtered = filtered.filter(p => Number(p['Margin %'] || p.marginPercent) >= Number(filterMarginMin));
    }
    if (filterMarginMax) {
      filtered = filtered.filter(p => Number(p['Margin %'] || p.marginPercent) <= Number(filterMarginMax));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name || p['Description'] || '').toLowerCase().includes(term) ||
        (p.itemCode || p['Item Code'] || '').toLowerCase().includes(term) ||
        (p.category || p['Group Name'] || '').toLowerCase().includes(term)
      );
    }
    setFilteredProducts(filtered);
  }, [products, selectedCategory, filterSupplier, filterPriceMin, filterPriceMax, filterStock, filterMarginMin, filterMarginMax, searchTerm]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setVisibleCount(c => Math.min(filteredProducts.length, c + 30));
      }
    };
    const ref = listRef.current;
    if (ref) ref.addEventListener('scroll', handleScroll);
    return () => { if (ref) ref.removeEventListener('scroll', handleScroll); };
  }, [filteredProducts.length]);

  // Fetch categories from Firestore
  useEffect(() => {
    const fetchCategories = async () => {
      const snapshot = await getDocs(collection(db, 'categories'));
      const cats = snapshot.docs.map(doc => doc.data().name).filter(Boolean);
      setCategoriesList(cats);
    };
    fetchCategories();
  }, [showAddModal]);

  // Fetch delivery options from Firestore
  useEffect(() => {
    const fetchDeliveryOptions = async () => {
      const docRef = doc(db, 'settings', 'deliveryOptions');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setDeliveryOptions(docSnap.data().options || []);
      } else {
        setDeliveryOptions([
          { label: 'Fast Delivery (Today)', fee: 0, eta: 'Delivered Today' },
          { label: 'Express Delivery (2-3 days in Janakpur)', fee: 0, eta: '2-3 days (Janakpur only)' }
        ]);
      }
    };
    fetchDeliveryOptions();
  }, [showAddModal]);

  // When delivery option changes, auto-fill fee/eta
  useEffect(() => {
    if (selectedDeliveryOption) {
      setProductForm(form => ({
        ...form,
        deliveryFee: selectedDeliveryOption.fee
      }));
      setDeliveryEta(selectedDeliveryOption.eta || '');
    } else {
      setDeliveryEta('');
    }
  }, [selectedDeliveryOption]);

  // Add new category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await addDoc(collection(db, 'categories'), { name: newCategory.trim() });
      toast.success('Category added!');
      setShowAddCategoryModal(false);
      setNewCategory('');
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  // Inline editing for all fields (including image)
  const handleInlineEdit = async (productId, field, value) => {
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        [field]: field === 'price' || field === 'deliveryFee' || field === 'stock' ? parseFloat(value) : value
      });
      toast.success(`${field} updated!`);
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  // Bulk actions
  const handleBulkAction = (action) => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products first');
      return;
    }
    switch (action) {
      case 'delete':
        selectedProducts.forEach(productId => handleDeleteProduct(productId));
        setSelectedProducts([]);
        break;
      case 'changeOffer':
        setShowChangeOfferModal(true);
        break;
      case 'changeDeliveryFee':
        // Implement as needed
        break;
      default:
        break;
    }
  };

  // Add product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const newProduct = {
        name: productForm.name,
        price: parseFloat(productForm.price),
        description: productForm.description,
        category: productForm.category,
        deliveryFee: parseFloat(productForm.deliveryFee),
        offer: productForm.offer,
        stock: parseInt(productForm.stock),
        imageUrl: imageFile ? URL.createObjectURL(imageFile) : 'https://via.placeholder.com/40',
        createdAt: new Date()
      };
      await addDoc(collection(db, 'products'), newProduct);
      setProductForm({ name: '', price: '', description: '', category: '', deliveryFee: '', offer: '', stock: 0 });
      setImageFile(null);
      setShowAddModal(false);
      toast.success('Product added!');
    } catch (error) {
      toast.error('Failed to add product');
    } finally {
      setUploading(false);
    }
  };

  // Edit product modal
  const handleEditProduct = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const productRef = doc(db, 'products', editingProduct.id);
      await updateDoc(productRef, {
        name: editForm.name,
        price: parseFloat(editForm.price),
        description: editForm.description,
        category: editForm.category,
        deliveryFee: parseFloat(editForm.deliveryFee),
        offer: editForm.offer,
        stock: parseInt(editForm.stock),
        imageUrl: editImageFile ? URL.createObjectURL(editImageFile) : editingProduct.imageUrl
      });
      setShowEditModal(false);
      setEditingProduct(null);
      setEditForm({ name: '', price: '', description: '', category: '', deliveryFee: '', offer: '', stock: 0 });
      setEditImageFile(null);
      toast.success('Product updated!');
    } catch (error) {
      toast.error('Failed to update product');
    } finally {
      setUploading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      toast.success('Product deleted!');
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  // Selection logic
  const handleProductSelection = (productId) => {
    setSelectedProducts(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  };
  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };
  const handleCategorySelection = (category) => {
    if (category === 'All Products') {
      setSelectedProducts(products.map(p => p.id));
    } else {
      const categoryProducts = products.filter(p => p.category === category);
      setSelectedProducts(categoryProducts.map(p => p.id));
    }
  };
  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name || '',
      price: product.price || '',
      description: product.description || '',
      category: product.category || '',
      deliveryFee: product.deliveryFee || '',
      offer: product.offer || '',
      stock: product.stock || 0
    });
    setShowEditModal(true);
  };

  const handleInlineAddCategory = async () => {
    if (!newInlineCategory.trim()) return;
    setAddingCategory(true);
    try {
      await addDoc(collection(db, 'categories'), { name: newInlineCategory.trim() });
      setCategoriesList(prev => [...prev, newInlineCategory.trim()]);
      setProductForm(form => ({ ...form, category: newInlineCategory.trim() }));
      setNewInlineCategory('');
      toast.success('Category added!');
    } catch (err) {
      toast.error('Failed to add category');
    }
    setAddingCategory(false);
  };

  // InlineEditableField for all fields (including image)
  const InlineEditableField = ({ product, field, type = 'text', className = '' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(() => {
      const fieldValue = product[field];
      if (field === 'imageUrl') return '';
      if (fieldValue === null || fieldValue === undefined) return '';
      if (typeof fieldValue === 'object') return '';
      return String(fieldValue);
    });
    const [imagePreview, setImagePreview] = useState(product.imageUrl || '');
    const handleSave = async () => {
      if (field === 'imageUrl' && value) {
        await handleInlineEdit(product.id, field, imagePreview);
      } else if (value !== String(product[field] || '')) {
        await handleInlineEdit(product.id, field, value);
      }
      setIsEditing(false);
    };
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setValue(String(product[field] || ''));
        setIsEditing(false);
      }
    };
    if (isEditing) {
      if (field === 'imageUrl') {
        return (
          <div className="flex flex-col items-center gap-1">
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  setImagePreview(url);
                  setValue(url);
                }
              }}
              className="w-24"
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="w-10 h-10 object-cover rounded border" />
            )}
            <button type="button" onClick={handleSave} className="text-xs text-blue-600 mt-1">Save</button>
          </div>
        );
      }
      return (
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyPress}
          className={`w-full px-1 py-0.5 border border-blue-400 rounded text-xs ${className}`}
          autoFocus
        />
      );
    }
    const displayValue = (() => {
      const fieldValue = product[field];
      if (fieldValue === null || fieldValue === undefined) return 'Click to edit';
      if (typeof fieldValue === 'object') return 'Click to edit';
      if (field === 'price') {
        return `Rs. ${parseFloat(fieldValue).toLocaleString()}`;
      } else if (field === 'deliveryFee') {
        return `Rs. ${parseFloat(fieldValue).toLocaleString()}`;
      } else if (field === 'imageUrl') {
        return (
          <div style={{ width: 40, height: 40, overflow: 'hidden', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
            <img
              src={product.imageUrl || 'https://via.placeholder.com/40'}
              alt={product.name}
              style={{ width: 40, height: 40, objectFit: 'cover', display: 'block' }}
              onClick={() => setIsEditing(true)}
            />
          </div>
        );
      } else {
        return String(fieldValue) || 'Click to edit';
      }
    })();
    if (field === 'imageUrl') {
      return (
        <div className="flex items-center justify-center">{displayValue}</div>
      );
    }
    return (
      <div 
        onClick={() => setIsEditing(true)}
        className={`cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded text-xs ${className}`}
        style={{ minWidth: 60 }}
      >
        {displayValue}
      </div>
    );
  };

  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [addImageProduct, setAddImageProduct] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const handleOpenAddImageModal = (product) => {
    setAddImageProduct(product);
    setShowAddImageModal(true);
    setSelectedImageFile(null);
    setImagePreviewUrl('');
  };
  const handleCloseAddImageModal = () => {
    setShowAddImageModal(false);
    setAddImageProduct(null);
    setSelectedImageFile(null);
    setImagePreviewUrl('');
  };
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };
  const handleUploadImage = async () => {
    if (!selectedImageFile || !addImageProduct) return;
    setUploadingImage(true);
    try {
      const url = await uploadToCloudinary(selectedImageFile, 'image');
      await updateDoc(doc(db, 'products', addImageProduct.id), { imageUrl: url });
      toast.success('Image uploaded!');
      handleCloseAddImageModal();
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading products...</div>
      </div>
    );
  }

  // Get unique suppliers for filter dropdown
  const suppliers = Array.from(new Set(products.map(p => p.supplier || p['Supplier Name']).filter(Boolean)));

  // Build category list from products
  const allProductCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const categories = ['All Products', ...allProductCategories];
  // Group products by category, including 'Uncategorized' for products without a valid category
  const groupedProducts = categories.reduce((acc, category) => {
    if (category === 'All Products') return acc;
    acc[category] = filteredProducts.filter(p => p.category === category);
    return acc;
  }, {});
  const uncategorizedProducts = filteredProducts.filter(
    p => !p.category || !categories.includes(p.category)
  );
  if (uncategorizedProducts.length > 0) {
    groupedProducts['Uncategorized'] = uncategorizedProducts;
  }

  const csvTemplate = `itemCode,name,baseUnit,group,category,supplier,price,lastPurcMiti,lastPurcQty,salesQty\n1001,Sample Product,PCS,Group,Category,Supplier,100,2082/03/13,12,20`;

  function downloadCSVTemplate() {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',');
    return lines.slice(1).map((line, idx) => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim(); });
      obj._row = idx + 2;
      return obj;
    });
  }

  const handleCSVUpload = (e) => {
    setCsvErrors([]);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const products = parseCSV(evt.target.result);
        // Validate
        const errors = [];
        products.forEach((p, i) => {
          if (!p.name || !p.price || !p.category) {
            errors.push(`Row ${p._row}: Missing required field (name, price, or category)`);
          } else if (isNaN(Number(p.price))) {
            errors.push(`Row ${p._row}: Price must be a number`);
          }
        });
        setCsvProducts(products);
        setCsvErrors(errors);
      } catch (err) {
        setCsvErrors(['Failed to parse CSV.']);
        setCsvProducts([]);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkUpload = async () => {
    setUploading(true);
    try {
      for (const p of csvProducts) {
        if (!p.name || !p.price || !p.category || isNaN(Number(p.price))) continue;
        await addDoc(collection(db, 'products'), {
          name: p.name,
          price: Number(p.price),
          category: p.category,
          description: p.description || '',
          imageUrl: '',
          createdAt: new Date(),
        });
      }
      setShowBulkModal(false);
      setCsvProducts([]);
      setCsvErrors([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('Bulk upload complete!');
    } catch (err) {
      alert('Bulk upload failed.');
    }
    setUploading(false);
  };

  // Analytics calculations
  const totalProducts = products.length;
  const outOfStock = products.filter(p => Number(p.stock || p['Stock']) === 0).length;
  const lowMargin = products.filter(p => Number(p['Margin %'] || p.marginPercent) < 10).length;
  const topCategories = (() => {
    const counts = {};
    products.forEach(p => {
      const cat = p.category || p['Group Name'] || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  })();
  const topSuppliers = (() => {
    const counts = {};
    products.forEach(p => {
      const sup = p.supplier || p['Supplier Name'] || 'Unknown';
      counts[sup] = (counts[sup] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  })();

  return (
    <div className="admin-products-panel">
      {/* Analytics Dashboard */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <Card style={{ flex: 1, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Total Products</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{totalProducts}</div>
        </Card>
        <Card style={{ flex: 1, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Out of Stock</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{outOfStock}</div>
        </Card>
        <Card style={{ flex: 1, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Low Margin (&lt;10%)</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{lowMargin}</div>
        </Card>
        <Card style={{ flex: 1, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Top Categories</div>
          <div style={{ fontSize: 15 }}>{topCategories.map(([cat, count]) => <div key={cat}>{cat}: {count}</div>)}</div>
        </Card>
        <Card style={{ flex: 1, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Top Suppliers</div>
          <div style={{ fontSize: 15 }}>{topSuppliers.map(([sup, count]) => <div key={sup}>{sup}: {count}</div>)}</div>
        </Card>
      </div>
      {/* Header */}
      <div className="admin-products-header-row" style={{ position: isSticky ? 'sticky' : 'static', top: 0, zIndex: 10, background: '#f8fafc' }}>
        <h1 className="text-2xl font-bold text-gray-900" style={{ margin: 0, fontSize: '1.2rem' }}>Products Management</h1>
        <Button onClick={() => setShowBulkModal(true)} variant="primary">Bulk Upload</Button>
        <Button onClick={() => setShowAddCategoryModal(true)} variant="secondary">Add Category</Button>
        <Button onClick={() => setShowAddModal(true)} variant="success">Add Product</Button>
      </div>
      <div style={{ marginBottom: 24 }}>
        <Link to="/admin/delivery-settings">
          <Button variant="outline">Manage Delivery Options & Locations</Button>
        </Link>
      </div>

      {/* Filter/Search Bar */}
      <div className="admin-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <Input placeholder="Search by name, code, category..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ minWidth: 200 }} />
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
          <option value="All Products">All Categories</option>
          {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Input placeholder="Min Price" type="number" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)} style={{ width: 90 }} />
        <Input placeholder="Max Price" type="number" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)} style={{ width: 90 }} />
        <Input placeholder="Stock" type="number" value={filterStock} onChange={e => setFilterStock(e.target.value)} style={{ width: 80 }} />
        <Input placeholder="Min Margin %" type="number" value={filterMarginMin} onChange={e => setFilterMarginMin(e.target.value)} style={{ width: 90 }} />
        <Input placeholder="Max Margin %" type="number" value={filterMarginMax} onChange={e => setFilterMarginMax(e.target.value)} style={{ width: 90 }} />
        <Button onClick={() => {
          setSearchTerm(''); setFilterSupplier(''); setFilterPriceMin(''); setFilterPriceMax(''); setFilterStock(''); setFilterMarginMin(''); setFilterMarginMax(''); setSelectedCategory('All Products');
        }}>Clear</Button>
      </div>
      {/* Bulk Actions Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <input type="checkbox" checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0} onChange={handleSelectAll} />
        <span style={{ fontSize: 14 }}>{selectedProducts.length} selected</span>
        <select onChange={e => handleBulkAction(e.target.value)} defaultValue="">
          <option value="">Bulk Actions</option>
          <option value="delete">Delete</option>
          <option value="changeOffer">Change Offer</option>
          <option value="changeCategory">Change Category</option>
          <option value="changeSupplier">Change Supplier</option>
        </select>
      </div>

      {/* Category Selection */}
      <Card>
        <Card.Content className="p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Category Selection</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.map(category => (
                <div key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    id={category}
                    checked={selectedCategory === category}
                    onChange={() => setSelectedCategory(category)}
                    className="rounded border-gray-300 mr-2"
                  />
                  <label htmlFor={category} className="text-sm font-medium text-gray-700 cursor-pointer">{category}</label>
                </div>
              ))}
            </div>
          </div>
        </Card.Content>
      </Card>
      
      {/* Bulk Selection */}
      <Card>
            <Card.Content className="p-4">
          <div className="flex flex-wrap gap-3 items-center overflow-x-auto">
            <span className="text-sm font-medium text-gray-700">Quick Select:</span>
            <Button size="sm" variant="outline" onClick={() => handleCategorySelection('All Products')}>All Products</Button>
            {categories.filter(cat => cat !== 'All Products').map(category => (
              <Button key={category} size="sm" variant="outline" onClick={() => handleCategorySelection(category)}>{category}</Button>
            ))}
              </div>
            </Card.Content>
      </Card>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="sticky-bulk-actions-bar" style={{ position: isSticky ? 'fixed' : 'static', top: 0, left: 0, right: 0, zIndex: 30, background: '#f8fafc', boxShadow: isSticky ? '0 2px 8px #e0e7ef33' : 'none', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="text-sm text-gray-600">{selectedProducts.length} products selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={() => handleBulkAction('delete')}>Delete Selected</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('changeOffer')}>Change Offer</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('changeDeliveryFee')}>Change Delivery Fee</Button>
          </div>
        </div>
      )}

      {/* Products List */}
      <Card>
        <Card.Content className="p-0">
          <div className="admin-table-scroll-wrapper" ref={tableWrapperRef}>
            <table className="w-full text-xs" style={{ minWidth: '1200px' }}>
              <thead className="bg-gray-50 sticky top-0 z-20">
                <tr>
                  <th className="px-2 py-2 text-left"><input type="checkbox" checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0} onChange={handleSelectAll} className="rounded border-gray-300" /></th>
                  <th className="px-2 py-2 text-left">Image</th>
                  <th className="px-2 py-2 text-left">Name</th>
                  <th className="px-2 py-2 text-left">SP</th>
                  <th className="px-2 py-2 text-left">Offer</th>
                  <th className="px-2 py-2 text-left">Delivery Fee</th>
                  <th className="px-2 py-2 text-left">Category</th>
                  <th className="px-2 py-2 text-left">Stock</th>
                  <th className="px-2 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200" ref={listRef}>
                {Object.entries(groupedProducts).map(([category, productsInCat]) => (
                  <React.Fragment key={category}>
                    {/* Category Row */}
                    <tr className="bg-gray-100">
                      <td colSpan={9} className="px-2 py-2">
                        <div className="flex items-center gap-2 ml-6">
                          <input
                            type="checkbox"
                            checked={productsInCat.length > 0 && productsInCat.every(p => selectedProducts.includes(p.id))}
                            onChange={() => {
                              const allIds = productsInCat.map(p => p.id);
                              if (allIds.every(id => selectedProducts.includes(id))) {
                                setSelectedProducts(selectedProducts.filter(id => !allIds.includes(id)));
                              } else {
                                setSelectedProducts([...new Set([...selectedProducts, ...allIds])]);
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="font-semibold text-blue-800">{category}</span>
                        </div>
                      </td>
                    </tr>
                    {/* Products in Category */}
                    {productsInCat.slice(0, visibleCount).map(product => (
                      <tr key={product.id} className="product-row">
                        <td className="product-cell"><input type="checkbox" checked={selectedProducts.includes(product.id)} onChange={() => handleProductSelection(product.id)} className="rounded border-gray-300" /></td>
                        <td className="product-cell">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover rounded border" />
                          ) : (
                            <Button size="xs" variant="outline" onClick={() => handleOpenAddImageModal(product)}>
                              Add Image
                            </Button>
                          )}
                        </td>
                        <td className="product-cell"><InlineEditableField product={product} field="name" /></td>
                        <td className="product-cell"><InlineEditableField product={product} field="price" type="number" /></td>
                        <td className="product-cell"><InlineEditableField product={product} field="offer" /></td>
                        <td className="product-cell"><InlineEditableField product={product} field="deliveryFee" type="number" /></td>
                        <td className="product-cell"><InlineEditableField product={product} field="category" /></td>
                        <td className="product-cell"><InlineEditableField product={product} field="stock" type="number" /></td>
                        <td className="product-cell"><div className="action-buttons"><Button size="xs" variant="outline" onClick={() => openEditModal(product)}>Edit</Button><Button size="xs" variant="danger" onClick={() => handleDeleteProduct(product.id)}>Delete</Button></div></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12"><p className="text-gray-500">No products found in this category</p></div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Product">
        <form onSubmit={handleAddProduct} className="space-y-4">
            <input type="text" placeholder="Name" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} required className="w-full border rounded p-2" />
            <input type="number" placeholder="Price" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} required className="w-full border rounded p-2" />
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <div className="flex gap-2 items-center">
                <select
                  className="w-full border rounded p-2"
                  value={productForm.category}
                  onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                  required
                >
                  <option value="">Select Category</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="+ New"
                  value={newInlineCategory}
                  onChange={e => setNewInlineCategory(e.target.value)}
                  className="border rounded p-2 w-32"
                  disabled={addingCategory}
                />
                <Button size="sm" onClick={handleInlineAddCategory} disabled={addingCategory || !newInlineCategory.trim()} type="button">Add</Button>
              </div>
            </div>
            <input type="text" placeholder="Description" value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} className="w-full border rounded p-2" />
            <div>
              <label className="block text-sm font-medium mb-1">Delivery Option</label>
              <select
                className="w-full border rounded p-2"
                value={selectedDeliveryOption ? selectedDeliveryOption.label : ''}
                onChange={e => {
                  const opt = deliveryOptions.find(o => o.label === e.target.value);
                  setSelectedDeliveryOption(opt || null);
                }}
                required
              >
                <option value="">Select Delivery Option</option>
                {deliveryOptions.map(opt => (
                  <option key={opt.label} value={opt.label}>{opt.label} {opt.fee ? `(Rs. ${opt.fee})` : ''}</option>
                ))}
              </select>
              {deliveryEta && <div className="text-xs text-gray-500 mt-1">ETA: {deliveryEta}</div>}
            </div>
            <input type="number" placeholder="Delivery Fee" value={productForm.deliveryFee} onChange={e => setProductForm({ ...productForm, deliveryFee: e.target.value })} className="w-full border rounded p-2" required />
            <input type="number" placeholder="Stock" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} className="w-full border rounded p-2" />
            <button type="submit" className="admin-btn w-full">Add Product</button>
          </form>
        </Modal>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <Modal isOpen={showAddCategoryModal} onClose={() => setShowAddCategoryModal(false)} title="Add Category">
          <form onSubmit={handleAddCategory} className="space-y-4">
            <input type="text" placeholder="Category Name" value={newCategory} onChange={e => setNewCategory(e.target.value)} required className="w-full border rounded p-2" />
            <button type="submit" className="admin-btn w-full">Add Category</button>
        </form>
      </Modal>
      )}

      {/* Edit Product Modal */}
      <BulkProductUpload
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {/* Optionally reload products here */}}
      />

      {/* Offer Modal */}
      <BulkProductUpload
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        onSuccess={() => {/* Optionally reload products here */}}
      />

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <BulkProductUpload
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {/* Optionally reload products here */}}
          style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}
        />
      )}
      {showChangeOfferModal && (
        <Modal isOpen={showChangeOfferModal} onClose={() => setShowChangeOfferModal(false)} title="Change Offer for Selected Products">
          <ChangeOfferForm selectedProducts={selectedProducts} onClose={() => setShowChangeOfferModal(false)} />
        </Modal>
      )}

      {showAddImageModal && (
        <Modal isOpen={showAddImageModal} onClose={handleCloseAddImageModal} title="Add Product Image">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="font-medium">Choose Image</label>
              <label htmlFor="galleryInput" className="upload-label">
                <Input id="galleryInput" type="file" accept="image/*" onChange={handleImageFileChange} style={{ display: 'none' }} />
                <span role="img" aria-label="gallery" className="upload-icon">🖼️</span> Choose from Gallery
              </label>
              <label htmlFor="cameraInput" className="upload-label">
                <Input id="cameraInput" type="file" accept="image/*" capture="environment" onChange={handleImageFileChange} style={{ display: 'none' }} />
                <span role="img" aria-label="camera" className="upload-icon">📷</span> Take Photo (Camera)
              </label>
            </div>
            {imagePreviewUrl && (
              <div className="flex flex-col items-center gap-2">
                <img src={imagePreviewUrl} alt="Preview" className="w-32 h-32 object-cover rounded border" />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="secondary" onClick={handleCloseAddImageModal}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={handleUploadImage} disabled={!selectedImageFile || uploadingImage} loading={uploadingImage}>
                Upload
              </Button>
            </div>
          </div>
        </Modal>
      )}
=======
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
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
    </div>
  );
};

export default Products;
<<<<<<< HEAD

const ChangeOfferForm = ({ selectedProducts, onClose }) => {
  const [offer, setOffer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const handleApplyOffer = async () => {
    setLoading(true);
    try {
      await Promise.all(selectedProducts.map(productId => updateDoc(doc(db, 'products', productId), { offer, offerStartDate: startDate, offerEndDate: endDate })));
      toast.success('Offer updated for selected products!');
      onClose();
    } catch (err) {
      toast.error('Failed to update offer');
    }
    setLoading(false);
  };
  return (
    <div className="space-y-4">
      <Input label="Offer" value={offer} onChange={e => setOffer(e.target.value)} placeholder="Enter offer (e.g. 10% OFF)" />
      <div className="flex gap-2">
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded p-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded p-2" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={handleApplyOffer} loading={loading} disabled={!offer || !startDate || !endDate}>Apply</Button>
      </div>
    </div>
  );
};
=======
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
