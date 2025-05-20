// src/components/ai/DesktopSidebarToggle.js
import styles from './DesktopSidebarToggle.module.css';

export default function DesktopSidebarToggle({
    isRightSidebarVisible,
    handleRightSidebarToggle
}) {
    return (
        <button
            className={`${styles.desktopSidebarToggle} ${isRightSidebarVisible ? styles.active : ''}`}
            onClick={handleRightSidebarToggle}
            aria-label={isRightSidebarVisible ? "Hide AI sidebar" : "Show AI sidebar"}
            title={isRightSidebarVisible ? "Hide AI" : "Show AI"}
        >
            <span className={styles.toggleIcon}>
                {isRightSidebarVisible ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                )}
            </span>
            <span className={styles.aiText}>{isRightSidebarVisible ? "Hide flock" : "Show flock"}</span>
        </button>
    );
}