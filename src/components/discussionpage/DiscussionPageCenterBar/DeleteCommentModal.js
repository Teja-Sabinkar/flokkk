// src/components/discussionpage/DiscussionPageCenterBar/DeleteCommentModal.js
import { useEffect, useRef } from 'react';
import styles from './DeleteCommentModal.module.css';

export default function DeleteCommentModal({ isOpen, onClose, onConfirm, commentPreview, isDeleting }) {
    const modalRef = useRef(null);

    // Handle click outside to close modal
    useEffect(() => {
        function handleClickOutside(event) {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                if (!isDeleting) {
                    onClose();
                }
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Prevent scrolling when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose, isDeleting]);

    // Handle escape key press
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape' && !isDeleting) {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose, isDeleting]);

    if (!isOpen) return null;

    // Truncate comment preview if too long
    const truncatedPreview = commentPreview && commentPreview.length > 100
        ? commentPreview.substring(0, 100) + '...'
        : commentPreview;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} ref={modalRef}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Delete Comment</h3>
                    {!isDeleting && (
                        <button className={styles.closeButton} onClick={onClose}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                </div>

                <div className={styles.modalBody}>
                    <p className={styles.confirmationText}>
                        Are you sure you want to delete this comment? This action cannot be undone.
                    </p>

                    {truncatedPreview && (
                        <div className={styles.commentPreview}>
                            <div className={styles.previewLabel}>Comment:</div>
                            <div className={styles.previewText}>"{truncatedPreview}"</div>
                        </div>
                    )}

                    <div className={styles.warningText}>
                        The comment & the username will be replaced with "[deleted]" but replies will remain visible.
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button
                        className={styles.cancelButton}
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.deleteButton}
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <div className={styles.spinner}></div>
                                Deleting...
                            </>
                        ) : (
                            'Delete Comment'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}