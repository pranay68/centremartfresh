import React, { useState } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import "./AdminPanel.css";
<<<<<<< HEAD
import { useAuth } from '../context/AuthContext';

const ADMIN_EMAILS = [
  'pranaykapar1@gmail.com',
  'centremart248@gmail.com'
];

const AdminLogin = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, user, logout } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const signedInUser = await signInWithGoogle();
      if (ADMIN_EMAILS.includes(signedInUser.email)) {
      onLogin(true);
    } else {
        setError('Not authorized. Only admin emails can access.');
        await logout();
      }
    } catch (err) {
      setError('Google sign-in failed.');
=======

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
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
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

<<<<<<< HEAD
          <button
              className="w-full admin-btn" 
            style={{ marginBottom: 16 }}
            onClick={handleGoogleSignIn}
            disabled={loading}
            >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>
=======
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
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d

          {error && (
            <div className="mt-4 text-center text-red-500 text-sm">{error}</div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default AdminLogin;