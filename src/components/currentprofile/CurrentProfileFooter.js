// CurrentProfileFooter.js
import React, { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './CurrentProfileFooter.module.css';
import CurrentProfileTabs from './CurrentProfileTabs';

// Import tab content components
import HomeTab from './TabContent/HomeTab';
import PlaylistsTab from './TabContent/PlaylistsTab';
import CommunityTab from './TabContent/CommunityTab';
import ContributionsTab from './TabContent/ContributionsTab';
import AboutTab from './TabContent/AboutTab';
import ForumsTab from './TabContent/Forums';

const CurrentProfileFooter = ({ username = 'username', profileData = {}, isCurrentUser = false }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('home');

  // Update active tab when URL query changes
  useEffect(() => {
    const tab = searchParams?.get('tab') || 'home';
    // Redirect to home if trying to access the saved tab when not the current user
    if (tab === 'saved' && !isCurrentUser) {
      setActiveTab('home');
    } else {
      setActiveTab(tab);
    }
  }, [searchParams, isCurrentUser]);

  // Render the appropriate tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'saved':
        // Only render if current user
        return isCurrentUser ? <PlaylistsTab username={username} /> : <HomeTab username={username} />;
      case 'forums':
        return <ForumsTab username={username} />; // You'll need to create this component
      case 'community':
        return <CommunityTab username={username} />;
      case 'contributions': 
        return <ContributionsTab username={username} />;
      case 'about':
        return <AboutTab profileData={profileData} />;
      case 'home':
      default:
        return <HomeTab username={username} />;
    }
  };

  return (
    <div className={styles.footerContainer}>
      <CurrentProfileTabs 
        username={username} 
        activeTab={activeTab} 
        isCurrentUser={isCurrentUser} 
      />
      <div className={styles.tabContentContainer}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default CurrentProfileFooter;