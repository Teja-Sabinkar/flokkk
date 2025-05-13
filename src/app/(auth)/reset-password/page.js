'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import './resetPassword.css';
import '../messages.css';

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);

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
        <div className="reset-password-card">
          <h1 className="reset-password-title">Reset Password</h1>
          
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
      <div className="reset-password-card">
        <h1 className="reset-password-title">Reset Password</h1>
        
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
          <div>
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="reset-password-input"
              minLength={8}
              required
            />
            <p className="password-instructions">
              Password must be at least 8 characters long
            </p>
          </div>
          
          <div>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="reset-password-input"
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