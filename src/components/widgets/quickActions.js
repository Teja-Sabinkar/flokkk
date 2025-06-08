// src/components/widgets/quickActions.js
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext'; // Add theme context import
import styles from './quickActions.module.css';

export default function QuickActions({ onActionSelect }) {
    const router = useRouter();
    const { theme } = useTheme(); // Add theme context
    
    // Direct handler for studio (matching Header.js pattern)
    const handleStudioClick = () => {
        console.log('Studio button clicked, navigating to /studio');
        router.push('/studio');
    };

    const handleQuickAction = useCallback((action) => {
        if (onActionSelect) {
            onActionSelect(action);
            return;
        }

        // Default actions if no handler is provided
        switch (action) {
            case 'explore':
                router.push('/explore');
                break;
            case 'studio':
                console.log('Studio button clicked via callback, navigating to /studio');
                router.push('/studio');
                break;
            case 'create':
                router.push('/home');
                break;
            default:
                break;
        }
    }, [onActionSelect, router]);

    return (
        <div className={styles.quickActions}>
            <h4 className={styles.actionTitle}>Quick Actions</h4>
            <div className={styles.actionButtons}>
                <button
                    className={styles.actionButton}
                    onClick={() => handleQuickAction('explore')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 12l8-8 8 8-8 8-8-8z"></path>
                    </svg>
                    Explore
                </button>
                <button
                    className={styles.actionButton}
                    onClick={handleStudioClick}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    Studio
                </button>
                <button
                    className={styles.actionButton}
                    onClick={() => handleQuickAction('create')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Create
                </button>
            </div>
        </div>
    );
}