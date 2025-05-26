'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import HomeFeed from '@/components/home/HomeFeed';
import ClaudeSidebar from '@/components/ai/ClaudeSidebar';
import styles from './page.module.css';

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(330);
  const [initialX, setInitialX] = useState(0);
  const [initialWidth, setInitialWidth] = useState(0);

  // Add state for right sidebar visibility and mobile view detection
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(() => {
    // Initially visible only if screen width >= 1300px (desktop)
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1300;
    }
    return true; // Default to true for SSR
  });
  const [isMobileView, setIsMobileView] = useState(false);

  const containerRef = useRef(null);

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

  // Define the right sidebar toggle function
  const handleRightSidebarToggle = () => {
    setIsRightSidebarVisible(!isRightSidebarVisible);
  };

  // Update CSS variable when sidebar width changes
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${rightSidebarWidth}px`);
  }, [rightSidebarWidth]);

  // Resize functionality for right sidebar
  const startResizing = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Store initial positions
    setInitialX(e.clientX);
    setInitialWidth(rightSidebarWidth);

    // Update state
    setIsResizing(true);

    // Apply global styles
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Add a debug class to the body
    document.body.classList.add('resizing-active');
  };

  // Listen for mouse events during resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      // Calculate the width from the window width, not relative to the parent
      const windowWidth = window.innerWidth;
      const newWidth = windowWidth - e.clientX;

      // Apply constraints
      const minWidth = 250;
      const maxWidth = Math.min(600, windowWidth * 0.4);
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

      // Update state
      setRightSidebarWidth(constrainedWidth);

      // Store the width in localStorage
      localStorage.setItem('rightSidebarWidth', constrainedWidth.toString());
    };

    const handleMouseUp = () => {
      if (!isResizing) return;

      // Clean up
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.classList.remove('resizing-active');
    };

    // Only add listeners when resizing is active
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    // Clean up
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, rightSidebarWidth]);

  // Load saved width on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('rightSidebarWidth');
    if (savedWidth) {
      setRightSidebarWidth(Number(savedWidth));
    }
  }, []);

  // HomePage-specific context for ClaudeSidebar
  const homePageContext = {
    isHomePage: true,
    pageType: 'home',
    hasRecentlyViewed: true,
    specialBehavior: {
      emphasizeFeed: true,
      prioritizeDiscovery: true,
      includeCreationPrompts: true
    }
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

        {/* Right sidebar toggle button - Only visible on mobile */}
        {isMobileView && (
          <button
            className={`${styles.rightSidebarToggle} ${isRightSidebarVisible ? styles.active : ''}`}
            onClick={handleRightSidebarToggle}
            aria-label="Toggle AI sidebar"
          >
            <span className={styles.aiText}>flock</span>
          </button>
        )}

        {/* Right sidebar with ClaudeSidebar integrated with Home Page specific elements */}
        <div
          className={`${styles.rightSidebarContainer} ${isRightSidebarVisible ? styles.visible : ''}`}
          ref={containerRef}
          style={{
            width: `${rightSidebarWidth}px`,
            minWidth: `${rightSidebarWidth}px`,
            maxWidth: `${rightSidebarWidth}px`
          }}
        >
          {/* Resize handle like in Discussion page */}
          <div
            className={`${styles.resizeHandle} ${isResizing ? styles.isResizing : ''}`}
            onMouseDown={startResizing}
            title="Drag to resize"
          >
            <div className={styles.resizeBar}></div>
          </div>

          <div className={styles.rightSidebarScrollable}>
            {/* ClaudeSidebar with HomePage-specific context - all elements now handled internally */}
            <ClaudeSidebar 
              user={userWithFallback}
              containerRef={containerRef}
              rightSidebarWidth={rightSidebarWidth}
              isResizing={isResizing}
              startResizing={startResizing}
              homePageContext={homePageContext}
              hideDefaultGreeting={false}
              hideRecentlyViewed={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}