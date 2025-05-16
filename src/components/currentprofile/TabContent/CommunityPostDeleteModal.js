'use client';

import React, { useState } from 'react';
import styles from './CommunityPostDeleteModal.module.css';

const CommunityPostDeleteModal = ({ isOpen, onClose, post, onDelete }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Handle deletion
    const handleDelete = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get auth token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required');
            }

            // Call API to delete post
            const response = await fetch(`/api/community-posts/${post.id || post._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete post');
            }

            // Call the onDelete callback
            if (onDelete) {
                onDelete(post.id || post._id);
            }

            // Close the modal
            onClose();
        } catch (error) {
            console.error('Error deleting community post:', error);
            setError(error.message || 'Failed to delete post');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <h2>Delete Post</h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        disabled={loading}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className={styles.errorMessage}>
                        {error}
                    </div>
                )}

                <div className={styles.modalContent}>
                    <p className={styles.confirmationText}>
                        Are you sure you want to delete this post
                        {post.title && <span className={styles.postTitle}> "{post.title}"</span>}?
                    </p>
                    <p className={styles.warningText}>
                        This action cannot be undone. The post and all associated content will be permanently removed.
                    </p>
                </div>

                <div className={styles.modalFooter}>
                    <button
                        onClick={onClose}
                        className={styles.cancelButton}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        className={styles.deleteButton}
                        disabled={loading}
                    >
                        {loading ? 'Deleting...' : 'Delete Post'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommunityPostDeleteModal;