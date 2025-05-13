'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import { 
  SettingsContainer, 
  AccountSettings,
  NotificationSettings,
  PrivacySettings,
  FeedbackSettings
} from '@/components/settings';
import styles from './page.module.css';

// Map of valid tabs and their corresponding components
const tabComponents = {
  account: AccountSettings,
  notification: NotificationSettings,
  privacy: PrivacySettings,
  feedback: FeedbackSettings
};

export default function SettingsTabPage() {
  const params = useParams();
  const { tab } = params;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  
  // Validate tab param and get component
  const TabContent = tabComponents[tab] || AccountSettings;
  const tabTitle = tab ? tab.charAt(0).toUpperCase() + tab.slice(1) : 'Account';
  
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
  
  // Generate title based on tab
  let title = 'Account Settings';
  if (tab === 'notification') title = 'Notification Settings';
  if (tab === 'privacy') title = 'Privacy Settings';
  if (tab === 'feedback') title = 'Feedback';

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
        
        {/* Content area with settings components */}
        <div className={styles.contentContainer}>
          <div className={styles.contentScrollable}>
            <div className={styles.settingsContent}>
              {/* Settings Tabs and Content */}
              <SettingsContainer title={title}>
                <TabContent />
              </SettingsContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}