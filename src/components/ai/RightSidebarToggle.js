// src/components/ai/RightSidebarToggle.js
import styles from './RightSidebarToggle.module.css';

export default function RightSidebarToggle({
    isRightSidebarVisible,
    handleRightSidebarToggle
}) {
    return (
        <button
            className={`${styles.rightSidebarToggle} ${isRightSidebarVisible ? styles.active : ''}`}
            onClick={handleRightSidebarToggle}
            aria-label="Toggle AI sidebar"
        >
            <span className={styles.aiText}>flock</span>
        </button>
    );
}