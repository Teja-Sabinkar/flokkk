// src/components/recentlyviewed/RecentlyViewedRightSidebarToggle.js
import { useEffect, useState } from 'react';
import styles from './RecentlyViewedRightSidebarToggle.module.css';

export default function RecentlyViewedRightSidebarToggle({
    isRightSidebarVisible,
    handleRightSidebarToggle,
    sidebarWidth = 330
}) {
    const [screenSize, setScreenSize] = useState('desktop');
    const [isReady, setIsReady] = useState(false);

    // Check for screen size breakpoints
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            if (width < 480) {
                setScreenSize('small-mobile');
            } else if (width < 1300) {
                setScreenSize('mobile');
            } else {
                setScreenSize('desktop');
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => {
            window.removeEventListener('resize', checkScreenSize);
        };
    }, []);

    // Set initial safe position and mark as ready
    useEffect(() => {
        // Set a safe initial position (moved 10px closer to right edge when active)
        document.documentElement.style.setProperty('--toggle-right-position', isRightSidebarVisible ? '320px' : '0px');
        
        // Mark as ready after a brief delay
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 50);

        return () => clearTimeout(timer);
    }, [isRightSidebarVisible]);

    // Update positioning once ready and when dependencies change
    useEffect(() => {
        if (!isReady) return;

        let rightPosition;

        if (isRightSidebarVisible) {
            if (screenSize === 'small-mobile' || screenSize === 'mobile') {
                // For all mobile sizes, position 10px closer to right edge when active
                rightPosition = '320px';
            } else {
                // Desktop: follow the sidebar width + smaller offset (moved 10px right)
                rightPosition = `${sidebarWidth + 5}px`;
            }
        } else {
            rightPosition = '0px';
        }

        document.documentElement.style.setProperty('--toggle-right-position', rightPosition);
    }, [isRightSidebarVisible, sidebarWidth, screenSize, isReady]);

    // Determine CSS classes based on state
    const getToggleClasses = () => {
        let classes = [styles.rightSidebarToggle];
        
        if (isRightSidebarVisible) {
            classes.push(styles.active);
        }
        
        if (!isReady) {
            classes.push(styles.hidden);
        }
        
        return classes.join(' ');
    };

    return (
        <button
            className={getToggleClasses()}
            onClick={handleRightSidebarToggle}
            aria-label="Toggle recently viewed sidebar"
        >
            <span className={styles.aiText}>floocc</span>
        </button>
    );
}