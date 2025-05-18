'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DiscussionPageHeader from '@/components/layout/DiscussionPageHeader/DiscussionPageHeader';
import DiscussionPageSidebarNavigation from '@/components/layout/DiscussionPageSidebarNavigation/DiscussionPageSidebarNavigation';
import StudioContainer from '@/components/studio/StudioContainer';
import styles from './page.module.css';

// Mock user data for testing layout
const MOCK_USER = {
  _id: '12345',
  id: '12345',
  name: 'Alex Johnson',
  username: 'alexjohnson',
  email: 'alex@example.com',
  profilePicture: 'https://picsum.photos/seed/alex/200/200',
  avatar: 'https://picsum.photos/seed/alex/200/200',
  notifications: 5,
  isVerified: true
};

export default function StudioPage() {
  const router = useRouter();
  const [user, setUser] = useState(MOCK_USER); // Initialize with mock data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Simulate loading delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle menu toggle
  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Only when menu is open
      if (isMobileMenuOpen) {
        // Check if the click is outside the sidebar
        const sidebar = document.querySelector(`.${styles.sidebarContainer}`);
        const mobileButton = document.querySelector(`.mobileMenuButton`);

        if (sidebar &&
          !sidebar.contains(e.target) &&
          mobileButton &&
          !mobileButton.contains(e.target)) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isMobileMenuOpen && window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading studio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <button 
          className={styles.retryButton}
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.studioPage}>
      <DiscussionPageHeader 
        user={user} 
        onMenuToggle={handleMenuToggle}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      
      <div className={styles.mainContent}>
        {/* Sidebar navigation - hidden by default on mobile */}
        <div className={styles.sidebarContainer}>
          <DiscussionPageSidebarNavigation isOpen={isMobileMenuOpen} />
        </div>
        
        {/* Main content area */}
        <div className={`${styles.contentContainer} ${isMobileMenuOpen ? styles.menuOpen : ''}`}>
          <StudioContainer user={user} />
        </div>
        
        {/* Overlay for mobile when menu is open */}
        {isMobileMenuOpen && (
          <div className={styles.mobileOverlay} onClick={handleMenuToggle}></div>
        )}
      </div>
    </div>
  );
}