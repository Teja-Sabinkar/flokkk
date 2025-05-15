// Updated Header.js with real-time notification fetching and search functionality
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './Header.module.css';

export default function Header({ user, onMenuToggle, isMobileMenuOpen }) {
  const router = useRouter();

  // Process the user data correctly - ensure all required fields are present
  const userProfile = user ? {
    name: user.name || 'User',
    username: user.username || user.name || 'user',
    avatar: user.profilePicture || null,  // Change to use profilePicture instead
    notifications: user.notifications || 0,
    _id: user._id || null
  } : {
    name: 'Guest',
    username: 'guest',
    avatar: null,
    notifications: 0
  };

  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // Dropdowns state
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Notification states
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Add dropdown refs
  const searchDropdownRef = useRef(null);
  const createDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  // Debounce search
  const searchTimeoutRef = useRef(null);

  // Fetch recent notifications when dropdown is opened
  useEffect(() => {
    if (isNotificationDropdownOpen) {
      fetchRecentNotifications();
    }
  }, [isNotificationDropdownOpen]);

  // Fetch notification count on initial load
  useEffect(() => {
    fetchUnreadNotificationCount();
  }, []);

  // Function to fetch recent notifications for the dropdown
  const fetchRecentNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Fetch the 4 most recent notifications
      const response = await fetch('/api/notifications?limit=4', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setRecentNotifications(data.notifications || []);

      // Update unread count as well
      setUnreadCount(data.counts?.unread || 0);

    } catch (error) {
      console.error('Error fetching recent notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Function to fetch just the unread notification count
  const fetchUnreadNotificationCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications?limit=1', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification count');
      }

      const data = await response.json();
      setUnreadCount(data.counts?.unread || 0);

    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  // Format date to relative time
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  // Get icon for notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        );
      case 'reply':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        );
      case 'follow':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
        );
      case 'new_post':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        );
      case 'contribution':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        );
    }
  };

  // Get notification style class based on type
  const getNotificationIconClass = (type) => {
    switch (type) {
      case 'like': return styles.likeIcon;
      case 'reply': return styles.commentIcon;
      case 'follow': return styles.followIcon;
      case 'new_post': return styles.postIcon;
      case 'contribution': return styles.contributionIcon;
      default: return '';
    }
  };

  // Handle search input changes
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length > 2) {
      // Show loading state
      setIsSearching(true);
      setIsSearchDropdownOpen(true);

      // Debounce the API call (300ms)
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else {
      setIsSearchDropdownOpen(false);
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // Perform search API call
  const performSearch = async (query) => {
    try {
      // Ensure we pass the authorization header for proper user identification
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { headers });
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      // Filter ONLY PROFILES to remove current user's profile (not posts)
      const filteredResults = data.results.filter(result => {
        // If it's not a profile, keep it (we want to show current user's posts)
        if (result.type !== 'profile') return true;

        // If it's a profile, check if it's the current user
        const isCurrentUser = userProfile && (
          // Compare by ID (most reliable)
          (userProfile._id && result._id &&
            userProfile._id.toString() === result._id.toString()) ||
          // Compare by username as fallback
          (userProfile.username && result.username &&
            userProfile.username.toLowerCase() === result.username.toLowerCase()) ||
          // Last check - if result ID matches user ID in any form
          (userProfile.id && result._id &&
            userProfile.id.toString() === result._id.toString())
        );

        // Keep only if NOT current user's profile
        return !isCurrentUser;
      });

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim().length > 0) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchDropdownOpen(false);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lastSearch', Date.now().toString());
      }
    }
  };

  // Handle clicking a search result
  const handleSearchResultClick = (result) => {
    setIsSearchDropdownOpen(false);

    console.log('Search result clicked:', result);

    if (result.type === 'post') {
      // For discussions/posts, extract the ID and navigate with query parameter format
      const discussionId = result._id.toString();

      // Log the navigation action
      console.log(`Navigating to discussion with ID: ${discussionId}`);

      // Use query parameter format instead of path parameter
      router.push(`/discussion?id=${discussionId}`);
    } else if (result.type === 'profile') {
      // Handle profile navigation (unchanged)
      const safeUsername = result.username || `user_${result._id.slice(-8)}`;

      // Check if this is the current user
      const isCurrentUser = userProfile && (
        (userProfile._id && result._id &&
          userProfile._id.toString() === result._id.toString()) ||
        (userProfile.username && result.username &&
          userProfile.username.toLowerCase() === result.username.toLowerCase())
      );

      if (isCurrentUser) {
        router.push(`/currentprofile/${userProfile.username || ''}`);
      } else {
        router.push(`/otheruserprofile/${safeUsername}?id=${result._id}`);
      }
    }
  };

  const handleMenuToggle = () => {
    if (onMenuToggle) {
      onMenuToggle();
    }
  };

  const toggleCreateDropdown = () => {
    setIsCreateDropdownOpen(!isCreateDropdownOpen);
    if (!isCreateDropdownOpen) {
      setIsNotificationDropdownOpen(false);
      setIsProfileDropdownOpen(false);
      setIsSearchDropdownOpen(false);
    }
  };

  const toggleNotificationDropdown = () => {
    setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
    if (!isNotificationDropdownOpen) {
      setIsCreateDropdownOpen(false);
      setIsProfileDropdownOpen(false);
      setIsSearchDropdownOpen(false);
    }
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    if (!isProfileDropdownOpen) {
      setIsCreateDropdownOpen(false);
      setIsNotificationDropdownOpen(false);
      setIsSearchDropdownOpen(false);
    }
  };

  // Handler for create discussion button
  const handleCreateDiscussion = () => {
    router.push('/home');
    setIsCreateDropdownOpen(false);
  };

  // Handler for create post button
  const handleCreatePost = () => {
    const username = userProfile.username || 'user';
    router.push(`/currentprofile/${username}?tab=community`);
    setIsCreateDropdownOpen(false);
  };

  // Handler for account profile button
  const handleAccountProfile = () => {
    const username = userProfile.username;
    console.log('Account profile clicked, redirecting to:', username);
    router.push(`/currentprofile/${username}`);
    setIsProfileDropdownOpen(false);
  };

  // Handler for sign out button
  const handleSignOut = async () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');

      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });

      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
        try {
          await fetch('/api/auth/signout', {
            method: 'POST',
            credentials: 'include'
          });
        } catch (e2) {
          console.log('Using client-side logout only');
        }
      }

      router.push('/login');

    } catch (error) {
      console.error('Error during sign out:', error);
      router.push('/login');
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    setIsNotificationDropdownOpen(false);

    // Navigate based on notification type
    switch (notification.type) {
      case 'new_post':
        // Check if this is a community post notification
        if (notification.onModel === 'CommunityPost') {
          // Redirect to the sender's profile community tab
          router.push(`/otheruserprofile/${notification.senderUsername}?tab=community`);
        } else {
          // For regular posts, continue with existing behavior
          router.push(`/discussion?id=${notification.relatedId}`);
        }
        break;
      case 'reply':
        router.push(`/discussion?id=${notification.relatedId}`);
        break;
      case 'follow':
        router.push(`/otheruserprofile/${notification.senderUsername}`);
        break;
      case 'like':
        // For likes/votes, we need special handling based on what was liked
        if (notification.onModel === 'Comment') {
          // For comment votes, redirect to our intermediate page that will find the right post
          router.push(`/comment-redirect?id=${notification.relatedId}`);
        } else {
          // For post votes, use relatedId directly
          router.push(`/discussion?id=${notification.relatedId}`);
        }
        break;
      case 'contribution':
        // For contribution notifications, check content to determine redirect
        if (notification.content && (
          notification.content.includes('approved your link contribution') ||
          notification.content.includes('declined your link contribution'))) {
          router.push(`/discussion?id=${notification.relatedId}`);
        } else {
          router.push(`/currentprofile/${userProfile.username}?tab=contributions`);
        }
        break;
      default:
        router.push('/notificationpage');
    }
  };

  // Add click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setIsSearchDropdownOpen(false);
      }
      if (createDropdownRef.current && !createDropdownRef.current.contains(event.target)) {
        setIsCreateDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setIsNotificationDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const generateColorFromUsername = (username) => {
    if (!username) return '#3b5fe2'; // Default blue color

    // Simple hash function to generate consistent colors for the same username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert hash to a hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }

    return color;
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        {/* Left section containing mobile menu button and logo */}
        <div className={styles.headerleftsection}>
          {/* Mobile menu toggle button */}
          <button
            className={styles.mobileMenuButton}
            onClick={handleMenuToggle}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>

          {/* Logo on the left */}
          <div className={styles.logoContainer}>
            <Link href="/home" className={styles.logo}>
              flock
            </Link>
          </div>
        </div>

        {/* Search bar in the middle */}
        <div className={styles.searchContainer} ref={searchDropdownRef}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              {isSearching ? (
                <span className={styles.searchLoader}></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              )}
            </button>
          </form>

          {/* Search results dropdown */}
          {isSearchDropdownOpen && (
            <div className={styles.searchDropdown}>
              {isSearching ? (
                <div className={styles.searchLoading}>
                  <span>Searching...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className={styles.searchResultsList}>
                  {/* Limit to showing maximum 5 results */}
                  {searchResults.slice(0, 5).map((result) => (
                    <div
                      key={`${result.type}-${result._id}`}
                      className={styles.searchResultItem}
                      onClick={() => handleSearchResultClick(result)}
                    >
                      {result.type === 'profile' && (
                        <div className={styles.searchResultProfile}>
                          <div className={styles.searchResultAvatar}>
                            {result.profilePicture ? (
                              // If profilePicture exists and is not the default placeholder
                              <Image
                                src={result.profilePicture}
                                alt={`${result.name}'s profile`}
                                width={32}
                                height={32}
                                className={styles.avatar}
                                priority
                                unoptimized
                              />
                            ) : (
                              <div
                                className={styles.avatarFallback}
                                style={{
                                  backgroundColor: generateColorFromUsername(result.username || result.name),
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '50%',
                                  color: 'white',
                                  fontWeight: 'bold'
                                }}
                              >
                                <span>
                                  {result.username
                                    ? result.username.charAt(0).toUpperCase()
                                    : (result.name ? result.name.charAt(0).toUpperCase() : 'U')}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className={styles.searchResultInfo}>
                            <div className={styles.searchResultTitle}>{result.name}</div>
                            <div className={styles.searchResultSubtitle}>
                              @{result.username || (result._id && result._id.slice(-8)) || 'user'}
                            </div>
                          </div>
                          <div className={styles.searchResultType}>Profile</div>
                        </div>
                      )}

                      {result.type === 'post' && (
                        <div className={styles.searchResultPost}>
                          <div className={styles.searchResultIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                          </div>
                          <div className={styles.searchResultInfo}>
                            <div className={styles.searchResultTitle}>{result.title}</div>
                            <div className={styles.searchResultSubtitle}>
                              {result.content}
                            </div>
                          </div>
                          <div className={styles.searchResultType}>Post</div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Always show View All when there are results */}
                  {searchQuery.trim().length > 0 && (
                    <div className={styles.searchViewAll} onClick={handleSearch}>
                      {searchResults.length > 5 ? (
                        <span>View all {searchResults.length} results for "{searchQuery}"</span>
                      ) : (
                        <span>View all results for "{searchQuery}"</span>
                      )}
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
              ) : searchQuery.trim().length > 0 ? (
                <div className={styles.searchNoResults}>
                  <p>No results found for "{searchQuery}"</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Right side elements */}
        <div className={styles.actionsContainer}>
          {/* Create button with dropdown */}
          <div className={styles.createContainer} ref={createDropdownRef}>
            <button
              className={styles.createButton}
              aria-label="Create new content"
              onClick={toggleCreateDropdown}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>

            {isCreateDropdownOpen && (
              <div className={styles.createDropdown}>
                <button
                  className={styles.dropdownItem}
                  onClick={handleCreateDiscussion}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.dropdownItemIcon}>
                    <path d="M3 3h18v13H9l-6 5V3z"></path>
                  </svg>
                  Create Discussion
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={handleCreatePost}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.dropdownItemIcon}>
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Create Post
                </button>
              </div>
            )}
          </div>

          {/* Notification bell with dropdown */}
          <div className={styles.notificationContainer} ref={notificationDropdownRef}>
            <button
              className={styles.notificationButton}
              aria-label="Notifications"
              onClick={toggleNotificationDropdown}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && (
                <span className={styles.notificationBadge}>
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationDropdownOpen && (
              <div className={styles.notificationDropdown}>
                <div className={styles.notificationHeader}>
                  <h3>Notifications</h3>
                  <Link href="/notificationpage" className={styles.seeAllLink}>See all</Link>
                </div>

                <div className={styles.notificationsList}>
                  {isLoadingNotifications ? (
                    <div className={styles.notificationLoading}>
                      <div className={styles.notificationLoadingSpinner}></div>
                      <p>Loading notifications...</p>
                    </div>
                  ) : recentNotifications.length > 0 ? (
                    recentNotifications.map(notification => (
                      <div
                        key={notification._id}
                        className={`${styles.notificationItem} ${!notification.read ? styles.unreadNotification : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={`${styles.notificationIcon} ${getNotificationIconClass(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className={styles.notificationContent}>
                          <p>
                            {notification.content}
                          </p>
                          <span className={styles.notificationTime}>
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.notificationEmpty}>
                      <p>No notifications yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile avatar with dropdown */}
          <div className={styles.profileContainer} ref={profileDropdownRef}>
            <button
              className={styles.profileButton}
              aria-label="User profile"
              onClick={toggleProfileDropdown}
            >
              <div className={styles.avatarContainer}>
                {userProfile.avatar && userProfile.avatar !== '/profile-placeholder.jpg' ? (
                  <Image
                    src={userProfile.avatar}
                    alt={`${userProfile.name}'s profile`}
                    width={32}
                    height={32}
                    className={styles.avatar}
                    priority
                    unoptimized
                    key={userProfile.avatar} // Force re-render when URL changes
                  />
                ) : (
                  <div
                    className={styles.avatarFallback}
                    style={{
                      backgroundColor: generateColorFromUsername(userProfile.username || userProfile.name)
                    }}
                  >
                    <span>{userProfile.username ? userProfile.username.charAt(0).toUpperCase() : userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}</span>
                  </div>
                )}
              </div>
            </button>

            {isProfileDropdownOpen && (
              <div className={styles.profileDropdown}>
                <div className={styles.profileDropdownMenu}>
                  {/* Optional: Add user info at the top of the dropdown */}

                  <button onClick={handleAccountProfile} className={styles.profileDropdownItem}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Account Profile</span>
                  </button>

                  <Link href="/settings" className={styles.profileDropdownItem}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    <span>Settings</span>
                  </Link>

                  <hr className={styles.profileDropdownDivider} />

                  <button
                    className={styles.profileDropdownItem}
                    onClick={handleSignOut}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}