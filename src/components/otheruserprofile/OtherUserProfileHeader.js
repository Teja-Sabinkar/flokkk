import React, { useState, useRef, useEffect } from 'react';
import styles from './OtherUserProfileHeader.module.css';
import Image from 'next/image';
import Link from 'next/link';

const OtherUserProfileHeader = ({
  profileData = {
    username: 'User',
    usertag: '@user',
    subscribers: '0',
    discussions: '0',
    bio: '',
    location: '',
    website: '',
    profilePicture: '/profile-placeholder.jpg',
    profileBanner: '',
    socialLinks: [],
    isFollowing: false,
    canViewProfile: true
  },
  handleSubscribe,
  isSubscribed
}) => {
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioExceedsHeight, setBioExceedsHeight] = useState(false);
  const [localIsSubscribed, setLocalIsSubscribed] = useState(isSubscribed || profileData.isFollowing || false);
  const [isLoading, setIsLoading] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  const bioRef = useRef(null);

  // Update local state when props change
  useEffect(() => {
    setLocalIsSubscribed(isSubscribed || profileData.isFollowing || false);
  }, [isSubscribed, profileData.isFollowing]);

  // Check if bio text exceeds the visible height
  useEffect(() => {
    const checkBioHeight = () => {
      if (bioRef.current) {
        const element = bioRef.current;
        // If scrollHeight > clientHeight, content is being clipped
        setBioExceedsHeight(element.scrollHeight > element.clientHeight);
      }
    };

    // Run the check after render and any time the bio text changes
    checkBioHeight();

    // Also add a window resize listener for responsive layouts
    window.addEventListener('resize', checkBioHeight);
    return () => window.removeEventListener('resize', checkBioHeight);
  }, [profileData.bio]);

  const toggleBio = () => {
    setBioExpanded(!bioExpanded);
  };

  const toggleSubscribe = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Please log in to subscribe to users');
        setIsLoading(false);
        return;
      }

      // Add detailed debug logging
      console.log('Profile Data:', {
        fullObject: profileData,
        username: profileData?.username,
        usertag: profileData?.usertag,
        id: profileData?.id,
        name: profileData?.name
      });

      // Check if profile data is available
      if (!profileData) {
        console.error('Profile data is undefined');
        alert('Unable to subscribe - missing profile data');
        setIsLoading(false);
        return;
      }

      // Prefer using ID if available (most reliable)
      const userId = profileData.id;

      // Get username safely with fallback options
      let usernameToUse = null;

      if (profileData.username) {
        usernameToUse = profileData.username;
      } else if (profileData.name) {
        usernameToUse = profileData.name;
      } else if (profileData.usertag) {
        usernameToUse = profileData.usertag.startsWith('@') ?
          profileData.usertag.substring(1) : profileData.usertag;
      }

      if (!userId && !usernameToUse) {
        console.error('Unable to determine user identity', profileData);
        alert('Unable to subscribe - could not determine user');
        setIsLoading(false);
        return;
      }

      console.log('Attempting to follow user:', { userId, username: usernameToUse });

      const action = localIsSubscribed ? 'unfollow' : 'follow';

      // Call the handleSubscribe function passed from parent component
      if (handleSubscribe) {
        await handleSubscribe(!localIsSubscribed);
      } else {
        // Default implementation if no handler is provided
        const response = await fetch('/api/users/follow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId,              // Send ID if available
            username: usernameToUse, // Send username as backup
            action
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to update subscription';

          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error('Error parsing error response:', errorText);
          }

          throw new Error(errorMessage);
        }

        const result = await response.json();
        setLocalIsSubscribed(result.isFollowing);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Failed to update subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle banner image loading error
  const handleBannerError = () => {
    console.log('Banner image failed to load');
    setBannerError(true);
  };

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

  return (
    <div className={styles.profileHeaderContainer}>
      {/* Profile Banner - Improved implementation */}
      <div className={styles.profileBanner}>
        {profileData.profileBanner && !bannerError ? (
          <Image
            src={profileData.profileBanner}
            alt="Profile banner"
            layout="fill"
            objectFit="cover"
            priority={true}
            unoptimized={true}
            key={`profile-banner-${profileData.username || profileData.id || Date.now()}-${profileData.profileBanner}`} // Force re-render when image changes
            onError={handleBannerError}
            className={styles.bannerImage}
          />
        ) : (
          <div className={styles.defaultBanner}></div>
        )}
      </div>

      <div className={styles.profileContent}>
        {/* Profile Picture */}
        <div className={styles.profilePictureContainer}>
          {profileData.profilePicture && profileData.profilePicture !== '/profile-placeholder.jpg' ? (
            <Image
              src={profileData.profilePicture}
              alt={`${profileData.username || profileData.name || 'User'}'s profile picture`}
              width={100}
              height={100}
              className={styles.profilePicture}
              priority
              unoptimized
              key={profileData.profilePicture} // Force re-render when URL changes
            />
          ) : (
            <div
              className={styles.profileInitial}
              style={{
                backgroundColor: generateColorFromUsername(profileData.username || profileData.name || 'User')
              }}
            >
              <span>
                {profileData.username ? profileData.username.charAt(0).toUpperCase() :
                  (profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U')}
              </span>
            </div>
          )}
        </div>

        <div className={styles.profileInfo}>
          {/* User Info Section */}
          <div className={styles.userInfoHeader}>
            <div className={styles.usernameContainer}>
              <h1 className={styles.username}>
                {profileData.username || profileData.name || 'User'}
              </h1>
              <span className={styles.usertag}>
                {profileData.usertag || `@${profileData.username || profileData.name || 'user'}`}
              </span>
            </div>

            <div className={styles.actionButtons}>
              <button
                className={`${styles.subscribeButton} ${localIsSubscribed ? styles.subscribedButton : ''}`}
                onClick={toggleSubscribe}
                disabled={isLoading}
              >
                {isLoading
                  ? 'Loading...'
                  : localIsSubscribed
                    ? 'Subscribed'
                    : 'Subscribe'}
              </button>
            </div>
          </div>

          {/* User Stats */}
          <div className={styles.userStats}>
            <span className={styles.statItem}>
              <span className={styles.statValue}>{profileData.subscribers}</span> subscribers
            </span>
            <span className={styles.statItem}>
              <span className={styles.statValue}>{profileData.discussions}</span> forums
            </span>
          </div>

          {/* User Bio */}
          <div className={styles.userBio}>
            <p
              ref={bioRef}
              className={bioExpanded ? styles.expandedBio : styles.collapsedBio}
            >
              {profileData.bio || 'No bio available.'}
            </p>

            {/* Only show buttons when content actually exceeds the container */}
            {bioExceedsHeight && (
              <button className={styles.showMoreButton} onClick={toggleBio}>
                {bioExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {/* Location & Website (if available) */}
          {(profileData.location || profileData.website) && (
            <div className={styles.userDetails}>
              {profileData.location && (
                <div className={styles.detailItem}>
                  <span>{profileData.location}</span>
                </div>
              )}

              {profileData.website && (
                <div className={styles.detailItem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <a href={profileData.website} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                    {profileData.website.replace(/(^\w+:|^)\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtherUserProfileHeader;