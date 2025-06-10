'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import SearchContainer from '@/components/search/SearchContainer';
import styles from './page.module.css';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();

  // Extract URL parameters
  const urlQuery = searchParams.get('q') || '';
  const urlType = searchParams.get('type') || 'all';
  const urlDateFilter = searchParams.get('dateFilter') || 'all';
  const urlView = searchParams.get('view') || 'grid';

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter State
  const [typeFilter, setTypeFilter] = useState(urlType);
  const [dateFilter, setDateFilter] = useState(urlDateFilter);
  const [viewMode, setViewMode] = useState(urlView);

  // Initialize state from URL on mount and URL changes
  useEffect(() => {
    setSearchQuery(urlQuery);
    setTypeFilter(urlType);
    setDateFilter(urlDateFilter);
    setViewMode(urlView);
  }, [urlQuery, urlType, urlDateFilter, urlView]);

  // Update URL when filters change
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('q', searchQuery);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (dateFilter !== 'all') params.set('dateFilter', dateFilter);
    if (viewMode !== 'grid') params.set('view', viewMode);

    const newURL = params.toString() ? `/search?${params.toString()}` : '/search';
    router.replace(newURL, { scroll: false });
  }, [searchQuery, typeFilter, dateFilter, viewMode, router]);

  // Perform search
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: typeFilter,
        _t: Date.now().toString() // Cache buster
      });

      const response = await fetch(`/api/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to perform search');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, typeFilter]);

  // Update URL when filters change
  useEffect(() => {
    updateURL();
  }, [updateURL]);

  // Perform search when query or type filter changes
  useEffect(() => {
    if (searchQuery) {
      performSearch();
    } else {
      setSearchResults([]);
      setIsLoading(false);
      setError(null);
    }
  }, [searchQuery, typeFilter, performSearch]);

  // Special case: auto-set type filter for "profile" search
  useEffect(() => {
    if (searchQuery.toLowerCase() === 'profile' && typeFilter !== 'profile') {
      setTypeFilter('profile');
    }
  }, [searchQuery, typeFilter]);

  // Prepare user data with proper fallbacks
  const currentUser = user ? {
    _id: user._id || user.id,
    id: user.id || user._id,
    name: user.name || 'User',
    username: user.username || user.name?.toLowerCase().replace(/\s+/g, '_') || 'user',
    avatar: user.avatar || user.profilePicture,
    notifications: user.notifications || 0
  } : null;

  // Event handlers
  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleOverlayClick = () => {
    setIsSidebarOpen(false);
  };

  const handleRetry = () => {
    performSearch();
  };

  const handleTypeFilterChange = (newType) => {
    setTypeFilter(newType);
  };

  const handleDateFilterChange = (newDate) => {
    setDateFilter(newDate);
  };

  const handleViewModeChange = (newView) => {
    setViewMode(newView);
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setDateFilter('all');
  };

  const removeTypeFilter = () => {
    setTypeFilter('all');
  };

  const removeDateFilter = () => {
    setDateFilter('all');
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.headerContainer}>
        <Header
          user={currentUser}
          onMenuToggle={handleSidebarToggle}
          isMobileMenuOpen={isSidebarOpen}
        />
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Sidebar */}
        <div className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.open : ''}`}>
          <div className={styles.sidebarScrollable}>
            <SidebarNavigation isOpen={isSidebarOpen} />
          </div>
        </div>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className={styles.mobileOverlay}
            onClick={handleOverlayClick}
          />
        )}

        {/* Content */}
        <div className={styles.contentContainer}>
          <div className={styles.contentScrollable}>
            {/* Page Header */}
            <div className={styles.pageHeader}>
              <h1>Search Results</h1>
              {searchQuery && (
                <p className={styles.pageDescription}>
                  Showing results for <span className={styles.searchQuery}>"{searchQuery}"</span>
                </p>
              )}
            </div>

            {/* Filters */}
            <div className={styles.filtersContainer}>
              <div className={styles.filterGroup}>
                <select
                  className={styles.filterSelect}
                  value={dateFilter}
                  onChange={(e) => handleDateFilterChange(e.target.value)}
                  aria-label="Date filter"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>

                <select
                  className={styles.filterSelect}
                  value={typeFilter}
                  onChange={(e) => handleTypeFilterChange(e.target.value)}
                  aria-label="Content type filter"
                >
                  <option value="all">All Types</option>
                  <option value="post">Posts</option>
                  <option value="profile">Profiles</option>
                </select>
              </div>

              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                  onClick={() => handleViewModeChange('grid')}
                  aria-label="Grid view"
                  type="button"
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
                  onClick={() => handleViewModeChange('list')}
                  aria-label="List view"
                  type="button"
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

            {/* Active Filters */}
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
                        onClick={removeDateFilter}
                        aria-label="Remove date filter"
                        type="button"
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
                        onClick={removeTypeFilter}
                        aria-label="Remove type filter"
                        type="button"
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
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Search Results */}
            <SearchContainer
              results={searchResults}
              isLoading={isLoading}
              error={error}
              viewMode={viewMode}
              onRetry={handleRetry}
              user={currentUser}
            />
          </div>
        </div>
      </div>
    </div>
  );
}