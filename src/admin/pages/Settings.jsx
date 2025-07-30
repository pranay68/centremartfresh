import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
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