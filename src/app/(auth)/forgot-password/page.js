'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import './forgotPassword.css';
import '../messages.css';

function ForgotPasswordContent() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Theme is now handled by AuthLayout - no theme logic needed here

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
      {/* Background decorative shapes */}
      <div className="forgot-password-background-shapes">
        <div className="gradient-shape shape-1"></div>
        <div className="gradient-shape shape-2"></div>
        <div className="gradient-shape shape-3"></div>
      </div>

      <div className="forgot-password-card">
        <div className="forgot-password-title">
          <span className="forgot-password-title-text">Reset Password</span>
        </div>
        
        {!isSubmitted ? (
          <>
            <p className="forgot-password-description">
              Enter your email address, and we&apos;ll send you instructions to reset your password.
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
                  placeholder="Enter your email"
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
              If you don&apos;t see the email in your inbox, please check your spam folder.
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

function LoadingFallback() {
  // Theme is handled by AuthLayout
  return (
    <div className="loading-container">
      <div>Loading...</div>
    </div>
  );
}

export default function ForgotPassword() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}