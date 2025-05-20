// src/app/(dashboard)/recently-viewed/page.js - Updated (removed DesktopSidebarToggle)
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import RecentlyViewedContainer from '@/components/recentlyviewed/RecentlyViewedContainer';
import RightSidebarContainer from '@/components/ai/RightSidebarContainer';
import RightSidebarToggle from '@/components/ai/RightSidebarToggle';
import styles from './page.module.css';

export default function RecentlyViewedPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [recentlyViewedItems, setRecentlyViewedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'day', 'week', or 'month'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add state for right sidebar visibility and mobile view detection
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(() => {
    // Initially visible only if screen width >= 1300px (desktop)
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1300;
    }
    return true; // Default to true for SSR
  });
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Check for mobile view and update sidebar visibility
  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth < 1300;
      setIsMobileView(isMobile);
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

  // Fetch recently viewed items
  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        
        if (token) {
          const response = await fetch('/api/recently-viewed', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`Error fetching recently viewed items: ${response.status}`);
          }
          
          const data = await response.json();
          setRecentlyViewedItems(data.items || []);
        }
      } catch (error) {
        console.error('Error fetching recently viewed items:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecentlyViewed();
  }, []);

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

  // Handle clear history
  const handleClearHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await fetch('/api/recently-viewed/clear', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          setRecentlyViewedItems([]);
        }
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  // Filter items based on time period
  const getFilteredItems = () => {
    if (timeFilter === 'all') return recentlyViewedItems;
    
    const now = new Date();
    let cutoffDate;
    
    switch (timeFilter) {
      case 'day':
        // Last 24 hours
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        // Last 7 days
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        // Last 30 days
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return recentlyViewedItems;
    }
    
    // Function to parse different time formats
    const parseTimeAgo = (timeAgo) => {
      if (!timeAgo) return new Date(0); // Default to very old
      
      const match = timeAgo.match(/(\d+)\s+(\w+)\s+ago/);
      if (!match) return new Date(0);
      
      const [_, amount, unit] = match;
      const value = parseInt(amount);
      
      switch (unit) {
        case 'second':
        case 'seconds':
          return new Date(now.getTime() - value * 1000);
        case 'minute':
        case 'minutes':
          return new Date(now.getTime() - value * 60 * 1000);
        case 'hour':
        case 'hours':
          return new Date(now.getTime() - value * 60 * 60 * 1000);
        case 'day':
        case 'days':
          return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
        case 'week':
        case 'weeks':
          return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
        case 'month':
        case 'months':
          return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
        case 'year':
        case 'years':
          return new Date(now.getTime() - value * 365 * 24 * 60 * 60 * 1000);
        default:
          return new Date(0);
      }
    };
    
    return recentlyViewedItems.filter(item => {
      const viewedDate = parseTimeAgo(item.lastViewed);
      return viewedDate >= cutoffDate;
    });
  };

  // Filter and search the items
  const filteredItems = getFilteredItems()
    .filter(item => {
      // Apply search query
      if (!searchQuery) return true;
      
      const lowerQuery = searchQuery.toLowerCase();
      
      // Search in post content
      const contentMatch = 
        (item.title && item.title.toLowerCase().includes(lowerQuery)) ||
        (item.description && item.description.toLowerCase().includes(lowerQuery));
      
      // Search in username
      const usernameMatch = 
        (item.author && item.author.username && 
          item.author.username.toLowerCase().includes(lowerQuery));
      
      // Return true if either content or username matches
      return contentMatch || usernameMatch;
    });

  // If no user data from API, provide a fallback
  const userWithFallback = user || {
    name: 'Guest',
    avatar: null,
    notifications: 0
  };

  // Fallback data if API fails or is empty
  const fallbackItems = [
    /* Example fallback data structure*/
  ];

  // Use API data if available, fallback data if API fails or empty
  const displayItems = recentlyViewedItems.length > 0 ? filteredItems : (isLoading ? [] : fallbackItems);

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
        
        {/* Content area with recently viewed items */}
        <div className={styles.contentContainer}>
          <div className={styles.contentScrollable}>
            <div className={styles.pageHeader}>
              <h1>Recently Viewed</h1>
              <p className={styles.pageDescription}>
                Content you've viewed recently across the platform
              </p>
            </div>
            
            {/* Filter Bar */}
            <div className={styles.filterBar}>
              <div className={styles.filterBarLeft}>
                <div className={styles.filterDropdown}>
                  <select 
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="all">All Time</option>
                    <option value="day">Past 24 Hours</option>
                    <option value="week">Past Week</option>
                    <option value="month">Past Month</option>
                  </select>
                </div>
              </div>
              
              <div className={styles.filterBarRight}>
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    placeholder="Search content or users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                  <button className={styles.searchButton} aria-label="Search">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </button>
                </div>
                
                <div className={styles.viewToggle}>
                  <button 
                    className={`${styles.viewToggleButton} ${viewMode === 'grid' ? styles.active : ''}`}
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </button>
                  <button 
                    className={`${styles.viewToggleButton} ${viewMode === 'list' ? styles.active : ''}`}
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"></line>
                      <line x1="8" y1="12" x2="21" y2="12"></line>
                      <line x1="8" y1="18" x2="21" y2="18"></line>
                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                      <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <p>Loading recently viewed items...</p>
              </div>
            ) : error ? (
              <div className={styles.errorContainer}>
                <p>Error loading recently viewed items: {error}</p>
              </div>
            ) : (
              <RecentlyViewedContainer 
                items={displayItems} 
                viewMode={viewMode}
              />
            )}
          </div>
        </div>

        {/* Unified Right sidebar toggle - visible on both desktop and mobile */}
        <RightSidebarToggle 
          isRightSidebarVisible={isRightSidebarVisible} 
          handleRightSidebarToggle={handleRightSidebarToggle} 
        />

        {/* Right sidebar with AI assistant - Part of the flex layout in desktop */}
        <RightSidebarContainer
          user={userWithFallback}
          isRightSidebarVisible={isRightSidebarVisible}
          isMobileView={isMobileView}
        />
      </div>
    </div>
  );
}