import React, { useState } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import "./AdminPanel.css";

const AdminLogin = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Local admin check only
    if (
      credentials.email === 'pranaykapar1@gmail.com' &&
      credentials.password === 'im_admin@'
    ) {
      onLogin(true);
    } else {
      setError('Invalid admin credentials.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Content className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Centre Mart</h1>
            <p className="text-gray-600">Admin Panel Login</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              placeholder="Enter your admin email"
              required
            />

            <Input
              label="Password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              placeholder="Enter your password"
              required
              error={error}
            />

            <Button 
              type="submit" 
              className="w-full admin-btn" 
              size="lg"
              loading={loading}
            >
              Sign In as Admin
            </Button>
          </form>

          {error && (
            <div className="mt-4 text-center text-red-500 text-sm">{error}</div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default AdminLogin;