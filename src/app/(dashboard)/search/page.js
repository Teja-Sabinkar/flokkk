'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext'; // Import the user context
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import SearchContainer from '@/components/search/SearchContainer';
import styles from './page.module.css';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser(); // Use the user context

  // Get URL parameters for filter state persistence
  const urlQuery = searchParams.get('q') || '';
  const urlPage = searchParams.get('page') ? parseInt(searchParams.get('page')) : 1;
  const urlDateFilter = searchParams.get('dateFilter') || 'all';
  const urlTypeFilter = searchParams.get('type') || 'all';
  const urlViewMode = searchParams.get('view') || 'grid';

  // State for sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // State for search results
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [dateFilter, setDateFilter] = useState(urlDateFilter);
  const [typeFilter, setTypeFilter] = useState(urlTypeFilter);
  const [viewMode, setViewMode] = useState(urlViewMode);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [searchInputValue, setSearchInputValue] = useState(urlQuery);

  // This will force refresh when URL changes
  useEffect(() => {
    // Update the search query from URL whenever it changes
    setSearchQuery(urlQuery);
    setSearchInputValue(urlQuery);

    // Reset to first page when query changes
    if (urlPage !== 1) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', '1');
      router.replace(`/search?${newParams.toString()}`, { scroll: false });
    }

    // Also check if we need to update other filters from URL
    setDateFilter(urlDateFilter);
    setTypeFilter(urlTypeFilter);
    setViewMode(urlViewMode);
  }, [urlQuery, searchParams, router, urlDateFilter, urlTypeFilter, urlViewMode, urlPage]);

  // Also listen to sessionStorage change event to detect new searches
  useEffect(() => {
    const handleStorageChange = () => {
      // This will trigger when handleSearch is called from the Header
      performSearch();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []);

  // Update URL params when filters change
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams(searchParams);

    if (typeFilter !== 'all') {
      params.set('type', typeFilter);
    } else {
      params.delete('type');
    }

    if (dateFilter !== 'all') {
      params.set('dateFilter', dateFilter);
    } else {
      params.delete('dateFilter');
    }

    if (viewMode !== 'grid') {
      params.set('view', viewMode);
    } else {
      params.delete('view');
    }

    if (searchQuery) {
      params.set('q', searchQuery);
    }

    const newUrl = params.toString()
      ? `/search?${params.toString()}`
      : '/search';

    router.replace(newUrl, { scroll: false });
  }, [searchParams, dateFilter, typeFilter, viewMode, searchQuery, router]);

  // Special case: if searching for "profile", automatically set type to "profile"
  useEffect(() => {
    if (searchQuery && searchQuery.toLowerCase() === 'profile' && typeFilter !== 'profile') {
      setTypeFilter('profile');
    }
  }, [searchQuery, typeFilter]);

  // Fetch search results
  const performSearch = useCallback(async () => {
    if (!searchQuery) {
      setSearchResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Always add a timestamp to prevent caching
      const timestamp = Date.now();
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${typeFilter}&_=${timestamp}`);

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Error searching:', error);
      setError(error.message || 'Failed to perform search');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, typeFilter]);

  // Update URL when filters change
  useEffect(() => {
    updateUrlParams();
  }, [typeFilter, dateFilter, viewMode, searchQuery, updateUrlParams]);

  // Fetch data when dependencies change
  useEffect(() => {
    performSearch();
  }, [searchQuery, typeFilter, performSearch]);

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInputValue);
  };

  // Handle retry of search
  const handleRetry = () => {
    performSearch();
  };

  // Create a more complete userWithFallback with all necessary fields for comparison
  const userWithFallback = user ? {
    ...user,
    name: user.name || 'User',
    username: user.username || user.name || 'user',
    _id: user._id || user.id || null, // Ensure _id is available
    avatar: user.avatar || null,
    notifications: user.notifications || 0
  } : {
    name: 'Guest',
    username: 'guest',
    _id: null, // Include _id in fallback
    avatar: null,
    notifications: 0
  };

  // Log what's being passed to Header and SearchContainer (for debugging)
  console.log('Passing to Header:', userWithFallback);
  console.log('User data for SearchContainer:', userWithFallback);

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

        {/* Content area with search results */}
        <div className={styles.contentContainer}>
          <div className={styles.contentScrollable}>
            {/* Page header with title and description */}
            <div className={styles.pageHeader}>
              <h1>Search Results</h1>
              {searchQuery && (
                <p className={styles.pageDescription}>
                  Showing results for <span className={styles.searchQuery}>"{searchQuery}"</span>
                </p>
              )}
            </div>

            {/* Filters and controls */}
            <div className={styles.filtersContainer}>
              <div className={styles.filterGroup}>
                <select
                  className={styles.filterSelect}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>

                <select
                  className={styles.filterSelect}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="post">Posts</option>
                  <option value="profile">Profiles</option>
                </select>
              </div>

              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                </button>
                <button
                  className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

            {/* Active filters display */}
            {(dateFilter !== 'all' || typeFilter !== 'all') && (
              <div className={styles.activeFilters}>
                <div className={styles.activeFiltersLabel}>Active filters:</div>
                <div className={styles.filterTags}>
                  {dateFilter !== 'all' && (
                    <div className={styles.filterTag}>
                      {dateFilter === 'today' ? 'Today' :
                        dateFilter === 'week' ? 'This Week' : 'This Month'}
                      <button
                        className={styles.removeFilterButton}
                        onClick={() => setDateFilter('all')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}

                  {typeFilter !== 'all' && (
                    <div className={styles.filterTag}>
                      {typeFilter === 'post' ? 'Posts' : 'Profiles'}
                      <button
                        className={styles.removeFilterButton}
                        onClick={() => setTypeFilter('all')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}

                  <button
                    className={styles.clearAllFiltersButton}
                    onClick={() => {
                      setDateFilter('all');
                      setTypeFilter('all');
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Search results */}
            <SearchContainer
              results={searchResults}
              isLoading={isLoading}
              error={error}
              viewMode={viewMode}
              onRetry={handleRetry}
              user={userWithFallback}
            />
          </div>
        </div>
      </div>
    </div>
  );
}