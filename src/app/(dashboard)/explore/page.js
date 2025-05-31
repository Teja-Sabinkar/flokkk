'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // ADD THIS IMPORT
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import CategorySection from '@/components/explore/CategorySection';
import ExploreSection from '@/components/explore/ExploreSection';
import ExploreRightSidebar from '@/components/explore/ExploreRightSidebar';
import ExploreRightSidebarToggle from '@/components/explore/ExploreRightSidebarToggle';
import styles from './page.module.css';

export default function ExplorePage() {
  const router = useRouter(); // ADD THIS LINE
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Trending');
  const [exploreItems, setExploreItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [noContentMessage, setNoContentMessage] = useState(null);

  // Add state for right sidebar visibility and mobile view detection
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(() => {
    // Initially visible only if screen width >= 1300px (desktop)
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1300;
    }
    return true; // Default to true for SSR
  });
  const [isMobileView, setIsMobileView] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(330);

  // Categories with your exact definitions and icons
  const categories = [
    {
      id: 'trending',
      title: 'Trending',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 012.5 2.5z"></path>
        </svg>
      )
    },
    {
      id: 'music',
      title: 'Music',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
      )
    },
    {
      id: 'gaming',
      title: 'Gaming',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
          <polyline points="17 2 12 7 7 2"></polyline>
        </svg>
      )
    },
    {
      id: 'movies',
      title: 'Movies',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
          <line x1="7" y1="2" x2="7" y2="22"></line>
          <line x1="17" y1="2" x2="17" y2="22"></line>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <line x1="2" y1="7" x2="7" y2="7"></line>
          <line x1="2" y1="17" x2="7" y2="17"></line>
          <line x1="17" y1="17" x2="22" y2="17"></line>
          <line x1="17" y1="7" x2="22" y2="7"></line>
        </svg>
      )
    },
    {
      id: 'news',
      title: 'News',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
          <path d="M18 14h-8"></path>
          <path d="M15 18h-5"></path>
          <path d="M10 6h8v4h-8z"></path>
        </svg>
      )
    },
    {
      id: 'sports',
      title: 'Sports',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7"></circle>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
        </svg>
      )
    },
    {
      id: 'learning',
      title: 'Learning',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      )
    },
    {
      id: 'fashion',
      title: 'Fashion',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 22l1-4h16l1 4"></path>
          <path d="M3 7v1a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7"></path>
          <path d="M12 2v10"></path>
          <path d="M3 7l9-5"></path>
          <path d="M21 7l-9-5"></path>
        </svg>
      )
    },
    {
      id: 'podcasts',
      title: 'Podcasts',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      )
    },
    {
      id: 'lifestyle',
      title: 'Lifestyle',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      )
    }
  ];

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

  // Fetch user data
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
            userData.avatar = userData.avatar || userData.profilePicture || null;
            // Ensure we have username - try multiple possible field names
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

  // Fetch explore content when category changes
  useEffect(() => {
    fetchExploreContent(activeCategory, 1);
  }, [activeCategory]);

  // Function to fetch explore content from API with pagination
  const fetchExploreContent = async (category, pageNumber) => {
    setIsLoading(true);
    setError(null);

    if (pageNumber === 1) {
      setExploreItems([]);
    }

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await fetch(`/api/explore/category?category=${encodeURIComponent(category)}&page=${pageNumber}&limit=12`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch explore content: ${response.statusText}`);
      }

      const data = await response.json();

      // NEW: Handle no content response with encouraging messages
      if (data.source === 'no_content' && data.message) {
        setExploreItems([]);
        setHasMore(false);
        setNoContentMessage(data.message);
        console.log(`📭 No content found for ${category}`);
        return;
      }

      // Clear no content message when we have results
      setNoContentMessage(null);

      // Process the items as before...
      const processedItems = (data.items || []).map(item => ({
        id: item.id || item._id,
        username: item.username || 'anonymous',
        timeAgo: item.timeAgo || 'some time',
        title: item.title || 'Untitled',
        description: item.description || item.content || '',
        imageUrl: item.imageUrl || item.image || '/api/placeholder/600/300',
        videoUrl: item.videoUrl || null,
        discussionCount: item.discussionCount || '0',
        profilePicture: item.profilePicture || '/profile-placeholder.jpg'
      }));

      if (pageNumber === 1) {
        setExploreItems(processedItems);
      } else {
        setExploreItems(prevItems => [...prevItems, ...processedItems]);
      }

      setPage(pageNumber);
      setHasMore(data.pagination && data.pagination.page < data.pagination.totalPages);

      console.log(`📊 Loaded ${processedItems.length} items for ${category} (page ${pageNumber})`);

    } catch (err) {
      console.error('Error fetching explore content:', err);
      setError(err.message || 'Failed to load content');
      setNoContentMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle load more functionality
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchExploreContent(activeCategory, page + 1);
    }
  };

  // Handle category change
  const handleCategoryChange = (newCategory) => {
    console.log('Category changed to:', newCategory);
    setActiveCategory(newCategory);
    setPage(1); // Reset pagination when category changes
  };

  // Load saved sidebar width on component mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('rightSidebarWidth');
    if (savedWidth) {
      setRightSidebarWidth(Number(savedWidth));
    }
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

  // Handle right sidebar width change
  const handleRightSidebarWidthChange = (width) => {
    setRightSidebarWidth(width);
  };

  // If no user data from API, provide a fallback
  const userWithFallback = user || {
    name: 'Guest',
    username: 'Guest',
    avatar: null,
    notifications: 0
  };

  return (
    <div className={styles.pageContainer}>
      {/* Your existing header */}
      <div className={styles.headerContainer}>
        <Header
          user={userWithFallback}
          onMenuToggle={toggleSidebar}
          isMobileMenuOpen={isSidebarOpen}
        />
      </div>

      <div className={styles.mainContent}>
        {/* Your existing sidebar */}
        <div className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.open : ''}`}>
          <div className={styles.sidebarScrollable}>
            <SidebarNavigation isOpen={isSidebarOpen} />
          </div>
        </div>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className={styles.mobileOverlay}
            onClick={handleOverlayClick}
          />
        )}

        {/* REPLACE your existing content area with this enhanced version */}
        <div className={`${styles.contentContainer} ${!isRightSidebarVisible ? styles.expanded : ''}`}>
          <div className={styles.contentScrollable}>
            <div className={styles.pageHeader}>
              <h1>Explore</h1>
              <p className={styles.pageDescription}>
                Discover exciting content across different categories
              </p>
            </div>

            {/* Category Section */}
            <CategorySection
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
            />

            {/* ENHANCED Explore Content with No Content Handling */}
            {isLoading && exploreItems.length === 0 ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading {activeCategory.toLowerCase()} content...</p>
              </div>
            ) : error ? (
              <div className={styles.errorContainer}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.errorIcon}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Unable to load content</h3>
                <p>Error loading explore data: {error}</p>
                <button 
                  className={styles.retryButton}
                  onClick={() => fetchExploreContent(activeCategory, 1)}
                >
                  Try Again
                </button>
              </div>
            ) : noContentMessage ? (
              // NEW: Enhanced no content message with homepage redirect
              <div className={styles.noContentContainer}>
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.noContentIcon}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                <h3 className={styles.noContentTitle}>{noContentMessage.title}</h3>
                <p className={styles.noContentDescription}>{noContentMessage.description}</p>
                <p className={styles.noContentSuggestion}>{noContentMessage.suggestion}</p>
                <div className={styles.noContentActions}>
                  <button 
                    className={styles.createDiscussionButton}
                    onClick={() => {
                      // Redirect to homepage where users can create discussions
                      router.push('/home');
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Create First Discussion
                  </button>
                  <button 
                    className={styles.exploreOtherButton}
                    onClick={() => handleCategoryChange('Trending')}
                  >
                    Explore Trending Instead
                  </button>
                </div>
              </div>
            ) : exploreItems.length === 0 ? (
              // Fallback for any other empty state
              <div className={styles.noContentContainer}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.noContentIcon}>
                  <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
                  <line x1="12" y1="12" x2="12" y2="12.01"></line>
                  <path d="M8 12h.01"></path>
                  <path d="M16 12h.01"></path>
                </svg>
                <h3 className={styles.noContentTitle}>No content found</h3>
                <p className={styles.noContentText}>We couldn't find any discussions for this category.</p>
              </div>
            ) : (
              // Show the actual content
              <>
                <ExploreSection
                  title={`${activeCategory} Content`}
                  items={exploreItems}
                />

                {/* Load more button */}
                {hasMore && (
                  <div className={styles.loadMoreContainer}>
                    <button
                      className={styles.loadMoreButton}
                      onClick={handleLoadMore}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className={styles.loadingSpinnerSmall}></div>
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Your existing right sidebar components */}
        <ExploreRightSidebarToggle
          isRightSidebarVisible={isRightSidebarVisible}
          handleRightSidebarToggle={handleRightSidebarToggle}
          sidebarWidth={rightSidebarWidth}
        />

        <ExploreRightSidebar
          user={userWithFallback}
          isRightSidebarVisible={isRightSidebarVisible}
          isMobileView={isMobileView}
          onClose={handleRightSidebarToggle}
          onWidthChange={handleRightSidebarWidthChange}
        />
      </div>
    </div>
  );
}