import React, { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './OtherUserProfileFooter.module.css';
import OtherUserProfileTabs from './OtherUserProfileTabs';

// Import tab content components
import HomeTab from './TabContent/HomeTab';
import Forums from './TabContent/Forums';
import CommunityTab from './TabContent/CommunityTab';
import AboutTab from './TabContent/AboutTab';

const OtherUserProfileFooter = ({ username = 'username', profileData = {}, initialTab = 'home' }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Log what data we're receiving
  useEffect(() => {
    console.log('OtherUserProfileFooter received username:', username);
    console.log('OtherUserProfileFooter received profileData:', profileData);
  }, [username, profileData]);

  // Update active tab when URL query changes
  useEffect(() => {
    const tab = searchParams?.get('tab') || 'home';
    setActiveTab(tab);
  }, [searchParams]);

  // Render the appropriate tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'forums':
        return <Forums username={username} />;
      case 'community':
        return <CommunityTab username={username} />;
      case 'about':
        return <AboutTab profileData={profileData} />;
      case 'home':
      default:
        return <HomeTab username={username} />;
    }
  };

  return (
    <div className={styles.footerContainer}>
      <OtherUserProfileTabs username={username} activeTab={activeTab} />
      <div className={styles.tabContentContainer}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default OtherUserProfileFooter;