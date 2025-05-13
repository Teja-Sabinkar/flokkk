'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../lib/auth';

export default function RootPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect based on authentication status
    if (isAuthenticated()) {
      // User is authenticated, redirect to dashboard home
      router.push('/home');
    } else {
      // User is not authenticated, redirect to login
      router.push('/login');
    }
  }, [router]);

  // Show loading indicator while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}