import React, { useState } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import "./AdminPanel.css";
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

          <button
            className="w-full admin-btn"
            style={{ marginBottom: 16 }}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>

          {error && (
            <div className="mt-4 text-center text-red-500 text-sm">{error}</div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default AdminLogin;