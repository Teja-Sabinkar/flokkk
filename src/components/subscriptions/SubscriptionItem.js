import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext'; // Add theme context import
import Image from 'next/image';
import Link from 'next/link';
import styles from './SubscriptionItem.module.css';

const SubscriptionItem = ({ subscription, viewMode = 'grid' }) => {
  const { theme } = useTheme(); // Add theme context
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleMenuAction = (action) => {
    setIsMenuOpen(false);
    // Handle different actions: save, hide, report, etc.
    console.log(`Action ${action} for subscription ${subscription.id}`);
  };

  return (
    <div 
      className={`${styles.container} ${viewMode === 'list' ? styles.listContainer : ''}`}
      data-theme={theme} // Add theme data attribute
    >
      <div className={styles.header}>
        <div className={styles.creator}>
          <div className={styles.avatar} style={{ backgroundColor: subscription.avatarColor || '#6E56CF' }}>
            {subscription.username.charAt(0).toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <Link href={`/user/${subscription.username}`} className={styles.username}>
              u/{subscription.username}
            </Link>
            <div className={styles.timestamp}>{subscription.lastPostTime}</div>
          </div>
        </div>
        
        <div className={styles.menuContainer} ref={menuRef}>
          <button 
            className={styles.menuButton} 
            aria-label="Post menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          
          {isMenuOpen && (
            <div className={styles.dropdown}>
              <button 
                className={styles.dropdownItem}
                onClick={() => handleMenuAction('save')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>Save</span>
              </button>
              <button 
                className={styles.dropdownItem}
                onClick={() => handleMenuAction('hide')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
                <span>Hide</span>
              </button>
              <button 
                className={styles.dropdownItem}
                onClick={() => handleMenuAction('report')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Report</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className={`${styles.content} ${viewMode === 'list' ? styles.listContent : ''}`}>
        <div className={styles.textContent}>
          <Link href={`/content/${subscription.id}`}>
            <h3 className={styles.title}>{subscription.title}</h3>
          </Link>
          <p className={styles.description}>{subscription.description}</p>
        </div>
        
        {subscription.thumbnail && (
          <div className={`${styles.postImageContainer} ${viewMode === 'list' ? styles.listImageContainer : ''}`}>
            <div className={styles.postImageWrapper}>
              <Image 
                src={subscription.thumbnail} 
                alt={subscription.title}
                width={viewMode === 'list' ? 200 : 600}
                height={viewMode === 'list' ? 100 : 300}
                className={styles.postImage}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className={styles.postEngagement}>
        <button className={styles.discussionsBtn}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>{subscription.discussionCount} Discussions</span>
        </button>
        
        <button className={styles.shareBtn}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
};

export default SubscriptionItem;