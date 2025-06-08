'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import './resetPassword.css';
import '../messages.css';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);

  // Initialize theme on component mount
  useEffect(() => {
    // Set initial theme from localStorage to prevent flicker
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    // Get token from URL
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setIsTokenValid(false);
      setError('Invalid password reset link. Please request a new one.');
      return;
    }
    
    setToken(tokenFromUrl);
    
    // Validate token with API
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/verify-reset-token?token=${tokenFromUrl}`);
        const data = await response.json();
        
        if (!response.ok) {
          setIsTokenValid(false);
          setError(data.message || 'Invalid or expired reset link. Please request a new one.');
        }
      } catch (err) {
        setIsTokenValid(false);
        setError('Could not validate reset link. Please try again later.');
      }
    };
    
    validateToken();
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validate password
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess('Your password has been reset successfully!');
      
      // Clear form
      setPassword('');
      setConfirmPassword('');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?reset=true');
      }, 3000);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isTokenValid) {
    return (
      <div className="reset-password-container">
        {/* Background decorative shapes */}
        <div className="reset-password-background-shapes">
          <div className="gradient-shape shape-1"></div>
          <div className="gradient-shape shape-2"></div>
          <div className="gradient-shape shape-3"></div>
        </div>

        <div className="reset-password-card">
          <div className="reset-password-title">
            <svg width="30" height="30" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="reset-password-title-svg">
              <defs>
                <linearGradient id="resetPasswordInvalidLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:"#4f46e5", stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:"#06b6d4", stopOpacity:1}} />
                </linearGradient>
              </defs>
              
              {/* Rounded rectangle background */}
              <rect x="15" y="15" width="170" height="170" rx="35" ry="35" fill="url(#resetPasswordInvalidLogoGradient)"/>
              
              {/* Main vertical line (left) */}
              <rect x="40" y="40" width="20" height="120" fill="white" rx="10"/>
              
              {/* Top horizontal line */}
              <rect x="40" y="40" width="120" height="20" fill="white" rx="10"/>
              
              {/* Middle horizontal line (shorter) */}
              <rect x="90" y="85" width="70" height="20" fill="white" rx="10"/>
              
              {/* Small square/dot bottom right */}
              <rect x="125" y="125" width="25" height="25" fill="white" rx="6"/>
            </svg>
            <span className="reset-password-title-text">Reset Password</span>
          </div>
          
          <div className="error-message">
            {error}
          </div>
          
          <div className="token-invalid-message">
            <p>The password reset link is invalid or has expired.</p>
            
            <div className="login-link">
              <Link href="/forgot-password">Request New Reset Link</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      {/* Background decorative shapes */}
      <div className="reset-password-background-shapes">
        <div className="gradient-shape shape-1"></div>
        <div className="gradient-shape shape-2"></div>
        <div className="gradient-shape shape-3"></div>
      </div>

      <div className="reset-password-card">
        <div className="reset-password-title">
          
          <span className="reset-password-title-text">Reset Password</span>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="reset-password-input"
              placeholder="Enter your new password"
              minLength={8}
              required
            />
            <p className="password-instructions">
              Password must be at least 8 characters long
            </p>
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="reset-password-input"
              placeholder="Confirm your new password"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="reset-password-button"
          >
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
        
        <div className="login-link">
          <Link href="/login">Back to Login</Link>
        </div>
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

export default function ResetPassword() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}