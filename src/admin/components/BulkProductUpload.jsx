import React, { useState, useRef, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import { addProduct, getAllProductsIncludingCustom } from '../../utils/productOperations';
import { db } from '../../firebase/config';
import { doc, getDoc, writeBatch, collection, serverTimestamp } from 'firebase/firestore';

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

const BulkProductUpdate = ({ isOpen, onClose, onSuccess }) => {
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

  function normalizeRowForFirestore(row) {
    const num = (v) => {
      const n = Number(String(v == null ? '' : v).trim());
      return isNaN(n) ? 0 : n;
    };
    return {
      id: row['Item Code'] || row.id || row.ID || row.Id || '',
      'Item Code': row['Item Code'] || '',
      Description: row['Description'] || '',
      'Base Unit': row['Base Unit'] || '',
      'Group ID': row['Group ID'] || '',
      'Group Name': row['Group Name'] || '',
      'Sub Group': row['Sub Group'] || '',
      'Supplier Name': row['Supplier Name'] || '',
      'Last CP': num(row['Last CP']),
      'Taxable CP': num(row['Taxable CP']),
      SP: num(row['SP']),
      Stock: num(row['Stock']),
      'Last Purc Miti': row['Last Purc Miti'] || '',
      'Last Purc Qty': num(row['Last Purc Qty']),
      'Sales Qty': num(row['Sales Qty']),
      '#': row['#'] || '',
      'Margin %': num(row['Margin %']),
      MRP: num(row['MRP']),
      Location1: row['Location1'] || '',
      Location2: row['Location2'] || '',
      Location3: row['Location3'] || '',
      Location4: row['Location4'] || '',
      Location5: row['Location5'] || '',
      createdAt: new Date(),
    };
  }

  async function uploadViaHttpsFunction(file) {
    const text = await file.text();
    const baseUrl = process.env.REACT_APP_FUNCTIONS_URL || '';
    const endpoint = `${baseUrl}/uploadProductsCsv`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: text,
    });
    if (!resp.ok) throw new Error(`CSV function failed (${resp.status})`);
    return resp.json();
  }

  async function uploadViaClientFirestore(validRows) {
    const ts = Date.now();
    const collectionName = `products_snapshot_${ts}`;
    const items = validRows.map(normalizeRowForFirestore).filter(r => r['Item Code']);
    const chunkSize = 400;
    const chunks = (a, size) => a.reduce((acc, _, i) => (i % size ? acc : [...acc, a.slice(i, i + size)]), []);
    const parts = chunks(items, chunkSize);
    for (let i = 0; i < parts.length; i++) {
      const batch = writeBatch(db);
      for (let j = 0; j < parts[i].length; j++) {
        const p = parts[i][j];
        const id = String(p.id || p['Item Code'] || `${ts}_${i}_${j}`);
        batch.set(doc(collection(db, collectionName), id), p);
      }
      await batch.commit();
      setProgress(Math.min(95, Math.round(((i + 1) / parts.length) * 95)));
    }
    await (async () => {
      const pointerRef = doc(db, 'system/productsSnapshot');
      // Using set with merge false to replace
      await import('firebase/firestore').then(({ setDoc }) => setDoc(pointerRef, {
        version: ts,
        collection: collectionName,
        total: items.length,
        createdAt: serverTimestamp(),
      }));
    })();
    return { version: ts, collection: collectionName, total: items.length };
  }

  const handleBulkUpload = async () => {
    // New flow: send raw CSV to HTTPS function, it creates a new collection and pointer
    if (!fileInputRef.current?.files?.[0]) {
      setCsvErrors(['Please choose a CSV file']);
      return;
    }

    setUploading(true);
    setProgress(0);
    setErrorLog([]);
    setSummary(null);

    try {
      const file = fileInputRef.current.files[0];
      let result = null;
      try {
        // Try cloud function first (works on hosting/emulator)
        result = await uploadViaHttpsFunction(file);
      } catch (fnErr) {
        // Fallback: do it entirely on client (localhost friendly)
        const validRows = csvProducts.filter(p => !p._errors || p._errors.length === 0);
        if (validRows.length === 0) throw new Error('No valid rows to upload');
        result = await uploadViaClientFirestore(validRows);
      }

      // Poll current snapshot pointer to display status
      const start = Date.now();
      let lastVersion = null;
      try {
        const currentDoc = await getDoc(doc(db, 'system/productsSnapshot'));
        lastVersion = currentDoc.exists() ? currentDoc.data().version : null;
      } catch (_e) {}

      // Simple polling loop (up to ~30s) to see if Cloud Function updated the pointer
      let newVersion = lastVersion;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000));
        setProgress(Math.min(95, Math.round(((i + 1) / 30) * 100)));
        const snap = await getDoc(doc(db, 'system/productsSnapshot'));
        if (snap.exists() && snap.data().version && snap.data().version !== lastVersion) {
          newVersion = snap.data().version;
          break;
        }
      }

      setSummary({ success: 1, failed: 0, skipped: 0, version: newVersion || lastVersion });
      } catch (err) {
      setErrorLog([{ row: '-', itemCode: '-', error: err.message }]);
    } finally {
    setUploading(false);
      setProgress(100);
    if (onSuccess) onSuccess();
    }
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
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Update Products" size="md">
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

export default BulkProductUpdate; 