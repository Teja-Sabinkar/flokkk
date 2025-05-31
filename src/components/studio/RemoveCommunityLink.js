'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './RemoveCommunityLink.module.css';

export default function RemoveCommunityLink({
    isOpen,
    onClose,
    onConfirm,
    linkData
}) {
    const modalRef = useRef(null);
    const [isConfirming, setIsConfirming] = useState(false);

    // Handle click outside to close modal
    useEffect(() => {
        if (!isOpen) return;

        function handleClickOutside(event) {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        }

        // Add event listener
        document.addEventListener('mousedown', handleClickOutside);

        // Prevent scrolling when modal is open
        document.body.style.overflow = 'hidden';

        // Clean up
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    // Handle escape key press
    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    // Handle confirm action
    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error('Error confirming removal:', error);
        } finally {
            setIsConfirming(false);
        }
    };

    // Don't render if not open
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} ref={modalRef}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Remove Community Link</h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        disabled={isConfirming}
                        aria-label="Close modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className={styles.modalBody}>
                    <div className={styles.warningIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>

                    <div className={styles.confirmationText}>
                        <p className={styles.mainText}>
                            Are you sure you want to remove this community link?
                        </p>

                        {linkData && (
                            <div className={styles.linkPreview}>
                                <div className={styles.linkInfo}>
                                    <h4 className={styles.linkTitle}>{linkData.title}</h4>
                                    <p className={styles.linkUrl}>{linkData.url}</p>
                                    {linkData.contributorUsername && (
                                        <p className={styles.linkContributor}>
                                            Contributed by: <strong>@{linkData.contributorUsername}</strong>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <p className={styles.noteText}>
                            <strong>Note:</strong> This action will be saved when you click "Save Changes".
                            The link will be permanently removed from your post.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.modalActions}>
                    <button
                        className={styles.cancelButton}
                        onClick={onClose}
                        disabled={isConfirming}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.confirmButton}
                        onClick={handleConfirm}
                        disabled={isConfirming}
                    >
                        {isConfirming ? (
                            <>
                                <span className={styles.buttonSpinner}></span>
                                Removing...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Remove Link
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}