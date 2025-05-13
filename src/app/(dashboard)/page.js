'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardIndex() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect dashboard root to home
    router.push('/home');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center p-10">
      <p className="text-gray-300">Redirecting to home...</p>
    </div>
  );
}