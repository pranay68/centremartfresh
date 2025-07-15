import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import "../AdminPanel.css";

const Settings = () => {
  const [settings, setSettings] = useState({
    storeName: 'Centre Mart',
    storeEmail: 'admin@centremart.com',
    storePhone: '+977-9800000000',
    storeAddress: 'Janakpur, Nepal',
    currency: 'NPR',
    taxRate: '13',
    deliveryCharge: '0',
    minOrderAmount: '100',
  });

  const [notifications, setNotifications] = useState({
    emailOrders: true,
    smsOrders: false,
    lowStock: true,
    dailyReports: true,
  });

  const [loading, setLoading] = useState(false);

  // Delivery Options State
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [newOption, setNewOption] = useState({ label: '', fee: '', eta: '' });
  const [savingDelivery, setSavingDelivery] = useState(false);

  // Delivery Locations State
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [savingLocations, setSavingLocations] = useState(false);

  const [loadingDelivery, setLoadingDelivery] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [errorDelivery, setErrorDelivery] = useState('');
  const [errorLocations, setErrorLocations] = useState('');

  // Fetch delivery options from Firestore on mount
  useEffect(() => {
    const fetchDeliveryOptions = async () => {
      setLoadingDelivery(true);
      setErrorDelivery('');
      try {
        const docRef = doc(db, 'settings', 'deliveryOptions');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDeliveryOptions(docSnap.data().options || []);
        } else {
          setDeliveryOptions([]);
        }
      } catch (err) {
        setErrorDelivery('Failed to load delivery options');
      } finally {
        setLoadingDelivery(false);
      }
    };
    fetchDeliveryOptions();
  }, []);

  // Fetch delivery locations from Firestore on mount
  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      setErrorLocations('');
      try {
        const docRef = doc(db, 'settings', 'deliveryLocations');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDeliveryLocations(docSnap.data().locations || []);
        } else {
          setDeliveryLocations([]);
        }
      } catch (err) {
        setErrorLocations('Failed to load delivery locations');
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  const saveDeliveryOptions = async (options) => {
    setSavingDelivery(true);
    try {
      await setDoc(doc(db, 'settings', 'deliveryOptions'), { options });
      setDeliveryOptions(options);
      toast.success('Delivery options saved!');
    } catch (err) {
      toast.error('Failed to save delivery options');
    } finally {
      setSavingDelivery(false);
    }
  };

  const saveDeliveryLocations = async (locations) => {
    setSavingLocations(true);
    try {
      await setDoc(doc(db, 'settings', 'deliveryLocations'), { locations });
      setDeliveryLocations(locations);
      toast.success('Delivery locations saved!');
    } catch (err) {
      toast.error('Failed to save delivery locations');
    } finally {
      setSavingLocations(false);
    }
  };

  const handleAddOption = () => {
    if (!newOption.label || !newOption.fee || !newOption.eta) {
      toast.error('Fill all fields for new delivery option');
      return;
    }
    const updated = [...deliveryOptions, { ...newOption, fee: Number(newOption.fee) }];
    saveDeliveryOptions(updated);
    setNewOption({ label: '', fee: '', eta: '' });
  };

  const handleEditOption = (idx, field, value) => {
    const updated = deliveryOptions.map((opt, i) =>
      i === idx ? { ...opt, [field]: field === 'fee' ? Number(value) : value } : opt
    );
    setDeliveryOptions(updated);
  };

  const handleRemoveOption = (idx) => {
    const updated = deliveryOptions.filter((_, i) => i !== idx);
    saveDeliveryOptions(updated);
  };

  const handleAddLocation = () => {
    if (!newLocation.trim()) {
      toast.error('Enter a location');
      return;
    }
    const updated = [...deliveryLocations, newLocation.trim()];
    saveDeliveryLocations(updated);
    setNewLocation('');
  };

  const handleRemoveLocation = (idx) => {
    const updated = deliveryLocations.filter((_, i) => i !== idx);
    saveDeliveryLocations(updated);
  };

  const handleSaveAllOptions = () => {
    saveDeliveryOptions(deliveryOptions);
  };

  const handleSettingsChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field, value) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Here you would typically save to your backend/database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <Button onClick={saveSettings} loading={loading} className="admin-btn">
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Information */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Store Information</h3>
          </Card.Header>
          <Card.Content className="space-y-4">
            <Input
              label="Store Name"
              value={settings.storeName}
              onChange={(e) => handleSettingsChange('storeName', e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={settings.storeEmail}
              onChange={(e) => handleSettingsChange('storeEmail', e.target.value)}
            />
            <Input
              label="Phone"
              value={settings.storePhone}
              onChange={(e) => handleSettingsChange('storePhone', e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={settings.storeAddress}
                onChange={(e) => handleSettingsChange('storeAddress', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </Card.Content>
        </Card>

        {/* Business Settings */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Business Settings</h3>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => handleSettingsChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="NPR">Nepali Rupee (NPR)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="INR">Indian Rupee (INR)</option>
              </select>
            </div>
            <Input
              label="Tax Rate (%)"
              type="number"
              step="0.01"
              value={settings.taxRate}
              onChange={(e) => handleSettingsChange('taxRate', e.target.value)}
            />
            <Input
              label="Delivery Charge"
              type="number"
              step="0.01"
              value={settings.deliveryCharge}
              onChange={(e) => handleSettingsChange('deliveryCharge', e.target.value)}
            />
            <Input
              label="Minimum Order Amount"
              type="number"
              step="0.01"
              value={settings.minOrderAmount}
              onChange={(e) => handleSettingsChange('minOrderAmount', e.target.value)}
            />
          </Card.Content>
        </Card>

        {/* Notification Settings */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Notifications</h3>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email for New Orders</p>
                <p className="text-sm text-gray-500">Get notified via email when new orders arrive</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.emailOrders}
                  onChange={(e) => handleNotificationChange('emailOrders', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">SMS for New Orders</p>
                <p className="text-sm text-gray-500">Get notified via SMS when new orders arrive</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.smsOrders}
                  onChange={(e) => handleNotificationChange('smsOrders', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Low Stock Alerts</p>
                <p className="text-sm text-gray-500">Get notified when products are running low</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.lowStock}
                  onChange={(e) => handleNotificationChange('lowStock', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Daily Reports</p>
                <p className="text-sm text-gray-500">Receive daily sales and order reports</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.dailyReports}
                  onChange={(e) => handleNotificationChange('dailyReports', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </Card.Content>
        </Card>

        {/* Delivery Options & Locations Section */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">🚚 Delivery Options & Locations</h3>
          </Card.Header>
          <Card.Content>
            {/* Delivery Options Table */}
            <div className="mb-8">
              <h4 className="font-bold mb-2 text-primary-700">Delivery Methods</h4>
              {loadingDelivery ? (
                <div className="text-center py-4 text-gray-500">Loading delivery options...</div>
              ) : errorDelivery ? (
                <div className="text-center py-4 text-red-500">{errorDelivery}</div>
              ) : (
                <div className="admin-table-scroll-wrapper">
                  <table className="w-full mb-2 border rounded" style={{ minWidth: '800px' }}>
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2">Label</th>
                        <th className="p-2">Fee (Rs)</th>
                        <th className="p-2">ETA</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryOptions.length === 0 && (
                        <tr><td colSpan={4} className="text-center text-gray-400 py-4">No delivery methods yet. Add one below!</td></tr>
                      )}
              {deliveryOptions.map((opt, idx) => (
                        <tr key={idx}>
                          <td><input value={opt.label} onChange={e => handleEditOption(idx, 'label', e.target.value)} className="border rounded p-1 w-full" /></td>
                          <td><input type="number" value={opt.fee} onChange={e => handleEditOption(idx, 'fee', e.target.value)} className="border rounded p-1 w-20" /></td>
                          <td><input value={opt.eta} onChange={e => handleEditOption(idx, 'eta', e.target.value)} className="border rounded p-1 w-full" /></td>
                          <td><Button onClick={() => handleRemoveOption(idx)} variant="outline" style={{ color: '#ff1744' }}>Delete</Button></td>
                        </tr>
                      ))}
                      <tr>
                        <td><input placeholder="Label" value={newOption.label} onChange={e => setNewOption({ ...newOption, label: e.target.value })} className="border rounded p-1 w-full" /></td>
                        <td><input type="number" placeholder="Fee" value={newOption.fee} onChange={e => setNewOption({ ...newOption, fee: e.target.value })} className="border rounded p-1 w-20" /></td>
                        <td><input placeholder="ETA" value={newOption.eta} onChange={e => setNewOption({ ...newOption, eta: e.target.value })} className="border rounded p-1 w-full" /></td>
                        <td><Button onClick={handleAddOption} disabled={savingDelivery}>Add</Button></td>
                      </tr>
                    </tbody>
                  </table>
                  <Button onClick={handleSaveAllOptions} disabled={savingDelivery} variant="outline" className="mt-2">Save All Delivery Options</Button>
                </div>
              )}
            </div>
            {/* Delivery Locations Table */}
            <div>
              <h4 className="font-bold mb-2 text-primary-700">Delivery Locations</h4>
              {loadingLocations ? (
                <div className="text-center py-4 text-gray-500">Loading locations...</div>
              ) : errorLocations ? (
                <div className="text-center py-4 text-red-500">{errorLocations}</div>
              ) : (
                <>
                  <ul className="mb-2">
                    {deliveryLocations.length === 0 && (
                      <li className="text-center text-gray-400 py-4">No locations yet. Add one below!</li>
                    )}
                    {deliveryLocations.map((loc, idx) => (
                      <li key={idx} className="flex items-center mb-1">
                        <span className="flex-1">{loc}</span>
                        <Button onClick={() => handleRemoveLocation(idx)} variant="outline" style={{ color: '#ff1744', marginLeft: 8 }}>Delete</Button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input placeholder="New Location" value={newLocation} onChange={e => setNewLocation(e.target.value)} className="border rounded p-1 w-full" />
                    <Button onClick={handleAddLocation} disabled={savingLocations}>Add</Button>
            </div>
                </>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* System Information */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">System Information</h3>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Version</p>
                <p className="font-medium">v2.1.0</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-medium">Jan 15, 2025</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Database</p>
                <p className="font-medium">Firebase</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Storage</p>
                <p className="font-medium">Cloudinary</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="admin-btn">
                  Export Data
                </Button>
                <Button variant="outline" size="sm" className="admin-btn">
                  Clear Cache
                </Button>
                <Button variant="danger" size="sm" className="admin-btn">
                  Reset Settings
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default Settings;