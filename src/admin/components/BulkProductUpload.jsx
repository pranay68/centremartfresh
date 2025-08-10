import React, { useState, useRef, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import { addProduct, getAllProductsIncludingCustom } from '../../utils/productOperations';

// Updated CSV template for download (matches Excel columns)
const csvTemplate = `Item Code,Description,Base Unit,Group ID,Group Name,Sub Group,Supplier Name,Last CP,Taxable CP,SP,Stock,Last Purc Miti,Last Purc Qty,Sales Qty,#,Margin %,MRP,Location1,Location2,Location3,Location4,Location5\n`;

// All columns for preview/template (in the requested order)
const ALL_FIELDS = [
  'Item Code','Description','Base Unit','Group ID','Group Name','Sub Group','Supplier Name','Last CP','Taxable CP','SP','Stock','Last Purc Miti','Last Purc Qty','Sales Qty','#','Margin %','MRP','Location1','Location2','Location3','Location4','Location5'
];

// Only these fields will be used for validation
const REQUIRED_FIELDS = ['Item Code', 'Description', 'Group Name', 'SP', 'Stock'];

function validateProduct(row, allCodes) {
  const errors = [];
  if (!row['Item Code']) errors.push('Missing Item Code');
  if (!row['Description']) errors.push('Missing Description');
  if (!row['Group Name']) errors.push('Missing Group Name');
  if (!row['SP'] || isNaN(Number(row['SP'])) || Number(row['SP']) < 0) errors.push('Invalid SP');
  if (!row['Stock'] || isNaN(Number(row['Stock'])) || Number(row['Stock']) < 0) errors.push('Invalid Stock');
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

const DUPLICATE_ACTIONS = [
  { value: 'skip', label: 'Skip Duplicates' },
  { value: 'update', label: 'Update Existing' },
  { value: 'log', label: 'Log Conflict Only' },
];

const BulkProductUpload = ({ isOpen, onClose, onSuccess }) => {
  const [csvProducts, setCsvProducts] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorLog, setErrorLog] = useState([]);
  const [summary, setSummary] = useState(null);
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const fileInputRef = useRef();
  const [alreadyUploadedMap, setAlreadyUploadedMap] = useState({});

  // Pre-upload scan for duplicates in local database
  useEffect(() => {
    const scanForDuplicates = () => {
      if (!csvProducts.length) return;
      const map = {};
      const existingProducts = getAllProductsIncludingCustom();
      
      for (const p of csvProducts) {
        if (!p['Description'] || !p['Group Name']) continue;
        const duplicate = existingProducts.find(existing => 
          existing.name === p['Description'] && existing.category === p['Group Name']
        );
        if (duplicate) {
          map[p._row] = true;
        }
      }
      setAlreadyUploadedMap(map);
    };
    scanForDuplicates();
  }, [csvProducts]);

  const handleCSVUpload = (e) => {
    setCsvErrors([]);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const rawRows = parseCSV(evt.target.result);
        // Validate
        const allCodes = rawRows.map(row => row['Item Code']);
        const errors = rawRows.map(row => validateProduct(row, allCodes));
        setCsvProducts(rawRows.map((row, i) => ({ ...row, _errors: errors[i] })));
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
    setProgress(0);
    setErrorLog([]);
    setSummary(null);
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    const errors = [];
    const existingProducts = getAllProductsIncludingCustom();
    
    for (let i = 0; i < csvProducts.length; i++) {
      const p = csvProducts[i];
      if (alreadyUploadedMap[p._row]) {
        skipCount++;
        setProgress(Math.round(((i + 1) / csvProducts.length) * 100));
        continue;
      }
      if (p._errors && p._errors.length > 0) {
        skipCount++;
        setProgress(Math.round(((i + 1) / csvProducts.length) * 100));
        continue;
      }
      try {
        const itemCode = p['Item Code'];
        
        // Check for duplicate in local database
        const existingProduct = existingProducts.find(existing => 
          existing.name === p['Description'] && existing.category === p['Group Name']
        );
        
        if (existingProduct) {
          if (duplicateAction === 'skip') {
            skipCount++;
            errors.push({ row: p._row, itemCode, error: 'Duplicate: Skipped' });
            continue;
          } else if (duplicateAction === 'update') {
            // For local database, we can't update JSON products, only custom ones
            skipCount++;
            errors.push({ row: p._row, itemCode, error: 'Cannot update existing products from JSON database' });
            continue;
          } else if (duplicateAction === 'log') {
            skipCount++;
            errors.push({ row: p._row, itemCode, error: 'Duplicate: Logged' });
            continue;
          }
        } else {
          // Add new product to local database
          addProduct({
            name: p['Description'],
            category: p['Group Name'],
            price: Number(p['SP']) || 0,
            stock: Number(p['Stock']) || 0,
            description: p['Description'] || '',
            itemCode: p['Item Code'],
            supplier: p['Supplier Name'],
            unit: p['Base Unit'],
            mrp: Number(p['MRP']) || 0,
            margin: Number(p['Margin %']) || 0,
            deliveryFee: 0,
            offer: '',
            imageUrl: 'https://via.placeholder.com/40'
          });
          successCount++;
        }
      } catch (err) {
        failCount++;
        errors.push({ row: p._row, itemCode: p['Item Code'], error: err.message });
      }
      setProgress(Math.round(((i + 1) / csvProducts.length) * 100));
    }
    
    setSummary({ success: successCount, failed: failCount, skipped: skipCount });
    setErrorLog(errors);
    setUploading(false);
    if (onSuccess) onSuccess();
  };

  function downloadErrorLog() {
    if (!errorLog.length) return;
    const csv = 'Row,Item Code,Error\n' + errorLog.map(e => `${e.row},${e.itemCode},${e.error}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_upload_errors.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Upload Products" size="md">
      <div style={{ marginBottom: 16 }}>
        <button className="admin-btn secondary" onClick={downloadCSVTemplate}>Download CSV Template</button>
      </div>
      <div style={{ margin: '12px 0' }}>
        <label style={{ fontWeight: 500, marginRight: 8 }}>On Duplicate Item Code:</label>
        <select value={duplicateAction} onChange={e => setDuplicateAction(e.target.value)}>
          {DUPLICATE_ACTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
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
                {ALL_FIELDS.map(f => <th key={f}>{f}</th>)}
                <th>Status</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {csvProducts.map((p, i) => (
                <tr key={i} style={{ background: (p._errors && p._errors.length > 0) ? '#fff3f3' : undefined }}>
                  <td>{p._row}</td>
                  {ALL_FIELDS.map(f => <td key={f}>{p[f]}</td>)}
                  <td style={{ fontSize: 12 }}>
                    {alreadyUploadedMap[p._row] ? 'Already Uploaded' : ''}
                  </td>
                  <td style={{ color: '#e53e3e', fontSize: 12 }}>{p._errors && p._errors.length > 0 ? p._errors.join(', ') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {uploading && (
        <div style={{ margin: '12px 0' }}>
          <div style={{ width: '100%', background: '#eee', borderRadius: 4, height: 16, marginBottom: 4 }}>
            <div style={{ width: `${progress}%`, background: '#38a169', height: 16, borderRadius: 4, transition: 'width 0.3s' }}></div>
          </div>
          <div style={{ fontSize: 13 }}>{progress}% complete</div>
        </div>
      )}
      {summary && (
        <div style={{ margin: '12px 0', fontSize: 14 }}>
          <b>Upload Summary:</b> Success: {summary.success}, Failed: {summary.failed}, Skipped: {summary.skipped}
          {errorLog.length > 0 && <button className="admin-btn secondary" style={{ marginLeft: 12 }} onClick={downloadErrorLog}>Download Error Log</button>}
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