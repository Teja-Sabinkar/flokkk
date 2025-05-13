'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import styles from './page.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  
  // Redirect to the account tab on initial load
  useEffect(() => {
    router.push('/settings/account');
  }, [router]);

  // Fetch user data if not using a context
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            // Ensure we have a valid avatar URL or null
            userData.avatar = userData.avatar || null;
            setUser(userData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };
    
    fetchUserData();
  }, []);

  // If no user data from API, provide a fallback
  const userWithFallback = user || {
    name: 'Guest',
    avatar: null,
    notifications: 0
  };

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle overlay click to close sidebar
  const handleOverlayClick = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header fixed at the top */}
      <div className={styles.headerContainer}>
        <Header 
          user={userWithFallback}
          onMenuToggle={toggleSidebar}
          isMobileMenuOpen={isSidebarOpen}
        />
      </div>
      
      {/* Main content area */}
      <div className={styles.mainContent}>
        {/* Left sidebar with navigation */}
        <div className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.open : ''}`}>
          <div className={styles.sidebarScrollable}>
            <SidebarNavigation isOpen={isSidebarOpen} />
          </div>
        </div>
        
        {/* Mobile overlay for sidebar */}
        {isSidebarOpen && (
          <div 
            className={styles.mobileOverlay} 
            onClick={handleOverlayClick}
          />
        )}
        
        {/* Content area - empty since we're redirecting */}
        <div className={styles.contentContainer}>
          <div className={styles.contentScrollable}>
            {/* Loading indicator or message could go here */}
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Redirecting to settings...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}