'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DiscussionPageHeader from '@/components/layout/DiscussionPageHeader/DiscussionPageHeader';
import DiscussionPageSidebarNavigation from '@/components/layout/DiscussionPageSidebarNavigation/DiscussionPageSidebarNavigation';
import {
  DiscussionPageLeftBar,
  DiscussionPageCenterBar,
  DiscussionPageRightBar
} from '@/components/discussionpage';
import styles from './page.module.css';

export default function DiscussionPage() {
  // Existing state
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(false);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  // Add state for right sidebar width
  const [rightBarWidth, setRightBarWidth] = useState(330);

  // Add state for right sidebar visibility toggle
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(false);

  // Listen for rightbar-resize events
  useEffect(() => {
    const handleRightBarResize = (e) => {
      setRightBarWidth(e.detail.width);
    };

    window.addEventListener('rightbar-resize', handleRightBarResize);

    // Load saved width from localStorage
    const savedWidth = localStorage.getItem('rightBarWidth');
    if (savedWidth) {
      setRightBarWidth(Number(savedWidth));
    }

    return () => {
      window.removeEventListener('rightbar-resize', handleRightBarResize);
    };
  }, []);


  // Get post ID from URL
  const searchParams = useSearchParams();
  const postId = searchParams.get('id');
  console.log('URL parameters:', Object.fromEntries(searchParams.entries()));
  console.log('Post ID from URL:', postId);

  // IMPORTANT: Add tracking functionality - this is new
  useEffect(() => {
    const trackView = async () => {
      if (!postId || !post) return;

      try {
        const token = localStorage.getItem('token');
        if (token) {
          console.log('Tracking view for post:', postId);
          await fetch('/api/recently-viewed/track', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ postId })
          });
          console.log('View tracked successfully');
        }
      } catch (error) {
        console.error('Error tracking view:', error);
        // Continue even if tracking fails
      }
    };

    // Only track after the post data has loaded
    if (post && !loading) {
      trackView();
    }
  }, [post, loading, postId]); // Run when post or loading state changes

  // Fetch post data when component mounts or postId changes
  useEffect(() => {
    const fetchPostData = async () => {
      if (!postId || hasFetched) {
        return;
      }

      try {
        setLoading(true);
        setHasFetched(true); // Mark as fetched to prevent duplicate requests
        console.log('Attempting to fetch post with ID:', postId);

        // Check if token exists
        const token = localStorage.getItem('token');
        console.log('Token available:', !!token);

        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await fetch(`/api/posts/${postId}`, { headers });
        console.log('Response status:', response.status);

        if (!response.ok) {
          // Get more detailed error information
          let errorDetail = '';
          try {
            const errorData = await response.json();
            errorDetail = errorData.message || '';
            console.error('Error response data:', errorData);
          } catch (e) {
            // If we can't parse JSON, try to get text
            errorDetail = await response.text();
            console.error('Error response text:', errorDetail);
          }

          throw new Error(`Failed to fetch post: ${response.status} - ${errorDetail}`);
        }

        const postData = await response.json();
        console.log('DiscussionPage: Post data fetched successfully:', {
          id: postData._id,
          title: postData.title,
          hasContent: !!postData.content
        });

        // Set the post state
        setPost(postData);
      } catch (error) {
        console.error('Detailed fetch error:', error);
        setError(error.message || 'Failed to load post data');
      } finally {
        setLoading(false);
      }
    };

    fetchPostData();
  }, [postId, hasFetched]);

  // Reset hasFetched when postId changes
  useEffect(() => {
    setHasFetched(false);
  }, [postId]);

  // Fetch current user data when component mounts
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) return;

        const userData = await response.json();
        setCurrentUser(userData);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Toggle left sidebar
  const handleLeftSidebarToggle = () => {
    // If right sidebar is open, close it first
    if (isRightSidebarVisible) {
      setIsRightSidebarVisible(false);
    }

    // Then toggle left sidebar
    setIsLeftSidebarVisible(!isLeftSidebarVisible);
  };

  // Toggle right sidebar
  const handleRightSidebarToggle = () => {
    // If left sidebar is open, close it first
    if (isLeftSidebarVisible) {
      setIsLeftSidebarVisible(false);
    }

    // Then toggle right sidebar
    setIsRightSidebarVisible(!isRightSidebarVisible);
  };

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }

      // Reset sidebar states when returning to large screens
      if (window.innerWidth > 1300) {
        setIsLeftSidebarVisible(false);
        setIsRightSidebarVisible(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

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

  // Mock user data - replace with actual user authentication in a real app
  const userMock = {
    name: 'User',
    avatar: null,
    notifications: 2,
  };

  return (
    <div className={styles.discussionPageContainer}>
      {/* Header component */}
      <DiscussionPageHeader
        user={userMock}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Main content area with sidebar and discussion */}
      <div className={styles.mainContent}>
        {/* Sidebar navigation */}
        <div className={styles.sidebarContainer}>
          <DiscussionPageSidebarNavigation isOpen={isMobileMenuOpen} />
        </div>

        {/* Discussion content containers */}
        <div className={`${styles.contentContainer} ${isMobileMenuOpen ? styles.menuOpen : ''}`}>
          {/* Left sidebar toggle button */}
          <button
            className={`${styles.leftSidebarToggle} ${isLeftSidebarVisible ? styles.active : ''}`}
            onClick={handleLeftSidebarToggle}
            aria-label="Toggle left sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          {/* Left sidebar with video and links */}
          <div className={`${styles.leftBarWrapper} ${isLeftSidebarVisible ? styles.visible : ''}`}>
            <div className={styles.leftBarContent}>
              <DiscussionPageLeftBar
                postData={post}
                loading={loading}
                error={error}
                currentUser={currentUser}
              />
            </div>
          </div>

          {/* Center content with discussion - Pass post data */}
          <div className={styles.centerBarWrapper}>
            <div className={styles.centerBarContent}>
              <DiscussionPageCenterBar
                postData={post}
                loading={loading}
                error={error}
                currentUser={currentUser}
              />
            </div>
          </div>

          {/* Right sidebar toggle button - UPDATED with A.I text */}
          <button
            className={`${styles.rightSidebarToggle} ${isRightSidebarVisible ? styles.active : ''}`}
            onClick={handleRightSidebarToggle}
            aria-label="Toggle AI sidebar"
          >
            <span className={styles.aiText}>flokkk</span>
          </button>

          {/* Right sidebar with AI and recommendations - UPDATED with rightBarWrapper class and visibility state */}
          <div
            className={`${styles.rightBarWrapper} rightBarWrapper ${isRightSidebarVisible ? styles.visible : ''}`}
            style={{
              width: `${rightBarWidth}px`,
              minWidth: `${rightBarWidth}px`,
              maxWidth: `${rightBarWidth}px`
            }}
          >
            <div className={styles.rightBarContent}>
              {post ? (
                <DiscussionPageRightBar postData={post} />
              ) : (
                <DiscussionPageRightBar />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}