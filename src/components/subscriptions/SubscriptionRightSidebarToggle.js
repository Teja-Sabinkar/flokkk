import { useEffect, useState } from 'react';
import styles from './SubscriptionRightSidebarToggle.module.css';

export default function SubscriptionRightSidebarToggle({
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
        document.documentElement.style.setProperty('--toggle-right-position', isRightSidebarVisible ? '320px' : '0px');
        
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 50);

        return () => clearTimeout(timer);
    }, [isRightSidebarVisible]);

    // Update positioning once ready and when dependencies change
    useEffect(() => {
        if (!isReady) return;

        let rightPosition;
        const toggleWidth = screenSize === 'small-mobile' ? 24 : 28; // Toggle button width

        if (isRightSidebarVisible) {
            if (screenSize === 'small-mobile' || screenSize === 'mobile') {
                // On mobile, position the toggle OUTSIDE the sidebar
                // Sidebar width (320px on mobile) + toggle width + small gap
                rightPosition = `${320 + toggleWidth + 2}px`;
            } else {
                // On desktop, position based on dynamic sidebar width
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
            aria-label="Toggle subscriptions sidebar"
        >
            <span className={styles.aiText}>flokkk</span>
        </button>
    );
}