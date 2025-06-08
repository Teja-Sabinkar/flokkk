'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProvider } from '@/context/UserContext';
import { ThemeProvider } from '@/context/ThemeContext';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Initial theme setup from localStorage before providers are loaded
  useEffect(() => {
    // Set initial theme from localStorage to prevent flicker
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    // We'll let UserProvider handle user data fetching
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary, #0f0f0f)',
        color: 'var(--text-tertiary, #aaaaaa)',
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <UserProvider>
      <ThemeProvider>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--bg-primary)',
          overflow: 'hidden',
          transition: 'background-color 0.3s ease'
        }}>
          {children}
        </div>
      </ThemeProvider>
    </UserProvider>
  );
}