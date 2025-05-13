import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './OtherUserProfileTabs.module.css';

const OtherUserProfileTabs = ({ username, activeTab = 'home' }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const tabs = [
    { id: 'home', label: 'HOME' },
    { id: 'forums', label: 'FORUMS' },
    { id: 'community', label: 'COMMUNITY' },
    { id: 'about', label: 'ABOUT' }
  ];

  // Create new URL with updated tab parameter
  const createTabUrl = (tabId) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabId);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabsWrapper}>
        {tabs.map((tabItem) => (
          <Link
            key={tabItem.id}
            href={createTabUrl(tabItem.id)}
            className={`${styles.tabItem} ${activeTab === tabItem.id ? styles.activeTab : ''}`}
          >
            {tabItem.label}
            {activeTab === tabItem.id && <div className={styles.activeIndicator} />}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default OtherUserProfileTabs;