'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './DiscussionPageSidebarNavigation.module.css';

export default function SidebarNavigation({ isOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading', 'guest', 'unverified', 'verified'
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setAuthStatus('guest');
        return;
      }
      
      // Check if user is verified
      const isVerified = localStorage.getItem('isVerified') === 'true';
      setAuthStatus(isVerified ? 'verified' : 'unverified');
    };
    
    checkAuthStatus();
  }, []);
  
  // Navigation items with their paths, icons, and authentication requirements
  const navItems = [
    {
      name: 'Home',
      path: '/home',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      requiresAuth: false,
    },
    {
      name: 'Explore',
      path: '/explore',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
      ),
      requiresAuth: false,
    },
    {
      name: 'Recently Viewed',
      path: '/recently-viewed',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      requiresAuth: true,
    },
    {
      name: 'Subscriptions',
      path: '/subscriptions',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ),
      requiresAuth: true,
    },
    {
      name: 'flokkk A.I.',
      path: '/AIchatpage',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      specialClass: styles.flokkkAI,
      requiresAuth: true,
    },
    {
      name: 'About',
      path: '/about',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      ),
      requiresAuth: false,
    },
    {
      name: 'Help',
      path: '/help',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      ),
      requiresAuth: false,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
      requiresAuth: true,
    },
  ];

  // Handle navigation click
  const handleNavClick = (e, item) => {
    if (item.requiresAuth && authStatus === 'guest') {
      e.preventDefault();
      // Redirect to login page
      router.push('/login');
    }
  };

  return (
    <nav className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`} data-theme={theme}>
      <ul className={styles.navList}>
        {navItems.map((item) => {
          // Check if the current path starts with the nav item path
          // Special handling for home to avoid matching everything
          let isActive = false;
          
          if (item.path === '/home') {
            isActive = pathname === '/home';
          } else if (item.name === 'Help') {
            // Add special handling for Help to properly highlight when on help page
            isActive = pathname === '/help';
          } else if (item.name === 'flokkk A.I.') {
            // Special handling for flokkk A.I. page
            isActive = pathname === '/AIchatpage' || pathname.startsWith('/AIchatpage/');
          } else {
            isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          }
          
          return (
            <li key={item.name} className={styles.navItem}>
              <Link 
                href={item.path} 
                className={`${styles.navLink} ${isActive ? styles.active : ''} ${item.specialClass || ''} ${item.requiresAuth && authStatus === 'guest' ? styles.requiresAuth : ''}`}
                onClick={(e) => handleNavClick(e, item)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navText}>
                  {item.name}

                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}