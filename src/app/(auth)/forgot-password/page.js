'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import './forgotPassword.css';
import '../messages.css';
import { trackButtonClick } from '@/lib/analytics';

function ForgotPasswordContent() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Track reset button click - non-blocking
    try {
      if (typeof window !== 'undefined' && window.va) {
        window.va.event('button_click', {
          button_name: 'reset-button',
          has_error: false
        });
      }
    } catch (analyticsError) {
      // Silently catch analytics errors
      console.error('Analytics error:', analyticsError);
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Track error - non-blocking
        try {
          if (typeof window !== 'undefined' && window.va) {
            window.va.event('button_click', {
              button_name: 'reset-button',
              has_error: true,
              error_type: 'api_error',
              status_code: response.status
            });
          }
        } catch (e) { } // Silent catch

        throw new Error(data.message || 'Failed to send reset link');
      }

      // Track success - non-blocking
      try {
        if (typeof window !== 'undefined' && window.va) {
          window.va.event('button_click', {
            button_name: 'reset-button',
            has_error: false,
            success: true
          });
        }
      } catch (e) { } // Silent catch

      setSuccess(data.message || 'If an account with that email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false); // Always reset loading state
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <h1 className="forgot-password-title">Reset Password</h1>

        <p className="forgot-password-description">
          Enter your email address and we'll send you a link to reset your password.
        </p>

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

        <div className="back-to-login">
          <Link href="/login" onClick={() => trackButtonClick('back-to-login-from-reset')}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPassword() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}