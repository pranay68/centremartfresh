import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import publicProducts from '../../utils/publicProducts';
import { updateProductStock, addProductImage, removeProductImage, deleteProductRow, updateProductRow } from '../../utils/supabaseAdmin';
import { importProductsCsvText } from '../../utils/supabaseCsvImport';
import { uploadImage, getCloudinaryConfig } from '../../utils/cloudinary';
import { getStockStatus } from '../../utils/sortProducts';
import './StockManagement.css';
import PowerSearch from '../../components/PowerSearch';

const StockManagement = () => {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('all'); // all, out_of_stock, low_stock
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalProduct, setImageModalProduct] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkOffer, setBulkOffer] = useState('');
  const { user } = useAuth();
  const isAdmin = (user && user.uid && (localStorage.getItem('isAdmin') === 'true')) || false;
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 200;

  const [duplicates, setDuplicates] = useState([]);
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [stockSearchResults, setStockSearchResults] = useState([]);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showChangeOfferModal, setShowChangeOfferModal] = useState(false);
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerEndDate, setOfferEndDate] = useState('');

  useEffect(() => {
    const loadLocal = async () => {
      setLoading(true);
      try {
        await publicProducts.ensureLoaded();
        const all = publicProducts.getAllCached();
        setDuplicates([]);
        setProducts(all || []);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error loading public products:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLocal();
  }, []);

  const handleUpdateProductsClick = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleStockPanelSearch = (term, results) => {
    const q = (term || '').trim();
    setStockSearchTerm(q);
    let resolved = Array.isArray(results) ? results : null;
    // If PowerSearch called onSearch without results (Search button), do a simple local match
    if (!Array.isArray(resolved)) {
      if (!q) resolved = [];
      else {
        const ql = q.toLowerCase();
        resolved = products.filter(p => {
          if (!p) return false;
          const fields = [p.name, p.productName, p.itemCode, p['Item Code'], p.category, p.sku, p.description, p.brand, p.supplier_name, p.supplierName];
          return fields.some(f => (String(f || '').toLowerCase()).includes(ql));
        });
      }
    }
    setStockSearchResults(resolved || []);
    setPage(0);
  };

  const onCsvFileSelected = async (e) => {
    const file = e && e.target && e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const res = await importProductsCsvText(text, { batchSize: 500 });
      alert(`CSV import complete — inserted: ${res.inserted || 0}, updated: ${res.updated || 0}`);
      // Attempt to trigger server-side snapshot publish if configured
      const pullEndpoint = process.env.REACT_APP_PULL_SNAPSHOT_ENDPOINT || (process.env.REACT_APP_API_ENDPOINT ? `${process.env.REACT_APP_API_ENDPOINT.replace(/\/$/, '')}/pull-and-publish-snapshot` : null);
      const pullSecret = process.env.REACT_APP_PULL_SNAPSHOT_SECRET || process.env.PULL_SNAPSHOT_SECRET || null;
      if (pullEndpoint) {
        try {
          const headers = { 'Content-Type': 'application/json' };
          if (pullSecret) headers['x-internal-secret'] = pullSecret;
          // include firebase token if available
          try {
            // eslint-disable-next-line global-require
            const { auth } = require('../../firebase/config');
            if (auth && auth.currentUser && typeof auth.currentUser.getIdToken === 'function') {
              // eslint-disable-next-line no-await-in-loop
              const token = await auth.currentUser.getIdToken();
              if (token) headers.Authorization = `Bearer ${token}`;
            }
          } catch (_) {}
          const pRes = await fetch(pullEndpoint, { method: 'POST', headers, body: JSON.stringify({ trigger: 'csv-import' }) });
          if (pRes.ok) {
            try { const j = await pRes.json(); if (j && j.url) alert('Snapshot published to: ' + j.url); } catch (_) {}
          } else {
            // non-fatal
            try { const txt = await pRes.text(); console.warn('Pull snapshot endpoint returned', pRes.status, txt); } catch (_) {}
          }
        } catch (err) {
          console.warn('Failed to call pull-and-publish-snapshot endpoint', err);
        }
      }
      // try to refresh the public snapshot so reads reflect updates
      try {
        await publicProducts.refresh();
        const all = publicProducts.getAllCached();
        setProducts(all || []);
        setDuplicates([]);
      } catch (err) {
        console.error('Failed to refresh public snapshot after CSV import', err);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('CSV import failed', err);
      alert('CSV import failed: ' + (err && err.message ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };

  const handleStockUpdate = async (productId, newStock) => {
    setLoading(true);
    try {
      // Try serverless endpoint if configured (more secure)
      const endpoint = process.env.REACT_APP_UPDATE_STOCK_ENDPOINT || '/api/update-stock';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, stock: Number(newStock) })
      });
      if (!res.ok) {
        // fallback to direct Supabase client update
        await updateProductStock(productId, newStock);
      }
      // update local UI immediately
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: Number(newStock) } : p));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (product) => {
    setEditingId(product.id);
    setEditValue((product.stock ?? 0).toString());
  };

  const openAddImageModal = (product) => {
    setImageModalProduct(product);
    // preload existing images from product object
    const existing = (product && (product.image_urls || product.images || [])) || [];
    setImagePreviewUrl('');
    setSelectedImageFile(null);
    setImageList(Array.isArray(existing) ? existing.slice() : []);
    setShowImageModal(true);
    setCameraActive(false);
  };

  const closeAddImageModal = () => {
    setShowImageModal(false);
    setImageModalProduct(null);
    setSelectedImageFile(null);
    setImagePreviewUrl('');
    setImageList([]);
    stopCamera();
  };

  const handleImageFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setSelectedImageFile(f);
    setImagePreviewUrl(URL.createObjectURL(f));
  };

  const [imageList, setImageList] = useState([]);

  const handleDeleteImage = async (url) => {
    if (!imageModalProduct) return;
    // replace sync confirm with custom modal-less prompt using window.confirm fallback
    const ok = window.confirm ? window.confirm('Delete this image? This will remove it from the product.') : true;
    if (!ok) return;
    try {
      setUploadingImage(true);
      const res = await removeProductImage(imageModalProduct.id, url);
      if (res && (res.removed || res.ok || res.location)) {
        // update local products state
        setProducts(prev => prev.map(p => p.id === imageModalProduct.id ? ({ ...p, images: (p.images || []).filter(u => u !== url), image: p.image === url ? null : p.image, image_url: p.image_url === url ? null : p.image_url, image_urls: Array.isArray(p.image_urls) ? p.image_urls.filter(u => u !== url) : (Array.isArray(p.images) ? p.images.filter(u => u !== url) : []) }) : p));
        setImageList(prev => prev.filter(u => u !== url));
        alert('Image removed');
      } else {
        alert('Failed to remove image');
      }
    } catch (err) {
      console.error('Delete image failed', err);
      alert('Failed to delete image: ' + (err && err.message ? err.message : String(err)));
    } finally {
      setUploadingImage(false);
    }
  };

  // Selection handlers (bring Products-like multi-select functionality here)
  // selection handlers are used via checkboxes in UI
  const handleProductSelection = (productId) => setSelectedProducts(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return alert('No products selected');
    if (!isAdmin) return alert('Only admins can delete products');
    /* eslint-disable no-alert, no-restricted-globals */
    if (!confirm(`Delete ${selectedProducts.length} products? This cannot be undone.`)) return;
    /* eslint-enable no-alert, no-restricted-globals */
    try {
      for (const id of selectedProducts) {
        // eslint-disable-next-line no-await-in-loop
        await deleteProductRow(id);
      }
      // update local UI
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
      setSelectedProducts([]);
      alert('Deleted selected products');
    } catch (err) {
      console.error('Bulk delete failed', err);
      alert('Bulk delete failed: ' + (err && err.message ? err.message : String(err)));
    }
  };

  // bulk category update handled via actions dropdown; keeping function for potential reuse
  const handleApplyBulkCategory = async () => {
    if (!isAdmin) return alert('Only admins can change categories');
    if (!bulkCategory) return alert('Select a category');
    try {
      for (const id of selectedProducts) {
        /* eslint-disable no-await-in-loop */
        await updateProductRow(id, { category: bulkCategory });
        /* eslint-enable no-await-in-loop */
      }
      setProducts(prev => prev.map(p => selectedProducts.includes(p.id) ? ({ ...p, category: bulkCategory }) : p));
      setSelectedProducts([]);
      alert('Category updated for selected products');
    } catch (err) {
      console.error('Bulk category update failed', err);
      alert('Bulk category update failed');
    }
  };

  // mark duplicates as used to avoid linter warning (we might display this count elsewhere later)
  void duplicates;

  const handleApplyBulkOffer = async () => {
    if (!isAdmin) return alert('Only admins can change offers');
    if (!bulkOffer) return alert('Enter an offer value');
    try {
      for (const id of selectedProducts) {
        // eslint-disable-next-line no-await-in-loop
        await updateProductRow(id, { offer: bulkOffer });
      }
      setProducts(prev => prev.map(p => selectedProducts.includes(p.id) ? ({...p, offer: bulkOffer}) : p));
      setSelectedProducts([]);
      setBulkOffer('');
      alert('Offer updated for selected products');
    } catch (err) {
      console.error('Bulk offer update failed', err);
      alert('Bulk offer update failed');
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
      alert('Failed to access camera: ' + (err && err.message ? err.message : err));
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
        // stop camera after capture
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const handleUploadImage = async () => {
    if (!imageModalProduct || (!selectedImageFile && !imagePreviewUrl)) return;
    setUploadingImage(true);
    try {
      // Ensure Cloudinary config is present
      try {
        const cfg = getCloudinaryConfig();
        if (!cfg.cloudName || !cfg.preset) {
          throw new Error('Cloudinary not configured (check REACT_APP_CLOUDINARY_CLOUD_NAME and REACT_APP_CLOUDINARY_PRESET)');
        }
      } catch (cfgErr) {
        throw cfgErr;
      }
      const uploaded = await uploadImage(selectedImageFile || null, { folder: 'products' });
      if (!uploaded || !uploaded.url) throw new Error('Upload failed');
      // persist to Supabase via addProductImage
      const res = await addProductImage(imageModalProduct.id, uploaded.url);
      // debug: ensure DB write succeeded
      // res might be like { location: 'products.image_url', url }
      if (!res || !res.url) {
        // eslint-disable-next-line no-console
        console.error('addProductImage did not return a success object', res);
        throw new Error('Failed to persist image URL to Supabase');
      }
      // update local state only after DB write
      setProducts(prev => prev.map(p => p.id === imageModalProduct.id ? ({ ...p, image: res.url, images: Array.isArray(p.images) ? [...p.images, res.url] : [res.url] }) : p));
      alert(`Image uploaded and persisted to Supabase (${res.location || 'unknown'})`);
      closeAddImageModal();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Image upload error', err);
      alert('Image upload failed: ' + (err && err.message ? err.message : String(err)));
    } finally {
      setUploadingImage(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const status = getStockStatus(product.stock);
    if (filter === 'all') return true;
    return status === filter;
  });

  // If a stock-search is active, derive filtered results from that set (and still apply stock filter)
  const searchFilteredProducts = stockSearchTerm ? (stockSearchResults || []).filter(product => {
    const status = getStockStatus(product.stock);
    if (filter === 'all') return true;
    return status === filter;
  }) : null;

  // current page slice for UI
  const sourceForPaging = searchFilteredProducts !== null ? searchFilteredProducts : filteredProducts;
  const totalPages = Math.max(1, Math.ceil(sourceForPaging.length / PAGE_SIZE));
  const currentPageProducts = sourceForPaging.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return <div className="stock-management loading">Loading products...</div>;
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
        <div style={{ width: 380, marginLeft: 12 }}>
          <PowerSearch
            products={products}
            onSearch={handleStockPanelSearch}
            searchTerm={stockSearchTerm}
            setSearchTerm={setStockSearchTerm}
            navigateOnSearch={false}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onCsvFileSelected} />
          <button onClick={handleUpdateProductsClick} className="update-products-btn" disabled={uploading} style={{ background: '#f59e0b', color: '#fff', padding: '8px 12px', borderRadius: 6, fontWeight: 700 }}>
            {uploading ? 'Updating...' : 'Update Products (CSV)'}
          </button>
        </div>
      </div>

      {/* Category select (select across all loaded products) and Actions dropdown */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0', flexWrap: 'wrap' }}>
        <input type="checkbox" checked={selectedProducts.length === products.length && products.length>0} onChange={() => { if (selectedProducts.length===products.length) setSelectedProducts([]); else setSelectedProducts(products.map(p=>p.id)); }} />
        <span>{selectedProducts.length} selected</span>

        <select value={bulkCategory} onChange={e=>setBulkCategory(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">Select category to select all</option>
          {[...new Set(products.map(p=>p.category).filter(Boolean))].map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => { if (!bulkCategory) return alert('Select category'); setSelectedProducts(products.filter(p=>p.category===bulkCategory).map(p=>p.id)); }} disabled={!bulkCategory}>Select Category</button>
        <button onClick={() => { if (!bulkCategory) return alert('Select category'); const idsToDeselect = products.filter(p=>p.category===bulkCategory).map(p=>p.id); setSelectedProducts(prev => prev.filter(id => !idsToDeselect.includes(id))); }} disabled={!bulkCategory}>Deselect Category</button>
        <button onClick={() => setSelectedProducts([])}>Clear Selection</button>
        
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setShowActionsDropdown(v => !v)}>Actions ▾</button>
          {showActionsDropdown && (
            <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 40, minWidth: 220 }}>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { setShowActionsDropdown(false); setShowConfirmDelete(true); }}>Delete Selected</button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { setShowActionsDropdown(false); setShowChangeOfferModal(true); }}>Change Offer (bulk)</button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={async () => {
                setShowActionsDropdown(false);
                if (selectedProducts.length === 0) return alert('No products selected');
                const cat = window.prompt('Enter category to apply to selected products');
                if (!cat) return;
                setBulkCategory(cat);
                await handleApplyBulkCategory();
              }}>Change Category (bulk)</button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow" style={{ width: 420 }}>
            <h3 className="text-lg font-semibold">Confirm delete</h3>
            <p style={{ marginTop: 8 }}>Delete {selectedProducts.length} selected products? This action is irreversible.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowConfirmDelete(false)}>Cancel</button>
              <button onClick={async () => { setShowConfirmDelete(false); await handleBulkDelete(); }} style={{ background: '#ef4444', color:'#fff', padding:'6px 10px', borderRadius:6 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Offer Modal */}
      {showChangeOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow" style={{ width: 480 }}>
            <h3 className="text-lg font-semibold">Change Offer for selected products</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <input placeholder="Offer text (e.g. 10% OFF)" value={bulkOffer} onChange={e => setBulkOffer(e.target.value)} />
              <label>Start date</label>
              <input type="date" value={offerStartDate} onChange={e => setOfferStartDate(e.target.value)} />
              <label>End date</label>
              <input type="date" value={offerEndDate} onChange={e => setOfferEndDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowChangeOfferModal(false)}>Cancel</button>
              <button onClick={async () => { setShowChangeOfferModal(false); await handleApplyBulkOffer(); }} style={{ background: '#111827', color:'#fff', padding:'6px 10px', borderRadius:6 }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Image modal */}
      {showImageModal && imageModalProduct && (
        <div className="image-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow" style={{width: 520, maxWidth: '95%'}}>
            <h3>Add image for: {imageModalProduct.name}</h3>
            <div style={{display:'flex', gap:12, marginTop:12}}>
              <div style={{flex:1}}>
                <label className="block mb-2">Choose file</label>
                <input type="file" accept="image/*" onChange={handleImageFileChange} />
                {imagePreviewUrl && <img src={imagePreviewUrl} alt="preview" style={{width:120, height:120, objectFit:'cover', marginTop:8}} />}
                {imageList && imageList.length > 0 && (
                  <div style={{marginTop:8}}>
                    <div className="font-medium">Existing images</div>
                    <div style={{display:'flex', gap:8, marginTop:6, flexWrap:'wrap'}}>
                      {imageList.map(u => (
                        <div key={u} style={{position:'relative'}}>
                          <img src={u} alt="" style={{width:80,height:80,objectFit:'cover',borderRadius:6}} />
                          <button type="button" onClick={() => handleDeleteImage(u)} style={{position:'absolute',right:-6,top:-6,background:'#ef4444',color:'#fff',borderRadius:'50%',width:22,height:22,border:'none'}}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{flex:1}}>
                <label className="block mb-2">Or take photo</label>
                <div>
                  {!cameraActive && <button onClick={startCamera}>Open Camera</button>}
                  {cameraActive && <button onClick={captureFromCamera}>Capture</button>}
                </div>
                <div style={{marginTop:8}}>
                  <video ref={videoRef} style={{width:220, height:160, background:'#000'}} autoPlay muted />
                  <canvas ref={canvasRef} style={{display:'none'}} />
                </div>
              </div>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
              <button onClick={closeAddImageModal}>Cancel</button>
              <button onClick={handleUploadImage} disabled={uploadingImage}>{uploadingImage ? 'Uploading...' : 'Upload'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="stock-table">
        <div className="table-header">
          <div className="col-product">Product</div>
          <div className="col-category">Category</div>
          <div className="col-stock">Stock</div>
          <div className="col-status">Status</div>
          <div className="col-actions">Actions</div>
        </div>
        
        <div className="table-body">
          {currentPageProducts.map(product => (
            <div key={product.id} className={`table-row ${getStockStatus(product.stock)}`}>
              <div className="col-product" style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <input type="checkbox" checked={selectedProducts.includes(product.id)} onChange={() => handleProductSelection(product.id)} />
                {product.image && <img src={product.image} alt={product.name} style={{width:40,height:40,objectFit:'cover'}} />}
                  <span>{product.name}</span>
                </div>
                <div className="col-category">{product.category}</div>
                <div className="col-stock">
                  {editingId === product.id ? (
                  <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') handleStockUpdate(product.id, editValue); }} min="0" autoFocus />
                  ) : (
                    <span>{product.stock || 0}</span>
                  )}
                </div>
                <div className="col-status">
                <span className={`status-badge ${getStockStatus(product.stock)}`}>
                  {getStockStatus(product.stock) === 'out_of_stock' ? 'Out of Stock' : getStockStatus(product.stock) === 'low_stock' ? 'Low Stock' : 'In Stock'}
                  </span>
                </div>
                <div className="col-actions">
                  {editingId === product.id ? (
                    <>
                    <button className="save-btn" onClick={() => handleStockUpdate(product.id, editValue)}>Save</button>
                    <button className="cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
                    </>
                  ) : (
                  <div style={{display:'flex', gap:8}}>
                    <button className="edit-btn" onClick={() => startEditing(product)}>Edit Stock</button>
                    <button className="upload-image-btn" onClick={() => openAddImageModal(product)}>Add Image</button>
                  </div>
                  )}
                </div>
              </div>
          ))}
        </div>
      </div>

      {/* Pagination controls for Stock Management (client-side pages over loaded products) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12 }}>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border rounded">Prev</button>
        <span style={{ alignSelf: 'center' }}>Page {page + 1} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page + 1 >= totalPages} className="px-3 py-1 border rounded">Next</button>
        <button onClick={() => setPage(0)} className="px-3 py-1 border rounded">First</button>
      </div>
    </div>
  );
};

export default StockManagement; 