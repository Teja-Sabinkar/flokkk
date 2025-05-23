// src/app/(dashboard)/subscriptions/page.js - Updated with sidebar awareness
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import SubscriptionsContainer from '@/components/subscriptions/SubscriptionsContainer';
import RightSidebarContainer from '@/components/ai/RightSidebarContainer';
import RightSidebarToggle from '@/components/ai/RightSidebarToggle';
import { 
  fetchSubscriptionFeed, 
  getRecentSubscriptions 
} from '@/lib/subscriptions';
import styles from './page.module.css';

export default function SubscriptionsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [subscriptionsData, setSubscriptionsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedPosts, setFeedPosts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPosts: 0,
    totalPages: 0
  });
  
  // New state for filter controls
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'day', 'week', or 'month'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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

  // Fetch subscription data
  useEffect(() => {
    const fetchSubscriptions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch recent active subscriptions
        const { subscriptions = [] } = await getRecentSubscriptions({ limit: 5 });
        setSubscriptionsData(subscriptions);
        
        // Fetch subscription feed posts
        const feedData = await fetchSubscriptionFeed({ page: 1, limit: 10 });
        setFeedPosts(feedData.posts || []);
        setPagination(feedData.pagination || pagination);
        
      } catch (error) {
        console.error('Error loading subscriptions:', error);
        setError(error.message || 'Failed to load subscriptions');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubscriptions();
  }, []);

  // Handle loading more posts
  const loadMorePosts = async () => {
    if (isLoading || pagination.page >= pagination.totalPages) return;
    
    try {
      setIsLoading(true);
      const nextPage = pagination.page + 1;
      
      const feedData = await fetchSubscriptionFeed({ 
        page: nextPage, 
        limit: pagination.limit 
      });
      
      setFeedPosts(prevPosts => [...prevPosts, ...(feedData.posts || [])]);
      setPagination(feedData.pagination);
    } catch (error) {
      console.error('Error loading more posts:', error);
      setError('Failed to load more posts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

  // Define the right sidebar toggle function
  const handleRightSidebarToggle = () => {
    setIsRightSidebarVisible(!isRightSidebarVisible);
  };

  // Filter subscriptions based on time period and search query
  const getFilteredSubscriptions = () => {
    // First apply time filter
    let filteredSubs = [...subscriptionsData];
    
    if (timeFilter !== 'all') {
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
      }
      
      // Filter based on lastPostTime (assuming it's in a format we can parse)
      filteredSubs = filteredSubs.filter(sub => {
        // Parse the lastPostTime (e.g., "2h ago", "3d ago")
        const timeMatch = sub.lastPostTime?.match(/(\d+)([hd])/);
        if (!timeMatch) return true; // Keep if can't parse
        
        const value = parseInt(timeMatch[1]);
        const unit = timeMatch[2];
        
        const postDate = new Date();
        if (unit === 'h') {
          postDate.setHours(postDate.getHours() - value);
        } else if (unit === 'd') {
          postDate.setDate(postDate.getDate() - value);
        }
        
        return postDate >= cutoffDate;
      });
    }
    
    // Then apply search query if exists
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredSubs = filteredSubs.filter(sub => 
        (sub.username && sub.username.toLowerCase().includes(query)) ||
        (sub.name && sub.name.toLowerCase().includes(query)) ||
        (sub.title && sub.title.toLowerCase().includes(query)) ||
        (sub.description && sub.description.toLowerCase().includes(query))
      );
    }
    
    return filteredSubs;
  };
  
  // Filter posts based on time period and search query
  const getFilteredPosts = () => {
    // First apply time filter
    let filteredPosts = [...feedPosts];
    
    if (timeFilter !== 'all') {
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
      }
      
      filteredPosts = filteredPosts.filter(post => {
        const postDate = new Date(post.createdAt);
        return postDate >= cutoffDate;
      });
    }
    
    // Then apply search query if exists
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredPosts = filteredPosts.filter(post => 
        (post.username && post.username.toLowerCase().includes(query)) ||
        (post.name && post.name.toLowerCase().includes(query)) ||
        (post.title && post.title.toLowerCase().includes(query)) ||
        (post.content && post.content.toLowerCase().includes(query))
      );
    }
    
    return filteredPosts;
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
        
        {/* Mobile overlay for sidebar toggle */}
        {isSidebarOpen && (
          <div 
            className={styles.mobileOverlay} 
            onClick={handleOverlayClick}
          />
        )}
        
        {/* Content area with subscriptions - FIXED: Apply expandedContent class conditionally */}
        <div className={`${styles.contentContainer} ${!isRightSidebarVisible || isMobileView ? styles.expandedContent : ''}`}>
          <div className={styles.contentScrollable}>
            <div className={styles.pageHeader}>
              <h1>Subscriptions</h1>
              <p className={styles.pageDescription}>
                Creators and content you follow across the platform
              </p>
            </div>
            
            {/* Filter Bar - New Addition */}
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
            
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}
            
            <SubscriptionsContainer 
              subscriptions={getFilteredSubscriptions()} 
              isLoading={isLoading}
              feedPosts={getFilteredPosts()}
              onLoadMore={loadMorePosts}
              hasMore={pagination.page < pagination.totalPages}
              viewMode={viewMode}
              isExpanded={!isRightSidebarVisible || isMobileView}
            />
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