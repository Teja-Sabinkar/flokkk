'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import SubscriptionsContainer from '@/components/subscriptions/SubscriptionsContainer';
import styles from './page.module.css';

// SubscriptionRightSidebar Component (duplicated from RecentlyViewedRightSidebar)
import { useRef, useCallback } from 'react';
import RotatingNewsContainer from '@/components/widgets/rotatingNewsContainer';
import QuickActions from '@/components/widgets/quickActions';
import AiChat from '@/components/aichat/AiChat';
import aiChatStyles from '@/components/aichat/AiChat.module.css';

const SubscriptionRightSidebar = ({
  user,
  isRightSidebarVisible = true,
  isMobileView = false,
  onClose,
  onWidthChange
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(330);

  // Chat related states
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Check if there are any user messages to determine header visibility
  const hasUserMessages = messages.some(message => message.type === 'user');

  // Handle quick action selection
  const handleQuickAction = useCallback((action) => {
    switch (action) {
      case 'explore':
        window.location.href = '/explore';
        break;
      case 'trending':
        console.log('Trending action selected');
        break;
      case 'create':
        window.location.href = '/home';
        break;
      default:
        break;
    }
  }, []);

  // Handle mobile close if provided
  const handleClose = useCallback(() => {
    if (onClose && isMobileView) {
      onClose();
    }
  }, [onClose, isMobileView]);

  // Update CSS variables when sidebar width changes
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${rightSidebarWidth}px`);
    document.documentElement.style.setProperty('--toggle-position', `${rightSidebarWidth + 15}px`);
  }, [rightSidebarWidth]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Resize functionality for right sidebar
  const startResizing = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';

    if (containerRef.current) {
      containerRef.current.style.pointerEvents = 'auto';
    }
  }, []);

  // Listen for mouse events during resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const windowWidth = window.innerWidth;
      const newWidth = windowWidth - e.clientX;
      const minWidth = 250;
      const maxWidth = Math.min(600, windowWidth * 0.4);
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

      setRightSidebarWidth(constrainedWidth);
      localStorage.setItem('rightSidebarWidth', constrainedWidth.toString());

      if (onWidthChange) {
        onWidthChange(constrainedWidth);
      }
    };

    const handleMouseUp = () => {
      if (!isResizing) return;

      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';

      if (containerRef.current) {
        containerRef.current.style.pointerEvents = '';
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  // Load saved width on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('rightSidebarWidth');
    if (savedWidth) {
      const width = Number(savedWidth);
      setRightSidebarWidth(width);
      if (onWidthChange) {
        onWidthChange(width);
      }
    }
  }, [onWidthChange]);

  // Function to handle AI chat submission
  const handleAiChatSubmit = async (message) => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: message,
          username: user?.username || 'Anonymous User'
        })
      };

      const response = await fetch('/api/ai/claude', requestOptions);

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded: ${errorData.message}`);
        }
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.response || "I'm sorry, I couldn't process your request."
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error('Error communicating with AI:', err);
      setError(err.message || 'Failed to get a response from Claude AI');

      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again later.'
      };

      setMessages(prev => [...prev, errorMessage]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon";
    } else if (hour >= 17 && hour < 21) {
      return "Good Evening";
    } else if (hour >= 21 && hour < 24) {
      return "Good Late Evening";
    } else {
      return "Good Early Morning";
    }
  };

  // Format username for greeting with larger time-based greeting (EXACT MATCH to RecentlyViewed)
  const getUserGreeting = () => {
    const username = user?.username || 'there';
    const timeGreeting = getTimeBasedGreeting();
    return `Hi @${username}<br/><span style="font-size: 2em; font-weight: 500;">${timeGreeting}</span>`;
  };

  // Add welcome message when component mounts or user changes (FIXED to match RecentlyViewed)
  useEffect(() => {
    console.log('Subscriptions inline component useEffect triggered - User object received:', user);

    // Don't create welcome message for fallback/guest users - wait for real user data
    if (!user || user.name === 'Guest' || user.username === 'Guest') {
      console.log('Skipping welcome message - waiting for real user data or user is Guest');
      return;
    }

    console.log('Creating welcome message with correct format for subscriptions page');

    // Use the same greeting format as RecentlyViewed page
    const welcomeMessage = {
      id: 1,
      type: 'system',
      content: getUserGreeting()
    };

    console.log('Subscriptions page welcome message:', welcomeMessage);

    setMessages([welcomeMessage]);
  }, [user]);


 
  return (
    <div
      className={`${styles.rightSidebarContainer} ${isRightSidebarVisible ? styles.visible : styles.hidden} ${isResizing ? styles.resizing : ''}`}
      ref={containerRef}
      data-width={rightSidebarWidth}
    >
      {/* Resize handle */}
      <div
        className={`${styles.resizeHandle} ${isResizing ? styles.isResizing : ''}`}
        onMouseDown={startResizing}
        title="Drag to resize"
      >
        <div className={styles.resizeBar}></div>
      </div>

      <div className={styles.sidebarContentWrapper}>
        {/* Main widgets area */}
        <div className={styles.widgetsArea}>
          <div className={styles.widgetsContainer}>
            <RotatingNewsContainer />
            <QuickActions onActionSelect={handleQuickAction} />

            {/* Display chat messages */}
            {messages.length > 0 && (
              <div className={styles.messagesContainer}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${aiChatStyles.chatMessage} ${aiChatStyles[message.type]}`}
                  >
                    <div className={aiChatStyles.messageContent} dangerouslySetInnerHTML={{ __html: message.content }}></div>
                  </div>
                ))}

                {isLoading && (
                  <div className={`${aiChatStyles.chatMessage} ${aiChatStyles.ai}`}>
                    <div className={aiChatStyles.typingIndicator}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Header text - only show when no user messages exist */}
        {!hasUserMessages && (
          <div className={styles.headerText}>
            <p className={styles.promptText}>Something on your mind?</p>
          </div>
        )}

        {/* AI Chat Component - Fixed at bottom */}
        <div className={styles.aiChatWrapper}>
          <AiChat onSubmit={handleAiChatSubmit} />
        </div>
      </div>
    </div>
  );
};

// SubscriptionRightSidebarToggle Component (duplicated from RecentlyViewedRightSidebarToggle)
const SubscriptionRightSidebarToggle = ({
  isRightSidebarVisible,
  handleRightSidebarToggle,
  sidebarWidth = 330
}) => {
  const [screenSize, setScreenSize] = useState('desktop');
  const [isReady, setIsReady] = useState(false);

  // Check for screen size breakpoints
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setScreenSize('small-mobile');
      } else if (width < 1300) {
        setScreenSize('mobile');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Set initial safe position and mark as ready
  useEffect(() => {
    document.documentElement.style.setProperty('--toggle-right-position', isRightSidebarVisible ? '320px' : '0px');

    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, [isRightSidebarVisible]);

  // Update positioning once ready and when dependencies change
  useEffect(() => {
    if (!isReady) return;

    let rightPosition;

    if (isRightSidebarVisible) {
      if (screenSize === 'small-mobile' || screenSize === 'mobile') {
        rightPosition = '320px';
      } else {
        rightPosition = `${sidebarWidth + 5}px`;
      }
    } else {
      rightPosition = '0px';
    }

    document.documentElement.style.setProperty('--toggle-right-position', rightPosition);
  }, [isRightSidebarVisible, sidebarWidth, screenSize, isReady]);

  // Determine CSS classes based on state
  const getToggleClasses = () => {
    let classes = [styles.rightSidebarToggle];

    if (isRightSidebarVisible) {
      classes.push(styles.active);
    }

    if (!isReady) {
      classes.push(styles.hidden);
    }

    return classes.join(' ');
  };

  return (
    <button
      className={getToggleClasses()}
      onClick={handleRightSidebarToggle}
      aria-label="Toggle subscriptions sidebar"
    >
      <span className={styles.aiText}>flokkk</span>
    </button>
  );
};

// Main Subscriptions Page Component
export default function SubscriptionsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'day', 'week', or 'month'
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Add state for right sidebar visibility and mobile view detection
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1300;
    }
    return true;
  });
  const [isMobileView, setIsMobileView] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(330);

  // Check for mobile view and update sidebar visibility
  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth < 1300;
      setIsMobileView(isMobile);
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
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
            userData.avatar = userData.avatar || userData.profilePicture || null;

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

  // Fetch subscriptions and feed
  useEffect(() => {
    const fetchSubscriptions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');

        if (token) {
          // Fetch user's subscriptions list using the dedicated subscriptions API
          // API returns: { subscriptions: [{ id, username, name, profilePicture, bio, followingSince, avatarColor }], pagination }
          const subscriptionsResponse = await fetch('/api/subscriptions/list?page=1&limit=20', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (subscriptionsResponse.ok) {
            const subscriptionsData = await subscriptionsResponse.json();
            setSubscriptions(subscriptionsData.subscriptions || []);
          }

          // Fetch subscription feed posts using the dedicated subscriptions feed API
          // API returns: { posts: [{ id, title, content, image, videoUrl, hashtags, discussions, shares, createdAt, updatedAt, username, name, profilePicture, userId }], pagination }
          const feedResponse = await fetch('/api/subscriptions/feed?page=1&limit=20', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (feedResponse.ok) {
            const feedData = await feedResponse.json();
            setFeedPosts(feedData.posts || []);
            setHasMore(feedData.pagination?.totalPages > 1 || false);
          }
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  // Load more posts function
  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const nextPage = currentPage + 1;

      const response = await fetch(`/api/subscriptions/feed?page=${nextPage}&limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFeedPosts(prev => [...prev, ...(data.posts || [])]);
        setHasMore(data.pagination?.page < data.pagination?.totalPages || false);
        setCurrentPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setIsLoading(false);
    }
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

  // Filter items based on time period and search
  const getFilteredPosts = () => {
    let filtered = feedPosts;

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      let cutoffDate;

      switch (timeFilter) {
        case 'day':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(post => {
        const postDate = new Date(post.createdAt);
        return postDate >= cutoffDate;
      });
    }

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(post => {
        const contentMatch =
          (post.title && post.title.toLowerCase().includes(lowerQuery)) ||
          (post.content && post.content.toLowerCase().includes(lowerQuery));

        const usernameMatch =
          (post.username && post.username.toLowerCase().includes(lowerQuery));

        return contentMatch || usernameMatch;
      });
    }

    return filtered;
  };

  // If no user data from API, provide a fallback
  const userWithFallback = user || {
    name: 'Guest',
    username: 'Guest',
    avatar: null,
    notifications: 0
  };

  const filteredPosts = getFilteredPosts();

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

        {/* Content area with subscriptions */}
        <div className={`${styles.contentContainer} ${!isRightSidebarVisible ? styles.expanded : ''}`}>
          <div className={styles.contentScrollable}>
            <div className={styles.pageHeader}>
              <h1>Subscriptions</h1>
              <p className={styles.pageDescription}>
                Latest content from creators you follow
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
                    placeholder="Search content or creators..."
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

            <SubscriptionsContainer
              subscriptions={subscriptions}
              feedPosts={filteredPosts}
              isLoading={isLoading && feedPosts.length === 0}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              viewMode={viewMode}
              isExpanded={!isRightSidebarVisible}
            />
          </div>
        </div>

        {/* Right sidebar toggle */}
        <SubscriptionRightSidebarToggle
          isRightSidebarVisible={isRightSidebarVisible}
          handleRightSidebarToggle={handleRightSidebarToggle}
          sidebarWidth={rightSidebarWidth}
        />

        {/* Right sidebar */}
        <SubscriptionRightSidebar
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