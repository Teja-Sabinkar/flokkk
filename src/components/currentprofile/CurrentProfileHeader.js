import React, { useState, useRef, useEffect } from 'react';
import styles from './CurrentProfileHeader.module.css';
import Image from 'next/image';
import Link from 'next/link';
import EditProfileModal from './EditProfileModal';

// Debug function to log profile data
const debugProfileData = (data) => {
  console.log('Profile Data:', {
    username: data.username,
    banner: data.profileBanner,
    picture: data.profilePicture
  });
};

const CurrentProfileHeader = ({
  isCurrentUser = true, // Default to true to force showing Edit Profile
  profileData = {
    username: 'User',
    usertag: '@user',
    subscribers: '0',
    discussions: '0',
    bio: 'Welcome to our channel!',
    location: '',
    website: '',
    profilePicture: '/profile-placeholder.jpg',
    profileBanner: '',
    socialLinks: []
  },
  saveToDatabase = async (data) => {
    // This would be replaced with your actual database saving logic
    console.log("Saving to database:", data);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },
  isLoading = false
}) => {
  const [bioExpanded, setBioExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bioExceedsHeight, setBioExceedsHeight] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const bioRef = useRef(null);

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

  const openEditModal = () => {
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setIsModalOpen(false);
  };

  // Handle profile updates
  const handleSaveProfile = async (updatedData) => {
    try {
      setSaveError(null);
      const result = await saveToDatabase(updatedData);

      if (!result.success) {
        throw new Error(result.error?.message || "Failed to save changes");
      }

      return { success: true };
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveError(error.message || "Failed to save changes. Please try again.");

      // Clear error after 5 seconds
      setTimeout(() => setSaveError(null), 5000);

      return { success: false, error };
    }
  };

  // Debug profile data on render
  useEffect(() => {
    debugProfileData(profileData);
  }, [profileData]);

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
      {/* Profile Banner */}
      <div
        className={`${styles.profileBanner} ${isLoading ? styles.loading : ''}`}
        style={profileData.profileBanner ? {
          backgroundImage: `url(${profileData.profileBanner})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        {isLoading && (
          <div className={styles.bannerLoadingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        )}

        {/* Fallback method to display banner */}
        {profileData.profileBanner && (
          <div className={styles.bannerDebug}>
            <img
              src={profileData.profileBanner}
              alt="Profile Banner"
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
            />
          </div>
        )}
      </div>

      {/* Error message display */}
      {saveError && (
        <div className={styles.errorMessage}>
          {saveError}
        </div>
      )}

      <div className={styles.profileContent}>
        {/* Profile Picture */}
        <div className={styles.profilePictureContainer}>
          {profileData.profilePicture && profileData.profilePicture !== '/profile-placeholder.jpg' ? (
            <Image
              src={profileData.profilePicture}
              alt={`${profileData.username}'s profile picture`}
              width={100}
              height={100}
              className={`${styles.profilePicture} ${isLoading ? styles.loadingImage : ''}`}
            />
          ) : (
            <div
              className={`${styles.profileInitial} ${isLoading ? styles.loadingImage : ''}`}
              style={{ backgroundColor: generateColorFromUsername(profileData.username) }}
            >
              <span>
                {profileData.username ? profileData.username.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
          )}
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner}></div>
            </div>
          )}
        </div>

        <div className={styles.profileInfo}>
          {/* User Info Section */}
          <div className={styles.userInfoHeader}>
            <div className={styles.usernameContainer}>
              <h1 className={styles.username}>{profileData.username}</h1>
              <span className={styles.usertag}>{profileData.usertag}</span>
            </div>

            <div className={styles.actionButtons}>
              {isCurrentUser ? (
                <button
                  className={styles.editProfileButton}
                  onClick={openEditModal}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Edit Profile'}
                </button>
              ) : (
                <button
                  className={styles.subscribeButton}
                  disabled={isLoading}
                >
                  Subscribe
                </button>
              )}
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
              {profileData.bio || 'No bio yet.'}
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

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isModalOpen}
        onClose={closeEditModal}
        profileData={profileData}
        onSave={handleSaveProfile}
      />
    </div>
  );
};

export default CurrentProfileHeader;