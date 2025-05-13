'use client';

import React, { useState, useEffect } from 'react';
import styles from './AddtoModal.module.css';

export default function AddtoModal({ isOpen, onClose, post, onAdd }) {
    // State for storing forums
    const [forums, setForums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedForumId, setSelectedForumId] = useState(null);

    // State for creating a new forum
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newForumTitle, setNewForumTitle] = useState('');
    // Removed newForumDescription state

    // Fetch forums
    useEffect(() => {
        if (!isOpen) return;

        const fetchForums = async () => {
            try {
                setLoading(true);

                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Authentication required');
                }

                const response = await fetch('/api/forums', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to load forums');
                }

                const data = await response.json();
                setForums(data.forums || []);
            } catch (error) {
                console.error('Error loading forums:', error);
                setError('Failed to load forums. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchForums();
    }, [isOpen]);

    // Handle forum selection
    const handleForumSelect = (forumId) => {
        setSelectedForumId(forumId);
        setIsCreatingNew(false);
    };

    // Toggle new forum creation form
    const handleNewForumToggle = () => {
        setIsCreatingNew(!isCreatingNew);
        setSelectedForumId(null);
    };

    // Handle adding post to forum
    const handleAddToForum = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required');
            }

            if (isCreatingNew) {
                // Create a new forum
                if (!newForumTitle.trim()) {
                    throw new Error('Please enter a forum title');
                }

                // Create new forum first - removed description from request body
                const createResponse = await fetch('/api/forums', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: newForumTitle.trim(),
                        description: '', // Empty description
                        image: post.image || '/api/placeholder/400/200'
                    })
                });

                if (!createResponse.ok) {
                    throw new Error('Failed to create forum');
                }

                const newForum = await createResponse.json();

                // Now add the post to the new forum
                const postId = post.id || post._id;
                const addResponse = await fetch(`/api/forums/${newForum.forum.id}/posts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ postId })
                });

                if (!addResponse.ok) {
                    throw new Error('Failed to add post to forum');
                }

                if (onAdd) {
                    onAdd({
                        forumId: newForum.forum.id,
                        forumTitle: newForum.forum.title,
                        isNewForum: true
                    });
                }

            } else if (selectedForumId) {
                // Add to existing forum
                const postId = post.id || post._id;
                const response = await fetch(`/api/forums/${selectedForumId}/posts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ postId })
                });

                if (!response.ok) {
                    throw new Error('Failed to add post to forum');
                }

                const selectedForum = forums.find(f => f.id === selectedForumId);

                if (onAdd) {
                    onAdd({
                        forumId: selectedForumId,
                        forumTitle: selectedForum?.title || 'Forum',
                        isNewForum: false
                    });
                }
            } else {
                throw new Error('Please select a forum or create a new one');
            }

            // Close the modal on success
            onClose();
        } catch (error) {
            console.error('Error adding post to forum:', error);
            setError(error.message);
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <h2>Add to Forum</h2>
                    <button className={styles.closeButton} onClick={onClose} disabled={loading}>
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

                <div className={styles.modalBody}>
                    {loading && !forums.length ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.loadingSpinner}></div>
                            <p>Loading forums...</p>
                        </div>
                    ) : (
                        <>
                            <p className={styles.promptText}>Choose a forum to add this post to:</p>

                            <div className={styles.forumsList}>
                                {forums.length > 0 ? (
                                    forums.map(forum => (
                                        <div
                                            key={forum.id}
                                            className={`${styles.forumItem} ${selectedForumId === forum.id ? styles.selected : ''}`}
                                            onClick={() => handleForumSelect(forum.id)}
                                        >
                                            <div className={styles.forumImageContainer}>
                                                <img
                                                    src={forum.imageSrc || '/api/placeholder/50/50'}
                                                    alt={forum.title}
                                                    className={styles.forumImage}
                                                />
                                            </div>
                                            <div className={styles.forumInfo}>
                                                <h3>{forum.title}</h3>
                                                <p>{forum.postCount} posts</p>
                                            </div>
                                            {selectedForumId === forum.id && (
                                                <div className={styles.selectedIndicator}>
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.noForumsMessage}>You don't have any forums yet. Create one to add this post.</p>
                                )}
                            </div>

                            <div className={styles.divider}>
                                <span>OR</span>
                            </div>

                            {isCreatingNew ? (
                                <div className={styles.newForumForm}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="newForumTitle">New Forum Title</label>
                                        <input
                                            type="text"
                                            id="newForumTitle"
                                            placeholder="Enter forum title"
                                            value={newForumTitle}
                                            onChange={(e) => setNewForumTitle(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>
                                    {/* Description field removed */}
                                </div>
                            ) : (
                                <button
                                    className={styles.createNewButton}
                                    onClick={handleNewForumToggle}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Create New Forum
                                </button>
                            )}
                        </>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button
                        className={styles.cancelButton}
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.addButton}
                        onClick={handleAddToForum}
                        disabled={loading || (!selectedForumId && !(isCreatingNew && newForumTitle.trim()))}
                    >
                        {loading ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </div>
        </div>
    );
}