'use client';

import { useState } from 'react';
import Link from 'next/link';
import './forgotPassword.css';
import '../messages.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset link');
      }

      // Show success message
      setIsSubmitted(true);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <h1 className="forgot-password-title">Reset Password</h1>
        
        {!isSubmitted ? (
          <>
            <p className="forgot-password-description">
              Enter your email address, and we'll send you instructions to reset your password.
            </p>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="forgot-password-form">
              <div>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="forgot-password-input"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="reset-button"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div className="success-container">
            <div className="success-message">
              Reset link sent! Check your email.
            </div>
            <p className="check-spam-note">
              If you don't see the email in your inbox, please check your spam folder.
            </p>
          </div>
        )}
        
        <div className="back-to-login">
          <Link href="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}