'use client';

import { useEffect } from 'react';
import '../globals.css';

export default function AuthLayout({ children }) {
  // Force light theme for all auth pages
  useEffect(() => {
    // Set light theme for auth pages
    document.documentElement.setAttribute('data-theme', 'light');
    
    // Cleanup function to restore user's preferred theme when leaving auth pages
    return () => {
      // Restore the user's saved theme preference when navigating away from auth
      const savedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      transition: 'background-color 0.3s ease'
    }}>
      {children}
    </div>
  );
}