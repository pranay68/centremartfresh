import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Button from '../../components/ui/Button';

const AdminDeliverySettings = () => {
  const [options, setOptions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [newOption, setNewOption] = useState({ label: '', fee: '', eta: '' });
  const [newLocation, setNewLocation] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch delivery options and locations
  useEffect(() => {
    const fetchSettings = async () => {
      const optionsSnap = await getDoc(doc(db, 'settings', 'deliveryOptions'));
      const locSnap = await getDoc(doc(db, 'settings', 'deliveryLocations'));
      setOptions(optionsSnap.exists() ? optionsSnap.data().options || [] : []);
      setLocations(locSnap.exists() ? locSnap.data().locations || [] : []);
    };
    fetchSettings();
  }, []);

  // Save delivery options to Firestore
  const saveOptions = async (opts) => {
    setSaving(true);
    await setDoc(doc(db, 'settings', 'deliveryOptions'), { options: opts });
    setOptions(opts);
    setSaving(false);
  };

  // Add new delivery option
  const handleAddOption = () => {
    if (!newOption.label || !newOption.fee || !newOption.eta) return;
    const opts = [...options, { ...newOption, fee: Number(newOption.fee) }];
    saveOptions(opts);
    setNewOption({ label: '', fee: '', eta: '' });
  };

  // Edit delivery option
  const handleEditOption = (idx, field, value) => {
    const opts = options.map((opt, i) => i === idx ? { ...opt, [field]: field === 'fee' ? Number(value) : value } : opt);
    saveOptions(opts);
  };

  // Delete delivery option
  const handleDeleteOption = (idx) => {
    const opts = options.filter((_, i) => i !== idx);
    saveOptions(opts);
  };

  // Save delivery locations to Firestore
  const saveLocations = async (locs) => {
    setSaving(true);
    await setDoc(doc(db, 'settings', 'deliveryLocations'), { locations: locs });
    setLocations(locs);
    setSaving(false);
  };

  // Add new location
  const handleAddLocation = () => {
    if (!newLocation.trim()) return;
    const locs = [...locations, newLocation.trim()];
    saveLocations(locs);
    setNewLocation('');
  };

  // Delete location
  const handleDeleteLocation = (idx) => {
    const locs = locations.filter((_, i) => i !== idx);
    saveLocations(locs);
  };

  const COMMON_LABELS = [
    'Fast Delivery',
    'Express Delivery',
    'Standard Delivery',
    'Same Day',
    'Pickup',
  ];
  const COMMON_ETAS = [
    'Delivered Today',
    '2-3 days',
    'Next Day',
    'Within 1 hour',
    'Pickup Anytime',
  ];

  return (
    <div style={{ maxWidth: 700, margin: '2rem auto', background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px rgba(102,126,234,0.10)', padding: '2.5rem 2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 24 }}>Delivery Options</h2>
      <div style={{ marginBottom: 32 }}>
        <table style={{ width: '100%', marginBottom: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th>Label</th>
              <th>Fee (Rs)</th>
              <th>ETA</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {options.map((opt, idx) => (
              <tr key={idx}>
                <td>
                  <select value={opt.label} onChange={e => handleEditOption(idx, 'label', e.target.value)} className="border rounded p-1 w-full mb-1">
                    <option value="">-- Select Label --</option>
                    {COMMON_LABELS.map(lab => <option key={lab} value={lab}>{lab}</option>)}
                    <option value={opt.label}>{opt.label}</option>
                  </select>
                  <input value={opt.label} onChange={e => handleEditOption(idx, 'label', e.target.value)} className="border rounded p-1 w-full" placeholder="Custom label" />
                </td>
                <td><input type="number" value={opt.fee} onChange={e => handleEditOption(idx, 'fee', e.target.value)} className="border rounded p-1 w-20" /></td>
                <td>
                  <select value={opt.eta} onChange={e => handleEditOption(idx, 'eta', e.target.value)} className="border rounded p-1 w-full mb-1">
                    <option value="">-- Select ETA --</option>
                    {COMMON_ETAS.map(eOpt => <option key={eOpt} value={eOpt}>{eOpt}</option>)}
                    <option value={opt.eta}>{opt.eta}</option>
                  </select>
                  <input value={opt.eta} onChange={e => handleEditOption(idx, 'eta', e.target.value)} className="border rounded p-1 w-full" placeholder="Custom ETA" />
                </td>
                <td><Button onClick={() => handleDeleteOption(idx)} variant="outline" style={{ color: '#ff1744' }}>Delete</Button></td>
              </tr>
            ))}
            <tr>
              <td>
                <select value={newOption.label} onChange={e => setNewOption({ ...newOption, label: e.target.value })} className="border rounded p-1 w-full mb-1">
                  <option value="">-- Select Label --</option>
                  {COMMON_LABELS.map(lab => <option key={lab} value={lab}>{lab}</option>)}
                </select>
                <input placeholder="Label" value={newOption.label} onChange={e => setNewOption({ ...newOption, label: e.target.value })} className="border rounded p-1 w-full" />
              </td>
              <td><input type="number" placeholder="Fee" value={newOption.fee} onChange={e => setNewOption({ ...newOption, fee: e.target.value })} className="border rounded p-1 w-20" /></td>
              <td>
                <select value={newOption.eta} onChange={e => setNewOption({ ...newOption, eta: e.target.value })} className="border rounded p-1 w-full mb-1">
                  <option value="">-- Select ETA --</option>
                  {COMMON_ETAS.map(eOpt => <option key={eOpt} value={eOpt}>{eOpt}</option>)}
                </select>
                <input placeholder="ETA" value={newOption.eta} onChange={e => setNewOption({ ...newOption, eta: e.target.value })} className="border rounded p-1 w-full" />
              </td>
              <td><Button onClick={handleAddOption} disabled={saving}>Add</Button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 24 }}>Delivery Locations</h2>
      <div>
        <ul style={{ marginBottom: 12 }}>
          {locations.map((loc, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ flex: 1 }}>{loc}</span>
              <Button onClick={() => handleDeleteLocation(idx)} variant="outline" style={{ color: '#ff1744', marginLeft: 8 }}>Delete</Button>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="New Location" value={newLocation} onChange={e => setNewLocation(e.target.value)} />
          <Button onClick={handleAddLocation} disabled={saving}>Add</Button>
        </div>
      </div>
    </div>
  );
};

export default AdminDeliverySettings; 