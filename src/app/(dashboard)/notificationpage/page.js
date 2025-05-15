'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import {
  NotificationsContainer,
  NotificationsList
} from '@/components/notificationpage';
import styles from './page.module.css';

export default function NotificationsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [searchTerm, setSearchTerm] = useState('');
  const [counts, setCounts] = useState({
    all: 0,
    unread: 0,
    comments: 0,
    messages: 0,
    posts: 0
  });

  // Debug log when tab changes
  useEffect(() => {
    console.log(`Active tab set to: ${activeTab}`);
  }, [activeTab]);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setIsLoading(false);
        setError('You must be logged in to view notifications');
        return;
      }

      // Build query with active tab
      let url = '/api/notifications?';
      if (activeTab !== 'all') {
        url += `type=${activeTab}&`;
      }
      if (searchTerm) {
        url += `search=${encodeURIComponent(searchTerm)}&`;
      }

      console.log('Fetching notifications from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching notifications:', errorData);
        throw new Error(errorData.message || 'Failed to fetch notifications');
      }

      const data = await response.json();
      console.log('Notifications fetched:', data);

      setNotifications(data.notifications || []);
      setCounts(data.counts || {
        all: 0,
        unread: 0,
        comments: 0,
        messages: 0,
        posts: 0
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch notifications when tab or search changes
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          setIsLoading(false);
          setError('You must be logged in to view notifications');
          return;
        }

        // Build query with active tab
        let url = '/api/notifications?';
        if (activeTab !== 'all') {
          url += `type=${activeTab}&`;
        }
        if (searchTerm) {
          url += `search=${encodeURIComponent(searchTerm)}&`;
        }

        console.log('Fetching notifications from:', url);

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error fetching notifications:', errorData);
          throw new Error(errorData.message || 'Failed to fetch notifications');
        }

        const data = await response.json();
        console.log('Notifications fetched:', data);

        setNotifications(data.notifications || []);

        // Just set the counts directly from the API response
        setCounts(data.counts || {
          all: 0,
          unread: 0,
          comments: 0,
          messages: 0,
          posts: 0,
          contributions: 0,
          likes: 0,
          commentsUnread: 0,
          likesUnread: 0,
          postsUnread: 0,
          contributionsUnread: 0
        });
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setError(error.message || 'Failed to load notifications');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [activeTab, searchTerm]);

  // Mark all notifications as read
  const handleMarkAllAsRead = async (type = activeTab) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
    
      console.log('Marking all notifications as read, type:', type);
    
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: type === 'all' ? undefined : type })
        // When type is 'all', we pass undefined to the API which will mark ALL notifications as read
      });
    
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error marking notifications as read:', errorData);
        throw new Error(errorData.message || 'Failed to mark notifications as read');
      }
    
      console.log('Notifications marked as read, refreshing...');
      // Refresh notifications
      fetchNotifications(); // This will update the counts as well
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      setError(error.message || 'Failed to mark notifications as read');
    }
  };

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
          } else {
            console.error('Error fetching user data:', await response.text());
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

        {/* Content area */}
        <div className={styles.contentContainer}>
          <div className={styles.contentScrollable}>
            <NotificationsContainer
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              counts={counts}
            // Remove the onMarkAllRead prop
            >
              {error && (
                <div className={styles.errorMessage}>
                  <p>{error}</p>
                  <button onClick={fetchNotifications} className={styles.retryButton}>
                    Retry
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner}></div>
                  <p>Loading notifications...</p>
                </div>
              ) : (
                <NotificationsList
                  notifications={notifications}
                  activeTab={activeTab}
                  onNotificationUpdate={fetchNotifications}
                  currentUser={user} // Add this line to pass the user prop
                />
              )}
            </NotificationsContainer>
          </div>
        </div>




        {/* Content area */}
        <div className={styles.contentContainer}>
          <div className={styles.contentScrollable}>
            <NotificationsContainer
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              counts={counts}
              onMarkAllRead={handleMarkAllAsRead} // Pass the function here
            >
              {error && (
                <div className={styles.errorMessage}>
                  <p>{error}</p>
                  <button onClick={fetchNotifications} className={styles.retryButton}>
                    Retry
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner}></div>
                  <p>Loading notifications...</p>
                </div>
              ) : (
                <NotificationsList
                  notifications={notifications}
                  activeTab={activeTab}
                  onNotificationUpdate={fetchNotifications}
                  currentUser={user} // Add this line to pass the user prop
                />
              )}
            </NotificationsContainer>
          </div>
        </div>


      </div>
    </div>
  );
}