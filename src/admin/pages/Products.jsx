import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BulkProductUpdate from '../components/BulkProductUpload';
import { toast } from 'react-hot-toast';
import './AdminProductPanel.css';
import { Link } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
// import { FaSearch } from 'react-icons/fa'; // Unused for now
import { uploadImage } from '../../utils/cloudinary';
import { addProductImage, removeProductImage, deleteProductRow } from '../../utils/supabaseAdmin';
import { importProductsCsvText } from '../../utils/supabaseCsvImport';
// import { sortByStock } from '../../utils/sortProducts'; // Unused for now
import throttle from 'lodash/throttle';
import { addProduct, updateProduct, setProductStock } from '../../utils/productOperations';
import publicProducts from '../../utils/publicProducts';
import PowerSearch from '../../components/PowerSearch';

const Products = () => {
  // Categories state
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // Products state - optimized for large datasets
  const [allProducts, setAllProducts] = useState([]); // full dataset loaded from Supabase
  const [filteredProducts, setFilteredProducts] = useState([]); // filtered set for search/category/filters
  const [products, setProducts] = useState([]); // currently visible page (100 rows)
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 100; // show 100 visibly at once
  const [showAllMode, setShowAllMode] = useState(true); // show all products in admin by default
  const LOW_STOCK_THRESHOLD = 5;
  const [lowStockCount, setLowStockCount] = useState(0);
  const [noImageCount, setNoImageCount] = useState(0);
  const [topCategories, setTopCategories] = useState([]);
  const [topSuppliers, setTopSuppliers] = useState([]);
  const [supabaseCount, setSupabaseCount] = useState(null);
  const [allCountsMatch, setAllCountsMatch] = useState(null);
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
  // Removed unused offerForm state
  // Removed unused inline category UI flags
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showChangeOfferModal, setShowChangeOfferModal] = useState(false);
  const [csvProducts, setCsvProducts] = useState([]);
  // Bulk upload state
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

  // Sticky header and bulk actions bar state
  const [isSticky, setIsSticky] = useState(false);
  const tableWrapperRef = useRef();
  const tableScrollRef = useRef(null);
  const ROW_HEIGHT = 56; // px per row approx
  const VIRTUAL_BUFFER = 8; // rows
  const [virtualStart, setVirtualStart] = useState(0);
  const [virtualEnd, setVirtualEnd] = useState(20);
  const CHUNK_SIZE = 1000;
  const fetchingRef = useRef(false);

  const searchDebounceRef = useRef(null);
  useEffect(() => {
    const handleScroll = () => {
      if (!tableWrapperRef.current) return;
      const { top } = tableWrapperRef.current.getBoundingClientRect();
      setIsSticky(top <= 0);
    };
    const deb = (e) => handleScroll(e);
    window.addEventListener('scroll', deb, { passive: true });
    return () => window.removeEventListener('scroll', deb);
  }, [showAllMode]);

  // Load products from public snapshot (/data/products.json) for admin reads
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        await publicProducts.ensureLoaded();
        const all = publicProducts.getAllCached() || [];
        const firstProducts = publicProducts.getChunk(0, PAGE_SIZE) || [];
        setAllProducts(all.slice());
        setFilteredProducts(all.slice());
        setProducts(showAllMode ? all.slice() : firstProducts.slice(0, PAGE_SIZE));
        setCurrentPage(0);
        const total = publicProducts.getTotalCount();
        setTotalProductCount(total);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading initial products from public snapshot:', error);
      } finally {
    setLoading(false);
      }
    };
    loadInitial();
  }, [showAllMode]);

  // debug: log when products array changes
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('[Admin Products] products state length:', products.length, 'filtered:', filteredProducts.length, 'all:', allProducts.length, 'showAllMode:', showAllMode);
  }, [products.length, filteredProducts.length, allProducts.length, showAllMode]);

  // derive low-stock and missing-image counts from full dataset
  useEffect(() => {
    if (!Array.isArray(allProducts)) {
      setLowStockCount(0);
      setNoImageCount(0);
        return;
      }
    const low = allProducts.reduce((acc, p) => {
      const s = Number(p.stock || p.Stock || 0);
      return acc + (Number.isFinite(s) && s <= LOW_STOCK_THRESHOLD ? 1 : 0);
    }, 0);
    const noimg = allProducts.reduce((acc, p) => {
      const hasImages = (Array.isArray(p.images) && p.images.length > 0) || (Array.isArray(p.image_urls) && p.image_urls.length > 0);
      const hasImageUrl = Boolean(p.imageUrl || p.image_url || p.image);
      return acc + (hasImages || hasImageUrl ? 0 : 1);
    }, 0);
    setLowStockCount(low);
    setNoImageCount(noimg);
    // compute out/low margins for diagnostics (not used directly)
    /* eslint-disable no-unused-vars */
    const _out = allProducts.reduce((acc, p) => acc + ((Number(p.stock || p.Stock || 0) <= 0) ? 1 : 0), 0);
    // outOfStockCount previously tracked but not used; keep computation if needed later
    const _lowm = allProducts.reduce((acc, p) => {
      const price = Number(p.price || p.SP || 0);
      const mrp = Number(p.mrp || p.MRP || price);
      const margin = mrp > 0 ? ((mrp - price) / mrp) * 100 : 0;
      return acc + (margin < 10 ? 1 : 0);
    }, 0);
    /* eslint-enable no-unused-vars */
    // lowMarginCount previously tracked but not used
    // compute top categories and suppliers
    const catMap = new Map();
    const supMap = new Map();
    allProducts.forEach(p => {
      const c = p.category || p['Group Name'] || 'Uncategorized';
      const s = p.supplierName || p['Supplier Name'] || 'Unknown';
      catMap.set(c, (catMap.get(c) || 0) + 1);
      supMap.set(s, (supMap.get(s) || 0) + 1);
    });
    const cats = Array.from(catMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>({name:k,count:v}));
    const sups = Array.from(supMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>({name:k,count:v}));
    setTopCategories(cats);
    setTopSuppliers(sups);
    // compare supabase count
    (async ()=>{
      try{
        // prefer public snapshot count
        await publicProducts.ensureLoaded();
        const cnt = publicProducts.getTotalCount();
        setSupabaseCount(cnt);
        setAllCountsMatch(cnt === allProducts.length);
      }catch(e){
        // ignore
      }
    })();
  }, [allProducts]);

  // Optimized search with chunked loading (debounced via lodash.throttle)
  const handleSearch = useMemo(() => throttle((term) => {
    setSearchTerm(term);
    const t = (term || '').trim().toLowerCase();
    const base = selectedCategory === 'All Products'
      ? allProducts
      : allProducts.filter((p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());
    const filtered = !t
      ? base
      : base.filter((p) => {
          const hay = [p.name, p.itemCode, p.category, p.supplierName]
            .map((x) => (x || '').toString().toLowerCase())
            .join(' ');
          return hay.includes(t);
        });
    setFilteredProducts(filtered);
    setCurrentPage(0);
    if (showAllMode) setProducts(filtered.slice()); else setProducts(filtered.slice(0, PAGE_SIZE));
  }, 250), [allProducts, selectedCategory, showAllMode]);

  // Filter products by category (optimized)
  useEffect(() => {
    if (searchTerm.trim()) return; // search effect will handle
    const base = selectedCategory === 'All Products'
      ? allProducts
      : allProducts.filter((p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());
    setFilteredProducts(base);
    setCurrentPage(0);
    if (showAllMode) setProducts(base.slice()); else setProducts(base.slice(0, PAGE_SIZE));
  }, [selectedCategory, allProducts, searchTerm, showAllMode]);

  // Keep selection while on panel; clear when unmounting (leaving panel)
  useEffect(() => {
    return () => setSelectedProducts([]);
  }, []);

  // Simple pagination: derive current page slice from filteredProducts
  useEffect(() => {
    if (showAllMode) {
      setProducts(filteredProducts.slice());
      return;
    }
    const start = currentPage * PAGE_SIZE;
    setProducts(filteredProducts.slice(start, start + PAGE_SIZE));
  }, [filteredProducts, currentPage, showAllMode]);

  // Prevent linter warnings for edit-related state vars that are intentionally kept
  useEffect(() => {
    // mark as used to silence linter for intentionally-kept state
    /* eslint-disable no-unused-expressions */
    void editingProduct;
    void editForm;
    void editImageFile;
    void setEditImageFile;
    /* eslint-enable no-unused-expressions */
  }, [editingProduct, editForm, editImageFile, setEditImageFile]);

  // Load all visible products at once (helper removed - not used)

  // CSV update: open file picker and import CSV to Supabase
  const handleUpdateProductsClick = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onCsvFileSelected = async (e) => {
    const file = e && e.target && e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      // parse & import to Supabase
      const res = await importProductsCsvText(text, { batchSize: 500 });
      toast.success(`CSV import complete — inserted: ${res.inserted || 0}, updated: ${res.updated || 0}`);
      // Refresh local product list from public snapshot
      try {
        await publicProducts.refresh();
      } catch (_) {}
      const all = publicProducts.getAllCached() || [];
      setAllProducts(all);
      setFilteredProducts(all);
      setTotalProductCount(all.length);
      setProducts(showAllMode ? all.slice() : all.slice(0, PAGE_SIZE));
      // debug
      // eslint-disable-next-line no-console
      console.debug('[Admin Products] after CSV import, loaded', all.length, 'products');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('CSV import failed', err);
      toast.error('CSV import failed: ' + (err && err.message ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };

  

  // Table headers configuration removed (unused)

  // Advanced filtering logic
  useEffect(() => {
    if (searchTerm.trim()) return; // when searching, chunked search handles results
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
    setFilteredProducts(filtered);
  }, [products, selectedCategory, filterSupplier, filterPriceMin, filterPriceMax, filterStock, filterMarginMin, filterMarginMax, searchTerm]);

  // Debounce search input to reduce recalculations
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm, handleSearch]);

  // Removed infinite scroll handler to show all products at once

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
  const handleInlineEdit = useCallback(async (productId, field, value) => {
    try {
      if (field === 'stock') {
        setProductStock(productId, value);
        // Update local state
        setProducts(prev => prev.map(p => p.id === productId ? {...p, stock: parseInt(value)} : p));
      } else {
        const updates = {
          [field]: field === 'price' || field === 'deliveryFee' ? parseFloat(value) : value
        };
        updateProduct(productId, updates);
        // Update local state
        setProducts(prev => prev.map(p => p.id === productId ? {...p, ...updates} : p));
      }
      toast.success(`${field} updated!`);
    } catch (error) {
      toast.error('Failed to update');
    }
  }, []);

  // Bulk actions
  const handleBulkAction = (action) => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products first');
      return;
    }
    switch (action) {
      case 'delete':
        (async () => {
          for (const productId of selectedProducts) {
            // eslint-disable-next-line no-await-in-loop
            await handleDeleteProduct(productId);
          }
        setSelectedProducts([]);
        })();
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
      const newProductData = {
        name: productForm.name,
        price: parseFloat(productForm.price),
        description: productForm.description,
        category: productForm.category,
        deliveryFee: parseFloat(productForm.deliveryFee),
        offer: productForm.offer,
        stock: parseInt(productForm.stock),
        imageUrl: imageFile ? URL.createObjectURL(imageFile) : 'https://via.placeholder.com/40'
      };
      const newProduct = addProduct(newProductData);
      // Update local state
      setProducts(prev => [...prev, newProduct]);
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
  // handleEditProduct removed (unused) - inline edit handled elsewhere

  // Delete product
  const handleDeleteProduct = useCallback(async (productId) => {
    try {
      await deleteProductRow(productId);
      setAllProducts(prev => prev.filter(p => p.id !== productId));
      setFilteredProducts(prev => prev.filter(p => p.id !== productId));
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Product deleted!');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Delete error:', error);
      toast.error('Failed to delete product');
    }
  }, []);

  // Selection logic
  const handleProductSelection = useCallback((productId) => {
    setSelectedProducts(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  }, []);
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
  const openEditModal = useCallback((product) => {
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
  }, []);

  // Removed virtualized div row renderer in favor of table rows below

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

  // Product row component (memoized) to avoid re-rendering the whole table
  const ProductRow = React.memo(function ProductRow({ product, sn, isSelected, onSelect }) {
    return (
      <tr key={product.id} className="table-row">
        <td className="px-3 py-2 text-sm text-gray-700">{sn}</td>
        <td className="px-3 py-2">
          <input type="checkbox" checked={isSelected} onChange={() => onSelect(product.id)} className="rounded border-gray-300" />
        </td>
        <td className="px-3 py-2">
          {Array.isArray(product.images) && product.images.length > 0 ? (
            <img src={product.images[0]} alt={product.name} className="w-10 h-10 object-cover rounded border" loading="lazy" />
          ) : product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover rounded border" loading="lazy" />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded border flex items-center justify-center text-xs">No Img</div>
          )}
        </td>
        <td className="px-3 py-2 text-sm">
          <InlineEditableField product={product} field="name" />
        </td>
        <td className="px-3 py-2 text-sm">
          <InlineEditableField product={product} field="price" type="number" />
        </td>
        <td className="px-3 py-2 text-sm">
          <InlineEditableField product={product} field="offer" />
        </td>
        <td className="px-3 py-2 text-sm">
          <InlineEditableField product={product} field="deliveryFee" type="number" />
        </td>
        <td className="px-3 py-2 text-sm">
          <InlineEditableField product={product} field="category" />
        </td>
        <td className="px-3 py-2 text-right">
          <div className="action-buttons flex gap-1 justify-end">
            <button className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200" onClick={() => openEditModal(product)}>Edit</button>
            <button className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200" onClick={() => handleOpenAddImageModal(product)}>Images</button>
            <button className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200" onClick={() => handleDeleteProduct(product.id)}>Delete</button>
          </div>
        </td>
      </tr>
    );
  });

  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [addImageProduct, setAddImageProduct] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handleOpenAddImageModal = useCallback((product) => {
    setAddImageProduct(product);
    setShowAddImageModal(true);
    setSelectedImageFile(null);
    setImagePreviewUrl('');
  }, []);
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Camera start failed', err);
      toast.error('Camera access denied or not available');
    }
  };

  const stopCamera = () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    } catch (_) {}
    setCameraActive(false);
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedImageFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };
  const handleUploadImage = async () => {
    if (!selectedImageFile || !addImageProduct) return;
    setUploadingImage(true);
    try {
      const uploaded = await uploadImage(selectedImageFile, { folder: 'products' });
      // If a server endpoint is configured via REACT_APP_IMAGE_ENDPOINT, supabaseAdmin will call it.
      await addProductImage(addImageProduct.id, uploaded.url);
      // Update local state (append to images array)
      setProducts(prev => prev.map(p => p.id === addImageProduct.id ? {
        ...p,
        imageUrl: uploaded.url,
        images: Array.isArray(p.images) ? [...p.images, uploaded.url] : [uploaded.url]
      } : p));
      toast.success('Image uploaded!');
      handleCloseAddImageModal();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async (product, url) => {
    try {
      await removeProductImage(product.id, url);
      setProducts(prev => prev.map(p => p.id === product.id ? {
        ...p,
        images: (p.images || []).filter(u => u !== url),
        imageUrl: p.imageUrl === url ? null : p.imageUrl,
      } : p));
      toast.success('Image removed');
    } catch (e) {
      toast.error('Failed to remove image');
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
  const suppliers = Array.from(new Set(allProducts.map(p => p.supplier || p['Supplier Name'] || p.supplierName || p['Supplier Name']).filter(Boolean)));

  // Build category list from products
  const allProductCategories = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)));
  const categories = ['All Products', ...allProductCategories];
  // Note: Removed groupedProducts logic for performance - using flat virtualized list instead

  const csvTemplate = `Item Code,Description,Base Unit,Group ID,Group Name,Sub Group,Supplier Name,Last CP,Taxable CP,SP,Stock,Last Purc Miti,Last Purc Qty,Sales Qty,#,Margin %,MRP\n1001,Sample Product,PCS,1,Category A,Sub,Acme,90,95,110,25,2082/03/13,12,20,001,10,120`;

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

  // parseCSV removed (unused) - using importProductsCsvText instead

  const handleCSVUpload = (e) => {
    setCsvErrors([]);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        setCsvProducts([{ _raw: String(evt.target.result || '') }]);
      } catch (err) {
        setCsvErrors(['Failed to read CSV.']);
        setCsvProducts([]);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkUpload = async () => {
    setUploading(true);
    try {
      const text = (csvProducts[0] && csvProducts[0]._raw) || '';
      if (!text) throw new Error('No CSV loaded');
      const res = await importProductsCsvText(text, { batchSize: 500 });
      toast.success(`Import complete. Inserted ${res.inserted}, updated ${res.updated}.`);
      setShowBulkModal(false);
      setCsvProducts([]);
      setCsvErrors([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Optionally refresh the first page
      setAllProducts([]);
      setFilteredProducts([]);
      setProducts([]);
    } catch (err) {
      toast.error(`Bulk upload failed: ${err.message || err}`);
    } finally {
    setUploading(false);
    }
  };

  // Analytics calculations (use full dataset)
  const outOfStock = allProducts.filter(p => Number(p.stock || p['Stock'] || 0) === 0).length;
  const lowMargin = allProducts.filter(p => {
    const price = Number(p.price || p.SP || 0);
    const mrp = Number(p.mrp || p.MRP || price) || price;
    const margin = mrp > 0 ? ((mrp - price) / mrp) * 100 : 0;
    return margin < 10;
  }).length;

  return (
    <div className="admin-products-panel">
      {/* Admin PowerSearch - Optimized */}
      <div style={{ padding: '12px 0' }}>
        <PowerSearch
          products={[]} // Don't pass all products to avoid lag
          onSearch={(term, results) => {
            handleSearch(term); // Use our optimized search instead
          }}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </div>
      {/* Analytics Dashboard */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <Card style={{ flex: 1, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Total Products</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{totalProductCount}</div>
          {supabaseCount !== null && (
            <div style={{ fontSize: 12, color: supabaseCount === allProducts.length ? '#15803d' : '#c2410c' }}>
              Supabase: {supabaseCount} • Match: {allCountsMatch ? 'Yes' : 'No'}
            </div>
          )}
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
          <div style={{ fontSize: 15 }}>{topCategories.map(c => <div key={c.name}>{c.name}: {c.count}</div>)}</div>
        </Card>
        <Card style={{ flex: 1, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Top Suppliers</div>
          <div style={{ fontSize: 15 }}>{topSuppliers.map(s => <div key={s.name}>{s.name}: {s.count}</div>)}</div>
        </Card>
      </div>
      {/* Header */}
      <div className="admin-products-header-row" style={{ position: isSticky ? 'sticky' : 'static', top: 0, zIndex: 10, background: '#f8fafc' }}>
        <h1 className="text-2xl font-bold text-gray-900" style={{ margin: 0, fontSize: '1.2rem' }}>Products Management</h1>
        <Button onClick={() => setShowBulkModal(true)} variant="primary">Bulk Update</Button>
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
      <div className="sticky-bulk-actions-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, background: '#f8fafc', boxShadow: '0 -2px 8px #e0e7ef33', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="text-sm text-gray-600">{selectedProducts.length} products selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={() => handleBulkAction('delete')}>Delete Selected</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('changeOffer')}>Change Offer</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('changeDeliveryFee')}>Change Delivery Fee</Button>
          </div>
        </div>
      )}

      {/* Products List - Virtualized */}
      <Card>
        <Card.Content className="p-0">
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div className="flex items-center gap-4">
            <div style={{ flex: '0 0 40px', padding: '8px', fontSize: 12, color: '#444' }}>S/N</div>
                          <input
                            type="checkbox"
              checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
              onChange={handleSelectAll}
                            className="rounded border-gray-300"
                          />
            <div style={{display:'flex', flexDirection:'column'}}>
              <span className="text-sm font-medium text-gray-700">
                {filteredProducts.length} products • Page {currentPage + 1} of {Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))}
              </span>
              <div style={{fontSize:12, color:'#555'}}>
                <span style={{marginRight:12}}>Total: <strong>{allProducts.length}</strong></span>
                <span style={{marginRight:12}}>Low stock (&le;{LOW_STOCK_THRESHOLD}): <strong>{lowStockCount}</strong></span>
                <span>Missing image: <strong>{noImageCount}</strong></span>
                        </div>
            </div>
                        </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => (p + 1 < Math.ceil(filteredProducts.length / PAGE_SIZE) ? p + 1 : p))}
              disabled={(currentPage + 1) >= Math.ceil(filteredProducts.length / PAGE_SIZE)}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Next
            </button>
            <label style={{display:'flex', alignItems:'center', gap:8}}>
              <input type="checkbox" checked={showAllMode} onChange={(e)=>setShowAllMode(e.target.checked)} />
              <span style={{fontSize:12}}>Show all</span>
            </label>
          </div>
          <div style={{flex:1, display:'flex', justifyContent:'center'}}>
            <div>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{display:'none'}} onChange={onCsvFileSelected} />
              <button id="update-products-btn" onClick={handleUpdateProductsClick} className="px-5 py-3 bg-yellow-500 text-white rounded shadow font-bold" disabled={uploading}>
                {uploading ? 'Updating...' : 'Update Products (CSV)'}
              </button>
            </div>
          </div>
          </div>
          <div style={{ maxHeight: 600, overflowY: 'auto' }} ref={tableScrollRef} onScroll={() => {
              const el = tableScrollRef.current;
              if (!el) return;
              const scrollTop = el.scrollTop;
              const visibleRows = Math.ceil(el.clientHeight / ROW_HEIGHT);
              const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VIRTUAL_BUFFER);
              const end = Math.min(products.length, start + visibleRows + VIRTUAL_BUFFER * 2);
              if (start !== virtualStart || end !== virtualEnd) {
                setVirtualStart(start);
                setVirtualEnd(end);
              }

              // load more items when user scrolls near the end of currently loaded products
              const nearEndThreshold = Math.max(0, products.length - Math.ceil(CHUNK_SIZE / 4));
              if (end >= nearEndThreshold && products.length < (totalProductCount || Infinity) && !fetchingRef.current) {
                (async () => {
                  try {
                    fetchingRef.current = true;
                    const startIndex = products.length;
                    const toFetch = Math.min(CHUNK_SIZE, (totalProductCount || CHUNK_SIZE) - startIndex);
                    if (toFetch <= 0) return;
                    await publicProducts.ensureLoaded();
                    const newItems = publicProducts.getChunk(startIndex, toFetch) || [];
                    if (newItems.length > 0) {
                      setAllProducts(prev => [...prev, ...newItems]);
                      setFilteredProducts(prev => [...prev, ...newItems]);
                      setProducts(prev => showAllMode ? [...prev, ...newItems] : prev);
                    }
                  } catch (e) {
                    // eslint-disable-next-line no-console
                    console.warn('Failed to load more products', e);
                  } finally {
                    fetchingRef.current = false;
                  }
                })();
              }
            }}>
            {/* spacer top for virtualized rows */}
            <div style={{ height: virtualStart * ROW_HEIGHT }} />
            <table className="min-w-full divide-y divide-gray-200" style={{ width: '100%' }}>
              <colgroup>
                <col style={{ width: '40px' }} />
                <col style={{ width: '40px' }} />
                <col style={{ width: '60px' }} />
                <col />
                <col style={{ width: '120px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S/N</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input type="checkbox" checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0} onChange={handleSelectAll} />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offer</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Fee</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.slice(virtualStart, virtualEnd).map((product, idx) => {
                  const startIndex = showAllMode ? 0 : currentPage * PAGE_SIZE;
                  const sn = startIndex + virtualStart + idx + 1;
                  return (
                    <ProductRow key={product.id} product={product} sn={sn} isSelected={selectedProducts.includes(product.id)} onSelect={handleProductSelection} />
                  );
                })}
                {/* spacer bottom */}
                <tr style={{ height: Math.max(0, (products.length - virtualEnd) * ROW_HEIGHT) }} />
              </tbody>
            </table>
          </div>
          
          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found</p>
            </div>
          )}
          
          {loading && (
            <div className="text-center py-4">
              <p className="text-blue-600">Loading products...</p>
          </div>
          )}
        </Card.Content>
      </Card>



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

      {/* Bulk Update Modal (Edit Product Modal placeholder retained to avoid confusion) */}
       <BulkProductUpdate
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {/* Optionally reload products here */}}
      />

      {/* Offer Modal using Bulk Update for batch price changes */}
      <BulkProductUpdate
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        onSuccess={() => {/* Optionally reload products here */}}
      />

      {/* Bulk Update Modal */}
      {showBulkModal && (
         <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title="Update Products via CSV">
           <div className="space-y-3">
             <div className="text-sm text-gray-600">Upload a CSV with headers matching your table (e.g., "Item Code", "Description", ...). We'll upsert by Item Code and insert new rows.</div>
             <div className="flex gap-2 items-center">
               <input type="file" accept=".csv,text/csv" ref={fileInputRef} onChange={handleCSVUpload} />
               <Button size="sm" variant="outline" onClick={() => downloadCSVTemplate()}>Template</Button>
             </div>
             {csvErrors.length > 0 && (
               <div className="text-sm text-red-600">
                 {csvErrors.map((e, idx) => <div key={idx}>{e}</div>)}
               </div>
             )}
             <div className="flex justify-end gap-2">
               <Button size="sm" variant="secondary" onClick={() => setShowBulkModal(false)}>Cancel</Button>
               <Button size="sm" variant="primary" onClick={handleBulkUpload} loading={uploading} disabled={csvProducts.length === 0}>Import</Button>
             </div>
           </div>
         </Modal>
      )}
      {showChangeOfferModal && (
        <Modal isOpen={showChangeOfferModal} onClose={() => setShowChangeOfferModal(false)} title="Change Offer for Selected Products">
          <ChangeOfferForm selectedProducts={selectedProducts} onClose={() => setShowChangeOfferModal(false)} setProducts={setProducts} />
        </Modal>
      )}

      {showAddImageModal && (
        <Modal isOpen={showAddImageModal} onClose={handleCloseAddImageModal} title="Manage Product Images">
          <div className="space-y-4">
            {addImageProduct && Array.isArray(addImageProduct.images) && addImageProduct.images.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="font-medium text-sm">Existing Images</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {addImageProduct.images.map((u) => (
                    <div key={u} style={{ position: 'relative' }}>
                      <img src={u} alt="" className="w-20 h-20 object-cover rounded border" />
                      <button type="button" className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1" onClick={() => handleRemoveImage(addImageProduct, u)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="font-medium">Choose Image</label>
              <Input type="file" accept="image/*" onChange={handleImageFileChange} />
                <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
                  {!cameraActive ? (
                    <Button size="sm" variant="outline" onClick={startCamera}>Open Camera</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={captureFromCamera}>Capture</Button>
                      <Button size="sm" variant="secondary" onClick={stopCamera}>Stop</Button>
                    </>
                  )}
                </div>
                <div style={{marginTop:8}}>
                  <video ref={videoRef} style={{width:220, height:160, background:'#000'}} autoPlay muted />
                  <canvas ref={canvasRef} style={{display:'none'}} />
                </div>
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
    </div>
  );
};

export default Products;

const ChangeOfferForm = ({ selectedProducts, onClose, setProducts }) => {
  const [offer, setOffer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const handleApplyOffer = async () => {
    setLoading(true);
    try {
      selectedProducts.forEach(productId => {
        updateProduct(productId, { offer, offerStartDate: startDate, offerEndDate: endDate });
      });
      // Update local state
      setProducts(prev => prev.map(p => 
        selectedProducts.includes(p.id) 
          ? {...p, offer, offerStartDate: startDate, offerEndDate: endDate}
          : p
      ));
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