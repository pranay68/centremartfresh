import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, defaultTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, signup, signInWithGoogle } = useAuth();

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (error) {
      toast.error('Failed to sign in with Google');
      console.error('Google sign in error:', error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(loginForm.email, loginForm.password);
      onClose();
    } catch (error) {
      toast.error('Login failed. Please check your credentials.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    
    try {
      await signup(signupForm.email, signupForm.password, signupForm.name);
      onClose();
    } catch (error) {
      toast.error('Signup failed. Please try again.');
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="auth-modal">
        <div className="auth-header">
          <h2>Welcome to Centre Mart</h2>
          <p>Sign in to your account or create a new one</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => setActiveTab('signup')}
          >
            Sign Up
          </button>
        </div>

        <div className="auth-content">
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="auth-form">
            <Input
              type="email"
                placeholder="Email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
              required
            />
            <Input
              type="password"
                placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              required
            />
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
          </form>
          ) : (
            <form onSubmit={handleSignup} className="auth-form">
            <Input
                type="text"
                placeholder="Full Name"
              value={signupForm.name}
              onChange={(e) => setSignupForm({...signupForm, name: e.target.value})}
              required
            />
            <Input
              type="email"
                placeholder="Email"
              value={signupForm.email}
              onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
              required
            />
            <Input
              type="password"
                placeholder="Password"
              value={signupForm.password}
              onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
              required
            />
            <Input
              type="password"
                placeholder="Confirm Password"
              value={signupForm.confirmPassword}
              onChange={(e) => setSignupForm({...signupForm, confirmPassword: e.target.value})}
              required
            />
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
          </form>
        )}

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            className="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
export default AuthModal;