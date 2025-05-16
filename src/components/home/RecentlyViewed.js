'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from './RecentlyViewed.module.css';
import Image from 'next/image';

export default function RecentlyViewed({ initialItemCount = 3 }) {
  const [recentItems, setRecentItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State to control how many items are shown
  const [visibleItems, setVisibleItems] = useState(initialItemCount);

  // State to track which item's menu is open (null when none is open)
  const [openMenuId, setOpenMenuId] = useState(null);

  // Ref for detecting clicks outside the menu
  const menuRef = useRef(null);

  // Fetch recently viewed items from API
  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');

        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/recently-viewed', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Error fetching recently viewed items: ${response.status}`);
        }

        const data = await response.json();
        setRecentItems(data.items || []);
      } catch (error) {
        console.error('Error fetching recently viewed items:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentlyViewed();
  }, []);

  // Function to show more items
  const handleShowMore = () => {
    // Navigate to the recently-viewed page instead of showing more items
    window.location.href = '/recently-viewed';
  };

  // Handle menu toggle
  const toggleMenu = (id) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Menu option handlers
  const handleSave = (item) => {
    console.log(`Saved: ${item.title}`);
    setOpenMenuId(null);
  };

  const handleHide = (item) => {
    console.log(`Hidden: ${item.title}`);
    setOpenMenuId(null);
  };

  const handleReport = (item) => {
    console.log(`Reported: ${item.title}`);
    setOpenMenuId(null);
  };

  // Generate a color from username
  const generateColorFromUsername = (username) => {
    if (!username) return '#3b5fe2'; // Default blue color

    // Simple hash function for consistent color generation
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert to hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }

    return color;
  };

  return (
    <div className={styles.recentlyViewedContainer}>
      <h2 className={styles.sectionTitle}>Recently Viewed</h2>

      {isLoading ? (
        <div className={styles.loadingState}>
          <p>Loading recently viewed items...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>Error loading items: {error}</p>
        </div>
      ) : recentItems.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No recently viewed items</p>
        </div>
      ) : (
        <div className={styles.itemsList}>
          {recentItems.slice(0, visibleItems).map((item, index) => {
            const author = item.author || {};
            const username = author.username || 'anonymous';
            const initial = username.charAt(0).toUpperCase();

            return (
              <div key={item.id || index} className={styles.itemCard}>
                {author.profilePicture && author.profilePicture !== '/profile-placeholder.jpg' ? (
                  <div className={styles.avatarContainer}>
                    <Image
                      src={author.profilePicture}
                      alt={username}
                      width={32}
                      height={32}
                      className={styles.avatarImage}
                      priority
                      unoptimized
                      key={author.profilePicture} // Force re-render when URL changes
                    />
                  </div>
                ) : (
                  <div
                    className={styles.avatarContainer}
                    style={{ backgroundColor: generateColorFromUsername(username) }}
                  >
                    <span className={styles.avatarInitial}>{initial}</span>
                  </div>
                )}

                <div className={styles.itemDetails}>
                  <Link href={`/discussion?id=${item.id}`} className={styles.itemTitle}>
                    {item.title}
                  </Link>

                  <div className={styles.itemMeta}>
                    <div className={styles.authorDate}>
                      <Link href={`/otheruserprofile/${username}`} className={styles.itemAuthor}>
                        {username}
                      </Link>
                      <span className={styles.itemDate}>{item.postedTime}</span>
                    </div>

                    <div className={styles.itemStats}>
                      <span className={styles.viewCount}>{item.discussionCount || '0'} discussions</span>
                      <span className={styles.timeAgo}>seen_{item.lastViewed}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.menuContainer} ref={openMenuId === item.id ? menuRef : null}>

                  {openMenuId === item.id && (
                    <div className={styles.dropdown}>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => handleSave(item)}
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
                        onClick={() => handleHide(item)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                        <span>Hide</span>
                      </button>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => handleReport(item)}
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
            );
          })}
        </div>
      )}

      {recentItems.length > 0 && (
        <Link href="/recently-viewed" className={styles.showMoreButton}>
          Show more
        </Link>
      )}
    </div>
  );
}