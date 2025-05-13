'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams, useParams } from 'next/navigation';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import { OtherUserProfileHeader, OtherUserProfileFooter } from '@/components/otheruserprofile';
import styles from './page.module.css';

export default function OtherUserProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const { username = 'username' } = params || {};
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize profile data state with loading state
  const [profileData, setProfileData] = useState({
    isLoading: true,
    error: null,
    data: {
      username: decodeURIComponent(username),
      usertag: `@${decodeURIComponent(username)}`,
      subscribers: '0',
      discussions: '0',
      bio: '',
      joinDate: '',
      website: '',
      location: '',
      profilePicture: '/profile-placeholder.jpg',
      profileBanner: '',
      socialLinks: [],
      canViewProfile: true
    }
  });

  // Handle subscription/follow
  const handleSubscribe = async (subscribe) => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('User must be logged in to subscribe');
        return;
      }

      // Use profile data from state if available
      const userData = profileData.data;
      
      console.log('Subscription data:', {
        profileData: userData,
        action: subscribe ? 'follow' : 'unfollow'
      });

      // Create the request payload with multiple identifiers
      const payload = {
        action: subscribe ? 'follow' : 'unfollow'
      };

      // Add userId if available (preferred method)
      if (userData.id) {
        payload.userId = userData.id;
      }
      
      // Also include username and name as backup
      if (userData.username) {
        payload.username = userData.username;
      } else if (userData.name) {
        payload.username = userData.name;
      }

      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setIsSubscribed(result.isFollowing);

        // Update subscriber count in profile data
        setProfileData(prev => ({
          ...prev,
          data: {
            ...prev.data,
            subscribers: result.followerCount.toString()
          }
        }));

        console.log(`${subscribe ? 'Subscribed to' : 'Unsubscribed from'} ${userData.username || userData.name}`);
      } else {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error('Error parsing response:', errorText);
          throw new Error('Failed to process subscription');
        }
        
        console.error('Subscription error:', errorData.message);
      }
    } catch (error) {
      console.error('Error during subscription:', error);
    }
  };

  // Fetch current user data
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

    // Fetch the current user data
    fetchUserData();
  }, []);

  // Fetch profile data of the user being viewed
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get the ID from query params if available and sanitize it
        let id = searchParams.get('id');
        
        // Check if userID is in another format - notification id param might be in a "sender" field
        if (!id) {
          id = searchParams.get('sender');
        }
        
        // Fix the [object Object] issue
        if (id === '[object Object]' || (id && id.includes('object'))) {
          console.log('Invalid ID parameter detected:', id);
          id = null;
        }
        
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Decode the username to ensure it's properly formatted
        const decodedUsername = decodeURIComponent(username);
        console.log(`Attempting to fetch profile for: ${decodedUsername}${id ? `, ID: ${id}` : ''}`);
        
        // Track if we should try all lookup methods
        let shouldTryAlternativeMethods = true;
        let userData = null;
        
        // -------------------------------------------------------------------------
        // APPROACH 1: Try the standard user endpoint with username
        // -------------------------------------------------------------------------
        if (shouldTryAlternativeMethods) {
          let apiUrl = `/api/users/${encodeURIComponent(decodedUsername)}`;
          if (id) {
            apiUrl += `?id=${id}`;
          }
          
          console.log(`Making API request to: ${apiUrl}`);
          
          const response = await fetch(apiUrl, { headers });
          
          if (response.ok) {
            userData = await response.json();
            console.log('Profile data received successfully using username:', userData);
            shouldTryAlternativeMethods = false; // We succeeded, no need to try other methods
          } else {
            console.error(`Profile fetch failed with status: ${response.status} ${response.statusText}`);
            console.error(`Failed URL: ${apiUrl}`);
          }
        }
        
        // -------------------------------------------------------------------------
        // APPROACH 2: If username failed and we have ID, try direct ID lookup
        // -------------------------------------------------------------------------
        if (shouldTryAlternativeMethods && id) {
          let apiUrl = `/api/users/profile?id=${id}`;
          console.log(`Trying alternative ID-only lookup: ${apiUrl}`);
          
          try {
            const response = await fetch(apiUrl, { headers });
            
            if (response.ok) {
              userData = await response.json();
              console.log('Profile data received successfully using ID-only lookup:', userData);
              shouldTryAlternativeMethods = false; // We succeeded, no need to try other methods
            } else {
              console.error(`ID-only lookup failed with status: ${response.status}`);
            }
          } catch (err) {
            console.error('Error in ID-only lookup:', err);
          }
        }
        
        // -------------------------------------------------------------------------
        // APPROACH 3: Try the search API to find the user
        // -------------------------------------------------------------------------
        if (shouldTryAlternativeMethods) {
          let searchUrl = `/api/search?q=${encodeURIComponent(decodedUsername)}&type=users`;
          console.log(`Trying search API fallback: ${searchUrl}`);
          
          try {
            const response = await fetch(searchUrl, { headers });
            
            if (response.ok) {
              const searchResults = await response.json();
              console.log('Search results:', searchResults);
              
              // Find a matching user in search results
              if (searchResults.users && searchResults.users.length > 0) {
                const matchingUser = searchResults.users.find(u => 
                  u.username.toLowerCase() === decodedUsername.toLowerCase() ||
                  (u.name && u.name.toLowerCase() === decodedUsername.toLowerCase())
                );
                
                if (matchingUser) {
                  console.log('Found matching user in search results:', matchingUser);
                  userData = matchingUser;
                  shouldTryAlternativeMethods = false;
                }
              }
            } else {
              console.error(`Search lookup failed with status: ${response.status}`);
            }
          } catch (err) {
            console.error('Error in search lookup:', err);
          }
        }

        // -------------------------------------------------------------------------
        // HANDLE FINAL RESULT
        // -------------------------------------------------------------------------
        if (userData) {
          // We found user data through one of our methods
          setProfileData({
            isLoading: false,
            error: null,
            data: {
              id: userData.id,
              username: userData.username,
              name: userData.name,
              usertag: userData.usertag,
              subscribers: userData.subscribers?.toString() || '0',
              discussions: userData.discussions?.toString() || '0',
              bio: userData.bio || '',
              joinDate: userData.joinDate || '',
              website: userData.website || '',
              location: userData.location || '',
              profilePicture: userData.profilePicture || '/profile-placeholder.jpg',
              profileBanner: userData.profileBanner || '',
              socialLinks: userData.socialLinks || [],
              canViewProfile: userData.canViewProfile,
              contentVisibility: userData.contentVisibility || {
                posts: 'public',
                playlists: 'public',
                community: 'public'
              }
            }
          });

          setIsSubscribed(userData.isFollowing || false);
          setIsLoading(false);
        } else {
          // All our lookup methods failed
          let errorMessage = `User "${decodedUsername}" was not found`;
          
          setError(errorMessage);
          setIsLoading(false);
          
          console.error('All profile lookup methods failed for username:', decodedUsername);
        }
      } catch (error) {
        console.error('Network error fetching profile data:', error);
        setError('Network error occurred. Please try again later.');
        setIsLoading(false);
      }
    };

    if (username) {
      fetchProfileData();
    }
  }, [username, searchParams]);

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

  // Get active tab from URL or default to 'home'
  const activeTab = searchParams?.get('tab') || 'home';

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

        {/* Content area with profile */}
        <div className={styles.contentContainer}>
          <div className={styles.contentScrollable}>
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
              </div>
            ) : error ? (
              <div className={styles.errorContainer}>
                <div className={styles.errorIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <h2 className={styles.errorTitle}>User Not Found</h2>
                <p className={styles.errorMessage}>{error}</p>
                <div className={styles.errorHelp}>
                  <p>The user you're looking for may have:</p>
                  <ul className={styles.errorHelpList}>
                    <li>Changed their username</li>
                    <li>Deleted their account</li>
                    <li>Never existed with this username</li>
                  </ul>
                </div>
                <div className={styles.errorActions}>
                  <button
                    className={styles.backButton}
                    onClick={() => window.history.back()}
                  >
                    Go Back
                  </button>
                  <button
                    className={styles.searchButton}
                    onClick={() => window.location.href = '/search'}
                  >
                    Search Users
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.profileContainer}>
                <OtherUserProfileHeader
                  profileData={profileData.data}
                  handleSubscribe={handleSubscribe}
                  isSubscribed={isSubscribed}
                />
                {profileData.data.canViewProfile ? (
                  <OtherUserProfileFooter
                    username={profileData.data.username || profileData.data.name}
                    profileData={profileData.data}
                    initialTab={activeTab} // Pass active tab to footer
                  />
                ) : (
                  <div className={styles.privateProfileMessage}>
                    <p>This profile is private. You need to follow this user to see their content.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}