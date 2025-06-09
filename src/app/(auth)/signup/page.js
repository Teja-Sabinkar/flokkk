'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './signup.css';
import '../messages.css';

function SignupContent() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailSent, setEmailSent] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Theme is now handled by AuthLayout - no theme logic needed here

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate terms agreement
    if (!agreeToTerms) {
      setError('You must agree to the Terms and Conditions');
      setIsLoading(false);
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Call API to create account - use username as name as well
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.username, // Use username as the name
          username: formData.username,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Show success state with verification instructions
      setIsSubmitted(true);
      setEmailSent(formData.email);
      
      // Clear form
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      
      // Don't redirect to login immediately, show verification instructions
    } catch (err) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="signup-container">
        {/* Background decorative shapes */}
        <div className="signup-background-shapes">
          <div className="gradient-shape shape-1"></div>
          <div className="gradient-shape shape-2"></div>
          <div className="gradient-shape shape-3"></div>
        </div>

        <div className="signup-card">
          <div className="success-message">
            <h1>Check Your Email</h1>
            <p>
              We&apos;ve sent a verification link to <strong>{emailSent}</strong>
            </p>
          </div>
          
          <div className="next-steps">
            <h2>Next Steps:</h2>
            <ol>
              <li>Open the email from flokkk</li>
              <li>Click the &quot;Verify My Email&quot; button</li>
              <li>Return to login once verified</li>
            </ol>
          </div>
          
          <div className="action-buttons">
            <Link href="/login" className="login-button">Go to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-container">
      {/* Background decorative shapes */}
      <div className="signup-background-shapes">
        <div className="gradient-shape shape-1"></div>
        <div className="gradient-shape shape-2"></div>
        <div className="gradient-shape shape-3"></div>
      </div>

      <div className="signup-card">
        <div className="signup-title">
          <span className="signup-title-text">Create Account</span>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              className="signup-input"
              placeholder="Enter your username"
              required
              pattern="^[a-zA-Z0-9_]+$"
              title="Username can only contain letters, numbers, and underscores"
              maxLength={30}
            />
            <div className="input-rules">
              Maximum 30 characters
            </div>
          </div>
          
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="signup-input"
              placeholder="Enter your email"
              required
            />
            <div className="input-rules">Must be a valid email address</div>
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="signup-input"
              placeholder="Enter your password"
              required
              minLength={8}
            />
            <div className="input-rules">Minimum 8 characters</div>
          </div>
          
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="signup-input"
              placeholder="Confirm your password"
              required
            />
            <div className="input-rules">Must match the password above</div>
          </div>
          
          <div className="terms-checkbox">
            <input
              id="terms"
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              required
            />
            <label htmlFor="terms">
              I agree to the <a href="/terms">Terms and Conditions</a>
            </label>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="signup-button"
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="login-prompt">
          Already have an account? <Link href="/login">Log in</Link>
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

export default function Signup() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignupContent />
    </Suspense>
  );
}