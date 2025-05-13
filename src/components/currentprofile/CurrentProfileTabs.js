// CurrentProfileTabs.js
import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './CurrentProfileTabs.module.css';

const CurrentProfileTabs = ({ username, activeTab = 'home', isCurrentUser = false }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Define base tabs with the requested order
  let tabs = [
    { id: 'home', label: 'HOME' },
    { id: 'forums', label: 'FORUMS' },
    // 'saved' will be inserted conditionally here
    { id: 'community', label: 'COMMUNITY' },
    { id: 'contributions', label: 'CONTRIBUTIONS' },
    { id: 'about', label: 'ABOUT' }
  ];
  
  // Add the "saved" tab only if this is the current user's profile
  if (isCurrentUser) {
    // Insert after "forums" tab (at index 2)
    tabs.splice(2, 0, { id: 'saved', label: 'SAVED' });
  }

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

export default CurrentProfileTabs;