'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import './login.css';
import '../messages.css';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Initialize theme on component mount
  useEffect(() => {
    // Set initial theme from localStorage to prevent flicker
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Check URL params for messages
  useEffect(() => {
    // Handle verification success
    if (searchParams.get('verified') === 'true') {
      setSuccess('Email verified successfully! You can now log in.');
    }
    
    // Handle registration success
    if (searchParams.get('registered') === 'true') {
      setSuccess('Account created! Please check your email to verify your account before logging in.');
    }
    
    // Handle password reset success
    if (searchParams.get('reset') === 'true') {
      setSuccess('Password reset successful! You can now log in with your new password.');
    }
    
    // Handle verification errors
    const error = searchParams.get('error');
    if (error === 'invalid-token') {
      setError('Invalid verification link. Please request a new one.');
      setShowResendVerification(true);
    } else if (error === 'expired-token') {
      setError('Verification link has expired. Please request a new one.');
      setShowResendVerification(true);
    } else if (error === 'server-error') {
      setError('A server error occurred. Please try again later.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.isVerificationError) {
          setError('Email not verified. Please check your inbox or request a new verification link.');
          setShowResendVerification(true);
          setResendEmail(email);
          throw new Error(data.message);
        }
        throw new Error(data.message || 'Login failed');
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token);
      
      // Redirect to dashboard home
      router.push('/home');
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (e) => {
    e.preventDefault();
    setResendLoading(true);
    setResendMessage('');
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend verification email');
      }

      setResendMessage(data.message || 'Verification email sent. Please check your inbox.');
    } catch (err) {
      setResendMessage(err.message || 'An error occurred. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background decorative shapes */}
      <div className="login-background-shapes">
        <div className="gradient-shape shape-1"></div>
        <div className="gradient-shape shape-2"></div>
        <div className="gradient-shape shape-3"></div>
      </div>

      <div className="login-card">
        <div className="login-title">
          <svg width="30" height="30" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="login-title-svg">
            <defs>
              <linearGradient id="loginLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:"#4f46e5", stopOpacity:1}} />
                <stop offset="100%" style={{stopColor:"#06b6d4", stopOpacity:1}} />
              </linearGradient>
            </defs>
            
            {/* Rounded rectangle background */}
            <rect x="15" y="15" width="170" height="170" rx="35" ry="35" fill="url(#loginLogoGradient)"/>
            
            {/* Main vertical line (left) */}
            <rect x="40" y="40" width="20" height="120" fill="white" rx="10"/>
            
            {/* Top horizontal line */}
            <rect x="40" y="40" width="120" height="20" fill="white" rx="10"/>
            
            {/* Middle horizontal line (shorter) */}
            <rect x="90" y="85" width="70" height="20" fill="white" rx="10"/>
            
            {/* Small square/dot bottom right */}
            <rect x="125" y="125" width="25" height="25" fill="white" rx="6"/>
          </svg>
          <span className="login-title-text">flokkk</span>
        </div>
        
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <div className="remember-me">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember-me">Remember me</label>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="login-button"
          >
            {isLoading ? 'Signing in...' : 'Log In'}
          </button>
        </form>
        
        <div className="forgot-password">
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        
        <div className="signup-prompt">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </div>
        
        {showResendVerification && (
          <div className="resend-verification">
            <form onSubmit={handleResendVerification}>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="login-input"
              />
              <button
                type="submit"
                disabled={resendLoading}
              >
                {resendLoading ? 'Sending...' : 'Resend Verification Email'}
              </button>
              
              {resendMessage && (
                <p className="resend-message">
                  {resendMessage}
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  // Initialize theme for loading state as well
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <div className="loading-container">
      <div>Loading...</div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}