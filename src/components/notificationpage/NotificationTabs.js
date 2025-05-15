import React from 'react';
import styles from './NotificationTabs.module.css';

const NotificationTabs = ({ activeTab, setActiveTab, counts }) => {
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    console.log(`Tab switched to: ${tab}`);
  };

  // Direct tab count mapping
  const getUnreadCount = (tabId) => {
    switch (tabId) {
      case 'all': return counts.unread || 0; // Add this line for the All tab
      case 'posts': return counts.postsUnread || 0;
      case 'comments': return counts.commentsUnread || 0;
      case 'likes': return counts.likesUnread || 0;
      case 'contributions': return counts.contributionsUnread || 0;
      default: return 0;
    }
  };

  const tabs = [

    // Add new All tab as the first item
    {
      id: 'all',
      label: 'All',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6l9 6 9-6M3 12l9 6 9-6M3 18l9 6 9-6"></path>
        </svg>
      )
    },


    {
      id: 'posts',
      label: 'Posts',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )
    },
    {
      id: 'comments',
      label: 'Comments',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    {
      id: 'likes',
      label: 'Votings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" strokeWidth="0">
          <path d="M7,14c0.3,0.3,0.6,0.4,1,0.4s0.7-0.1,1-0.4l3-3V20c0,0.8,0.7,1.5,1.5,1.5S15,20.8,15,20v-9l3,3c0.3,0.3,0.6,0.4,1,0.4
            s0.7-0.1,1-0.4c0.6-0.6,0.6-1.5,0-2.1l-5.5-5.5c-0.6-0.6-1.5-0.6-2.1,0L7,11.9C6.4,12.5,6.4,13.4,7,14z" />
          <path d="M17,10c-0.3-0.3-0.6-0.4-1-0.4s-0.7,0.1-1,0.4l-3,3V4c0-0.8-0.7-1.5-1.5-1.5S9,3.2,9,4v9l-3-3C5.7,9.7,5.4,9.6,5,9.6
            s-0.7,0.1-1,0.4c-0.6,0.6-0.6,1.5,0,2.1l5.5,5.5c0.6,0.6,1.5,0.6,2.1,0l5.5-5.5C17.6,11.5,17.6,10.6,17,10z" />
        </svg>
      )
    },
    {
      id: 'contributions',
      label: 'Contributions',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
      )
    }
  ];

  return (
    <div className={styles.tabsContainer}>
      {tabs.map((tab) => {
        const count = getUnreadCount(tab.id);

        return (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabName}>{tab.label}</span>

            {count > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '1.25rem',
                  height: '1.25rem',
                  padding: '0 0.375rem',
                  marginLeft: '0.5rem',
                  backgroundColor: activeTab === tab.id ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: 'white'
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default NotificationTabs;