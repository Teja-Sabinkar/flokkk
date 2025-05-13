'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams, useParams } from 'next/navigation';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import { CurrentProfileHeader, CurrentProfileFooter } from '@/components/currentprofile';
import styles from './page.module.css';

export default function CurrentProfilePage() {
  const params = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const { username = 'username' } = params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageKey, setImageKey] = useState(0); // Add this to force image refresh
  
  // Create a default profile data state for initial rendering
  const initialProfileData = {
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
    socialLinks: []
  };
  
  // State to manage profile data with updates from EditProfileModal
  const [profileData, setProfileData] = useState(initialProfileData);
  
  // Save profile data to database (API call)
  const saveToDatabase = async (updatedData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      // Handle file uploads if present
      if (updatedData.profilePicture || updatedData.profileBanner) {
        const formData = new FormData();
        
        // Add text data
        const profileDataToSend = { 
          bio: updatedData.bio,
          location: updatedData.location,
          website: updatedData.website,
          socialLinks: updatedData.socialLinks
        };
        formData.append('profileData', JSON.stringify(profileDataToSend));
        
        // Add files if they exist
        if (updatedData.profilePicture && updatedData.profilePicture instanceof File) {
          formData.append('profilePicture', updatedData.profilePicture);
        }
        
        if (updatedData.profileBanner && updatedData.profileBanner instanceof File) {
          formData.append('profileBanner', updatedData.profileBanner);
        }
        
        // Send multipart form data request
        const response = await fetch('/api/users/me/profile', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update profile');
        }
        
        // Get updated profile data
        const updatedProfileData = await response.json();
        
        // Update state with new data, including timestamp to force cache refresh
        setProfileData({
          ...updatedProfileData,
          profilePicture: updatedProfileData.profilePicture ? `${updatedProfileData.profilePicture}?t=${Date.now()}` : '/profile-placeholder.jpg',
          profileBanner: updatedProfileData.profileBanner ? `${updatedProfileData.profileBanner}?t=${Date.now()}` : ''
        });
        
        // Force image component to re-render
        setImageKey(prev => prev + 1);
        
      } else {
        // No file uploads, send regular JSON request
        const response = await fetch('/api/users/me/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            bio: updatedData.bio,
            location: updatedData.location,
            website: updatedData.website,
            socialLinks: updatedData.socialLinks
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update profile');
        }
        
        // Get updated profile data
        const updatedProfileData = await response.json();
        
        // Update state with new data
        setProfileData(updatedProfileData);
      }
      
      // Update user state as well if needed
      setUser(prev => ({
        ...prev,
        ...profileData
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(error.message || 'Failed to update profile');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Fetch current user data
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            
            // Check if this is the current user's profile
            const decodedUsername = decodeURIComponent(username);
            const currentUserUsername = userData.username || '';
            
            if (
              currentUserUsername.toLowerCase() === decodedUsername.toLowerCase() || 
              decodedUsername === 'username'
            ) {
              setIsCurrentUser(true);
              
              // If it's the current user, update profile data state
              setProfileData({
                username: userData.username || '',
                usertag: userData.usertag || `@${userData.username || ''}`,
                subscribers: userData.subscribers?.toLocaleString() || '0',
                discussions: userData.discussions?.toLocaleString() || '0',
                bio: userData.bio || '',
                joinDate: userData.joinDate || '',
                website: userData.website || '',
                location: userData.location || '',
                profilePicture: userData.profilePicture || '/profile-placeholder.jpg',
                profileBanner: userData.profileBanner || '',
                socialLinks: userData.socialLinks || []
              });
            } else {
              setIsCurrentUser(false);
              // If not the current user, we would load the other user's profile
              // This would be implemented in the "otheruserprofile" branch
            }
          } else {
            // Handle failed fetch
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch user data');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setError(error.message || 'Error loading profile');
        } finally {
          setIsLoading(false);
        }
      } else {
        // No token, user is not logged in
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [username]);

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
        
        {/* Content area with profile */}
        <div className={styles.contentContainer}>
          <div className={styles.contentScrollable}>
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}
            
            <div className={styles.profileContainer}>
              <CurrentProfileHeader 
                key={imageKey} // Add key to force re-render
                isCurrentUser={isCurrentUser}
                profileData={profileData}
                saveToDatabase={saveToDatabase}
                isLoading={isLoading}
              />
              <CurrentProfileFooter 
                username={decodeURIComponent(username)}
                profileData={profileData}
                isCurrentUser={isCurrentUser}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}