import React, { useState, useRef } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Modal from '../../components/ui/Modal';

// Updated CSV template for all columns (with display names in header)
const csvTemplate = `itemCode,name (title),baseUnit,group,category (groupName),supplier,price (SP),lastPurcMiti,lastPurcQty,salesQty\n1001,Sample Product,PCS,Group,Category,Supplier,100,2082/03/13,12,20`;

// For display: map field to display name
const FIELD_DISPLAY_NAMES = {
  itemCode: 'itemCode',
  name: 'name (title)',
  baseUnit: 'baseUnit',
  group: 'group',
  category: 'category (groupName)',
  supplier: 'supplier',
  price: 'price (SP)',
  lastPurcMiti: 'lastPurcMiti',
  lastPurcQty: 'lastPurcQty',
  salesQty: 'salesQty',
};

// All columns for preview/template (in the requested order)
const ALL_FIELDS = ['itemCode', 'name', 'baseUnit', 'group', 'category', 'supplier', 'price', 'lastPurcMiti', 'lastPurcQty', 'salesQty'];
// Only these fields will be used for upload
const PRODUCT_FIELDS = ['itemCode', 'name', 'category', 'supplier', 'price', 'lastPurcMiti'];

function filterProductFields(row) {
  const filtered = {};
  PRODUCT_FIELDS.forEach(f => filtered[f] = row[f] || '');
  return filtered;
}

function validateProduct(row, allCodes) {
  const errors = [];
  if (!row.itemCode) errors.push('Missing itemCode');
  if (allCodes.filter(code => code === row.itemCode).length > 1) errors.push('Duplicate itemCode');
  if (!row.name) errors.push('Missing name');
  if (!row.category) errors.push('Missing category');
  if (!row.price || isNaN(Number(row.price)) || Number(row.price) < 0) errors.push('Invalid price');
  return errors;
}

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
        const rawRows = parseCSV(evt.target.result);
        // Filter and validate
        const products = rawRows.map(row => ({ ...row, ...filterProductFields(row), _row: row._row }));
        const allCodes = products.map(row => row.itemCode);
        const errors = products.map(row => validateProduct(row, allCodes));
        setCsvProducts(products.map((row, i) => ({ ...row, _errors: errors[i] })));
        setCsvErrors([]);
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
        if (p._errors && p._errors.length > 0) continue; // skip invalid rows
        await addDoc(collection(db, 'products'), {
          itemCode: p.itemCode,
          name: p.name,
          category: p.category,
          supplier: p.supplier,
          price: Number(p.price),
          lastPurcMiti: p.lastPurcMiti,
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
        <div style={{ maxHeight: 250, overflowY: 'auto', margin: '12px 0' }}>
          <table className="admin-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>Row</th>
                {ALL_FIELDS.map(f => <th key={f}>{FIELD_DISPLAY_NAMES[f] || (f.charAt(0).toUpperCase() + f.slice(1))}</th>)}
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {csvProducts.map((p, i) => (
                <tr key={i} style={{ background: (p._errors && p._errors.length > 0) ? '#fff3f3' : undefined }}>
                  <td>{p._row}</td>
                  {ALL_FIELDS.map(f => <td key={f}>{p[f]}</td>)}
                  <td style={{ color: '#e53e3e', fontSize: 12 }}>{p._errors && p._errors.length > 0 ? p._errors.join(', ') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="admin-btn secondary" onClick={onClose}>Cancel</button>
        <button className="admin-btn" disabled={csvProducts.filter(p => !p._errors || p._errors.length === 0).length === 0 || uploading} onClick={handleBulkUpload}>
          {uploading ? 'Uploading...' : 'Confirm Upload'}
        </button>
      </div>
    </Modal>
  );
};

export default BulkProductUpload; 