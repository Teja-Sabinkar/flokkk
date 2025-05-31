'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import HomeFeed from '@/components/home/HomeFeed';
import HomeRightSidebar from '@/components/home/HomeRightSidebar';
import styles from './page.module.css';

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(() => {
    // Initially visible only if screen width >= 1300px (desktop)
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1300;
    }
    return true; // Default to true for SSR
  });
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth < 1300;
      setIsMobileView(isMobile);

      // If not in mobile view, ensure sidebar is visible
      if (!isMobile) {
        setIsRightSidebarVisible(true);
      }
    };

    // Check initially
    checkMobileView();

    // Set up event listener for window resize
    window.addEventListener('resize', checkMobileView);

    // Clean up
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

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
            // FIXED: Match subscriptions page logic
            userData.avatar = userData.avatar || userData.profilePicture || null;

            // FIXED: Ensure username fallback
            if (!userData.username && userData.name) {
              userData.username = userData.name;
            }

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
    username: 'Guest',  // ADDED: Include username in fallback
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

  // Define the right sidebar toggle function
  const handleRightSidebarToggle = () => {
    setIsRightSidebarVisible(!isRightSidebarVisible);
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
        <div className={`${styles.feedContainer} ${isMobileView && !isRightSidebarVisible ? styles.expandedFeed : ''}`}>
          <div className={styles.feedScrollable}>
            <HomeFeed />
          </div>
        </div>

        {/* Right sidebar component */}
        <div className={styles.homeRightSidebarWrapper}>
          <HomeRightSidebar
            isVisible={isRightSidebarVisible}
            isMobileView={isMobileView}
            onToggle={handleRightSidebarToggle}
            user={userWithFallback}
          />
        </div>
      </div>
    </div>
  );
}