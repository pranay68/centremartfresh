import React, { useState, useRef } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Modal from '../../components/ui/Modal';

// Updated CSV template for new format
const csvTemplate = `name,unit,category,supplier,price,stock,description\nSample Product,PCS,Category,Supplier,100,50,Description here`;

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

const BulkProductUpload = ({ isOpen, onClose, onSuccess }) => {
  const [csvProducts, setCsvProducts] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

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
          if (!p.name || !p.category) {
            errors.push(`Row ${p._row}: Missing required field (name or category)`);
          } else if (p.price && isNaN(Number(p.price))) {
            errors.push(`Row ${p._row}: Price must be a number`);
          } else if (p.stock && isNaN(Number(p.stock))) {
            errors.push(`Row ${p._row}: Stock must be a number`);
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
        if (!p.name || !p.category) continue;
        await addDoc(collection(db, 'products'), {
          name: p.name,
          unit: p.unit || '',
          category: p.category,
          supplier: p.supplier || '',
          price: p.price ? Number(p.price) : 0,
          stock: p.stock ? Number(p.stock) : 0,
          description: p.description || '',
          imageUrl: '',
          createdAt: new Date(),
        });
      }
      setCsvProducts([]);
      setCsvErrors([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onSuccess) onSuccess();
      onClose();
      alert('Bulk upload complete!');
    } catch (err) {
      alert('Bulk upload failed.');
    }
    setUploading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Upload Products" size="md">
      <div style={{ marginBottom: 16 }}>
        <button className="admin-btn secondary" onClick={downloadCSVTemplate}>Download CSV Template</button>
      </div>
      <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} />
      {csvErrors.length > 0 && (
        <div style={{ color: '#e53e3e', margin: '12px 0' }}>
          {csvErrors.map((err, i) => <div key={i}>{err}</div>)}
        </div>
      )}
      {csvProducts.length > 0 && (
        <div style={{ maxHeight: 200, overflowY: 'auto', margin: '12px 0' }}>
          <table className="admin-table" style={{ fontSize: 13 }}>
            <thead><tr><th>Name</th><th>Unit</th><th>Category</th><th>Supplier</th><th>Price</th><th>Stock</th><th>Description</th></tr></thead>
            <tbody>
              {csvProducts.map((p, i) => (
                <tr key={i} style={{ background: (!p.name || !p.category || (p.price && isNaN(Number(p.price))) || (p.stock && isNaN(Number(p.stock)))) ? '#fff3f3' : undefined }}>
                  <td>{p.name}</td>
                  <td>{p.unit}</td>
                  <td>{p.category}</td>
                  <td>{p.supplier}</td>
                  <td>{p.price}</td>
                  <td>{p.stock}</td>
                  <td>{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="admin-btn secondary" onClick={onClose}>Cancel</button>
        <button className="admin-btn" disabled={csvErrors.length > 0 || csvProducts.length === 0 || uploading} onClick={handleBulkUpload}>
          {uploading ? 'Uploading...' : 'Confirm Upload'}
        </button>
      </div>
    </Modal>
  );
};

export default BulkProductUpload; 