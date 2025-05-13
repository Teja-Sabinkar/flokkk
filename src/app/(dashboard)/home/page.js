'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import HomeFeed from '@/components/home/HomeFeed';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import styles from './page.module.css';

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  
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
      
      {/* Main content area with three columns */}
      <div className={styles.mainContent}>
        {/* Left sidebar with navigation */}
        <div className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.open : ''}`}>
          <div className={styles.sidebarScrollable}>
            <SidebarNavigation isOpen={isSidebarOpen} />
          </div>
        </div>
        
        {/* Mobile overlay for sidebar - only covers the content area */}
        {isSidebarOpen && (
          <div 
            className={styles.mobileOverlay} 
            onClick={handleOverlayClick}
          />
        )}
        
        {/* Middle content with HomeFeed */}
        <div className={styles.feedContainer}>
          <div className={styles.feedScrollable}>
            <HomeFeed />
          </div>
        </div>
        
        {/* Right sidebar with Recently Viewed */}
        <div className={styles.rightSidebarContainer}>
          <div className={styles.rightSidebarScrollable}>
            <RecentlyViewed initialItemCount={3} />
          </div>
        </div>
      </div>
    </div>
  );
}