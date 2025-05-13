import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './ProfileResultItem.module.css';

const ProfileResultItem = ({ profile, viewMode, currentUser }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingFollow, setIsCheckingFollow] = useState(true);
  const router = useRouter();

  // Safely extract profile data with fallbacks
  const {
    _id,
    name = 'User',
    username = '',
    avatar,
    profilePicture, // Added to extract profile picture
    followers,
    discussionCount,
    bio
  } = profile || {};

  // Extract current user data with fallbacks
  const currentUserName = currentUser?.name || 'User';
  const currentUserUsername = currentUser?.username || '';
  const currentUserId = currentUser?._id || currentUser?.id || '';

  // Use real data or fallbacks for counts
  const followerCount = followers || 0;
  const discussions = discussionCount || 0;

  // Use username for initial if available, otherwise fallback to name
  const displayUsername = username || (name || '').toLowerCase().replace(/\s+/g, '_');

  // Generate consistent color based on username
  const generateColorFromUsername = (username) => {
    if (!username) return '#3b5fe2'; // Default blue color

    // Simple hash function for consistent color generation
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

  // Improved current user detection with more checks
  const isCurrentUserProfile = Boolean(currentUser) && Boolean(profile) && (
    // Compare by username (case insensitive) - with null checks
    (currentUserUsername && username && 
      currentUserUsername.toLowerCase() === username.toLowerCase()) ||
    // Compare by ID - with null checks and toString fallbacks
    (currentUserId && _id && 
      String(currentUserId) === String(_id))
  );

  // Check if the current user is following this profile on component mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUserId || isCurrentUserProfile) {
        setIsCheckingFollow(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsCheckingFollow(false);
          return;
        }

        const response = await fetch(`/api/users/follow/check?targetId=${_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.isFollowing || false);
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      } finally {
        setIsCheckingFollow(false);
      }
    };

    checkFollowStatus();
  }, [_id, currentUserId, isCurrentUserProfile]);

  // Toggle follow state with improved error handling
  const handleFollowToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isCurrentUserProfile) return; // Don't allow following yourself
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please log in to follow users');
        setIsLoading(false);
        return;
      }
      
      const action = isFollowing ? 'unfollow' : 'follow';
      
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          userId: _id, // Send the ID directly
          username: username, // Also send username as fallback
          action
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setIsFollowing(result.isFollowing);
        console.log(`${action === 'follow' ? 'Followed' : 'Unfollowed'} ${username}`);
      } else {
        const errorData = await response.json();
        console.error('Follow error:', errorData.message);
        alert(`Failed to ${action}: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error during follow action:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Improved view profile handler
  const handleViewProfile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get safe username to use in URL - multiple fallbacks
    const safeUsername = username || 
                         (name || '').toLowerCase().replace(/\s+/g, '_') ||
                         'user';
    
    if (isCurrentUserProfile) {
      // Navigate to current user profile with ID if available
      if (_id) {
        router.push(`/currentprofile/${safeUsername}?id=${_id}`);
      } else {
        router.push(`/currentprofile/${safeUsername}`);
      }
    } else {
      // Navigate to other user profile with ID for more reliable lookup
      if (_id) {
        router.push(`/otheruserprofile/${safeUsername}?id=${_id}`);
      } else {
        router.push(`/otheruserprofile/${safeUsername}`);
      }
    }
  };

  // Get the profile picture from either avatar or profilePicture property
  const profilePictureUrl = avatar || profilePicture || '/profile-placeholder.jpg';
  const isDefaultProfilePicture = profilePictureUrl === '/profile-placeholder.jpg' || 
                                 profilePictureUrl === '/api/placeholder/64/64';

  return (
    <div 
      className={`${styles.card} ${viewMode === 'list' ? styles.listView : ''}`}
    >
      <div className={styles.profileContent}>
        <div className={styles.profileHeader}>
          <h3 className={styles.profileName}>{name || 'User'}</h3>
          <p className={styles.profileUsername}>@{username || (_id && _id.slice(-8)) || 'username'}</p>
        </div>
        
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{followerCount}</div>
            <div className={styles.statLabel}>Followers</div>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{discussions}</div>
            <div className={styles.statLabel}>forums</div>
          </div>
        </div>
        
        {/* Modified profileImage section to match the CurrentProfileHeader style */}
        <div className={styles.profileImage}>
          {!isDefaultProfilePicture ? (
            <Image 
              src={profilePictureUrl} 
              alt={`${name}'s profile`}
              width={96}
              height={96}
              className={`${styles.avatar} ${isLoading ? styles.loadingImage : ''}`}
            />
          ) : (
            <div 
              className={`${styles.profileInitial} ${isLoading ? styles.loadingImage : ''}`}
              style={{ backgroundColor: generateColorFromUsername(displayUsername) }}
            >
              <span>
                {displayUsername ? displayUsername.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
          )}
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner}></div>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.actionContainer} onClick={(e) => e.stopPropagation()}>
        {/* Always show View Profile button */}
        <button 
          onClick={handleViewProfile}
          className={styles.viewButton}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          View
        </button>
        
        {/* Only show Follow button for other users and if not already following */}
        {!isCurrentUserProfile && !isCheckingFollow && (
          <button 
            className={`${styles.followButton} ${isFollowing ? styles.following : ''}`}
            onClick={handleFollowToggle}
            disabled={isLoading}
          >
            {isLoading ? (
              'Loading...'
            ) : isFollowing ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
                Following
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                Follow
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileResultItem;