'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProvider } from '@/context/UserContext';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Set the background color for all parent elements
  useEffect(() => {
    // This ensures all parent elements have the dark background
    document.documentElement.style.backgroundColor = '#0f0f0f';
    document.body.style.backgroundColor = '#0f0f0f';

    // Add a dark backdrop that fills any potential gaps
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.right = '0';
    backdrop.style.bottom = '0';
    backdrop.style.zIndex = '-1';
    backdrop.style.backgroundColor = '#0f0f0f';
    document.body.appendChild(backdrop);

    return () => {
      document.body.removeChild(backdrop);
    };
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
        backgroundColor: '#0f0f0f',
        color: '#aaaaaa',
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <UserProvider>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0f0f0f',
        overflow: 'hidden'
      }}>
        {children}
      </div>
    </UserProvider>
  );
}