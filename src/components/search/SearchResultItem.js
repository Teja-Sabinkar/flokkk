// SearchResultItem.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './SearchResultItem.module.css';
import PostSaveModal from '@/components/home/PostSaveModal';
import { ReportModal, submitReport } from '@/components/report';
import { ShareModal } from '@/components/share';
import { useAppearanceTracker } from '@/hooks/useAppearanceTracker';

const SearchResultItem = ({ item, viewMode = 'grid', onHidePost }) => {
    const router = useRouter();
    const menuRef = useRef(null);

    // Component state
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Video playback states
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [videoId, setVideoId] = useState(null);
    const [videoError, setVideoError] = useState(false);

    // Success/loading states
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [hideSuccess, setHideSuccess] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    // Safely extract item data
    const {
        _id = '',
        title = 'Untitled Post',
        content = '',
        image = null,
        videoUrl = null,
        username = 'user',
        userId = null,
        profilePicture = null,
        avatar = null,
        createdAt = null,
        discussions = 0,
        hashtags = [],
        creatorLinks = [],
        communityLinks = []
    } = item || {};

    // NEW: Use appearance tracking hook
    const { elementRef: itemRef, hasAppeared, isTracking, debugInfo, manualTrigger } = useAppearanceTracker(_id, {
        threshold: 0.3, // 30% of item must be visible
        timeThreshold: 500 // 0.5 second delay
    });

    // Extract YouTube video ID from URL
    const extractYouTubeVideoId = useCallback((url) => {
        if (!url || typeof url !== 'string') return null;

        try {
            // Comprehensive regex that handles all YouTube URL formats
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = url.match(youtubeRegex);
            return match && match[1] ? match[1] : null;
        } catch (error) {
            console.error('Error extracting video ID:', error);
            return null;
        }
    }, []);

    // Extract video ID when component mounts or videoUrl changes
    useEffect(() => {
        if (videoUrl) {
            const id = extractYouTubeVideoId(videoUrl);
            setVideoId(id);
        } else {
            setVideoId(null);
        }
    }, [videoUrl, extractYouTubeVideoId]);

    // Engagement tracking functions
    const trackAppearEngagement = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`/api/posts/${postId}/track-appear`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn('Failed to track appear engagement');
            } else {
                const data = await response.json();
                console.log('Appear engagement tracked:', data);
            }
        } catch (error) {
            console.error('Error tracking appear engagement:', error);
        }
    };

    const trackViewEngagement = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`/api/posts/${postId}/track-view`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn('Failed to track view engagement');
            } else {
                const data = await response.json();
                console.log('View engagement tracked:', data);
            }
        } catch (error) {
            console.error('Error tracking view engagement:', error);
        }
    };

    const trackPenetrateEngagement = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`/api/posts/${postId}/track-penetrate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn('Failed to track penetrate engagement');
            } else {
                const data = await response.json();
                console.log('Penetrate engagement tracked:', data);
            }
        } catch (error) {
            console.error('Error tracking penetrate engagement:', error);
        }
    };

    const trackSaveEngagement = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`/api/posts/${postId}/track-save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn('Failed to track save engagement');
            } else {
                const data = await response.json();
                console.log('Save engagement tracked:', data);
            }
        } catch (error) {
            console.error('Error tracking save engagement:', error);
        }
    };

    const trackShareEngagement = async (postId, platform = 'unknown') => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`/api/posts/${postId}/track-share`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ platform })
            });

            if (!response.ok) {
                console.warn('Failed to track share engagement');
            } else {
                const data = await response.json();
                console.log('Share engagement tracked:', data);
            }
        } catch (error) {
            console.error('Error tracking share engagement:', error);
        }
    };

    // Handle play button click - WITH VIEW TRACKING
    const handlePlayClick = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (videoId) {
            setIsVideoPlaying(true);
            setVideoError(false);

            // Track view engagement when play button is clicked
            await trackViewEngagement(_id);
        }
    }, [videoId, _id]);

    // Handle closing video (return to thumbnail)
    const handleCloseVideo = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsVideoPlaying(false);
        setVideoError(false);
    }, []);

    // Handle video embedding error
    const handleVideoError = useCallback(() => {
        setVideoError(true);
    }, []);

    // Get current user data
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const userData = await response.json();
                    setCurrentUser(userData);
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        fetchCurrentUser();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isMenuOpen]);

    // Generate consistent avatar color
    const generateAvatarColor = (username) => {
        if (!username) return '#3b5fe2';

        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }

        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }

        return color;
    };

    // Format time ago
    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Just now';

        try {
            let date;

            // Handle MongoDB format
            if (timestamp && typeof timestamp === 'object' && timestamp.$date) {
                if (timestamp.$date.$numberLong) {
                    date = new Date(parseInt(timestamp.$date.$numberLong));
                } else {
                    date = new Date(timestamp.$date);
                }
            } else {
                date = new Date(timestamp);
            }

            if (isNaN(date.getTime())) return 'Just now';

            const now = new Date();
            const diffMs = now - date;

            if (diffMs < 1000) return 'Just now';

            const seconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            const weeks = Math.floor(days / 7);
            const months = Math.floor(days / 30);
            const years = Math.floor(days / 365);

            if (seconds < 60) return `${seconds}s ago`;
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;
            if (weeks < 4) return `${weeks}w ago`;
            if (months < 12) return `${months}mo ago`;
            return `${years}y ago`;
        } catch {
            return 'Just now';
        }
    };

    // Get discussion count safely
    const getDiscussionCount = () => {
        if (typeof discussions === 'number') return discussions;
        if (discussions && discussions.$numberInt) return parseInt(discussions.$numberInt);
        if (typeof discussions === 'string') return parseInt(discussions) || 0;
        return 0;
    };

    // Check if current user owns this post
    const isCurrentUserPost = () => {
        if (!currentUser || !userId) return false;
        return currentUser.id === userId ||
            currentUser._id === userId ||
            currentUser.username === username;
    };

    // Navigation handlers
    const handleUsernameClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        const cleanUsername = username.replace(/^u\//, '');
        const encodedUsername = encodeURIComponent(cleanUsername);

        if (isCurrentUserPost()) {
            router.push(`/currentprofile/${encodedUsername}`);
        } else {
            router.push(`/otheruserprofile/${encodedUsername}`);
        }
    };

    const handleDiscussionClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Track penetrate engagement when discussion button is clicked
        await trackPenetrateEngagement(_id);
        
        router.push(`/discussion?id=${_id}`);
    };

    // Menu handlers
    const handleMenuToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    };

    const handleSave = async () => {
        setIsMenuOpen(false);
        setShowSaveModal(true);
        
        // Track save engagement when save button is clicked
        await trackSaveEngagement(_id);
    };

    const handleHide = async () => {
        setIsMenuOpen(false);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please log in to hide posts');
                return;
            }

            const response = await fetch('/api/posts/hide', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ postId: _id })
            });

            if (!response.ok) throw new Error('Failed to hide post');

            setHideSuccess(true);
            setTimeout(() => {
                setHideSuccess(false);
                if (onHidePost) onHidePost(_id);
            }, 1500);

        } catch (error) {
            console.error('Error hiding post:', error);
            alert('Failed to hide post. Please try again.');
        }
    };

    const handleReport = () => {
        setIsMenuOpen(false);
        setShowReportModal(true);
    };

    const handleShare = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowShareModal(true);
        
        // Track share engagement when share button is clicked
        await trackShareEngagement(_id, 'manual');
    };

    // Success handlers
    const handleSaveSuccess = (result) => {
        setSaveSuccess(true);
        setShowSaveModal(false);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const handleReportSubmit = async (reportData) => {
        setIsSubmittingReport(true);
        try {
            await submitReport(reportData);
            setShowReportModal(false);
            setReportSuccess(true);
            setTimeout(() => setReportSuccess(false), 3000);
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('Failed to submit report. Please try again.');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    // Prepare data
    const timeAgo = formatTimeAgo(createdAt);
    const discussionCount = getDiscussionCount();
    const avatarSrc = profilePicture || avatar;
    const avatarColor = generateAvatarColor(username);
    const isListView = viewMode === 'list';
    const totalLinksCount = (creatorLinks?.length || 0) + (communityLinks?.length || 0);

    return (
        <article className={`${styles.card} ${isListView ? styles.listView : ''}`} ref={itemRef} data-post-id={_id}>
            {/* Success Messages */}
            {saveSuccess && (
                <div className={styles.successMessage}>
                    Post saved successfully!
                </div>
            )}

            {hideSuccess && (
                <div className={styles.successMessage}>
                    Post hidden successfully.
                </div>
            )}

            {reportSuccess && (
                <div className={styles.successMessage}>
                    Report submitted successfully.
                </div>
            )}

            {/* Post Header */}
            <header className={styles.postHeader}>
                <div className={styles.userInfo}>
                    <div className={styles.avatarContainer}>
                        {avatarSrc && avatarSrc !== '/profile-placeholder.jpg' ? (
                            <Image
                                src={avatarSrc}
                                alt={`${username}'s profile`}
                                width={32}
                                height={32}
                                className={styles.avatarImage}
                                priority
                                unoptimized
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div
                            className={styles.avatarInitial}
                            style={{
                                backgroundColor: avatarColor,
                                display: avatarSrc && avatarSrc !== '/profile-placeholder.jpg' ? 'none' : 'flex'
                            }}
                        >
                            {username.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div className={styles.userDetails}>
                        <button
                            className={styles.username}
                            onClick={handleUsernameClick}
                            type="button"
                        >
                            {username}
                        </button>
                        <time className={styles.postDate}>{timeAgo}</time>
                    </div>
                </div>

                <div className={styles.menuContainer} ref={menuRef}>
                    <button
                        className={styles.menuButton}
                        onClick={handleMenuToggle}
                        aria-label="Post options"
                        type="button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>

                    {isMenuOpen && (
                        <div className={styles.dropdown}>
                            <button className={styles.dropdownItem} onClick={handleSave} type="button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                Save
                            </button>
                            <button className={styles.dropdownItem} onClick={handleHide} type="button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                                Hide
                            </button>
                            <button className={styles.dropdownItem} onClick={handleReport} type="button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                Report
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Content */}
            <div className={`${styles.contentWrapper} ${isListView ? styles.listContent : styles.gridContent}`}>
                {/* Image for list view */}
                {isListView && image && (
                    <div className={styles.imageContainer}>
                        {isVideoPlaying && videoId && !videoError ? (
                            // YouTube video player
                            <div className={styles.videoPlayerWrapper}>
                                <button
                                    className={styles.closeVideoButton}
                                    onClick={handleCloseVideo}
                                    aria-label="Close video"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                                <iframe
                                    className={styles.youtubeEmbed}
                                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                                    title={title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    onError={handleVideoError}
                                ></iframe>
                            </div>
                        ) : isVideoPlaying && videoError ? (
                            // Error fallback when embedding fails
                            <div className={styles.videoErrorContainer}>
                                <button
                                    className={styles.closeVideoButton}
                                    onClick={handleCloseVideo}
                                    aria-label="Close video"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                                <div className={styles.videoErrorContent}>
                                    <div className={styles.errorIcon}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                            <line x1="12" y1="9" x2="12" y2="13"></line>
                                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                        </svg>
                                    </div>
                                    <h3>Video cannot be embedded</h3>
                                    <p>This video cannot be played directly. Click below to watch on YouTube.</p>
                                    <a
                                        href={videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.watchOnYoutubeBtn}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                        </svg>
                                        Watch on YouTube
                                    </a>
                                </div>
                            </div>
                        ) : (
                            // Thumbnail with optional play button
                            <div className={styles.imageWrapper}>
                                <Image
                                    src={image}
                                    alt={title}
                                    width={160}
                                    height={160}
                                    className={styles.postImage}
                                    unoptimized
                                />

                                {/* Play button overlay for videos */}
                                {videoUrl && videoId && (
                                    <button
                                        className={styles.playButton}
                                        onClick={handlePlayClick}
                                        aria-label="Play video"
                                    >
                                        <div className={styles.playButtonCircle}>
                                            <svg
                                                className={styles.playIcon}
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                            >
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Text content */}
                <div className={styles.textContent}>
                    <h2 className={styles.title}>{title}</h2>
                    <p className={styles.content}>{content}</p>

                    {/* Engagement for list view */}
                    {isListView && (
                        <div className={styles.engagement}>
                            <button className={styles.engagementButton} onClick={handleDiscussionClick} type="button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                </svg>
                                {discussionCount} Discussions
                            </button>

                            {/* Links display (non-interactive) */}
                            <div className={styles.linksDisplay}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                                {totalLinksCount} Links
                            </div>

                            <button className={styles.engagementButton} onClick={handleShare} type="button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="18" cy="5" r="3"></circle>
                                    <circle cx="6" cy="12" r="3"></circle>
                                    <circle cx="18" cy="19" r="3"></circle>
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                                </svg>
                                Share
                            </button>
                        </div>
                    )}
                </div>

                {/* Image and engagement for grid view */}
                {!isListView && (
                    <>
                        {image && (
                            <div className={styles.imageContainer}>
                                {isVideoPlaying && videoId && !videoError ? (
                                    // YouTube video player
                                    <div className={styles.videoPlayerWrapper}>
                                        <button
                                            className={styles.closeVideoButton}
                                            onClick={handleCloseVideo}
                                            aria-label="Close video"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                        <iframe
                                            className={styles.youtubeEmbed}
                                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                                            title={title}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            onError={handleVideoError}
                                        ></iframe>
                                    </div>
                                ) : isVideoPlaying && videoError ? (
                                    // Error fallback when embedding fails
                                    <div className={styles.videoErrorContainer}>
                                        <button
                                            className={styles.closeVideoButton}
                                            onClick={handleCloseVideo}
                                            aria-label="Close video"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                        <div className={styles.videoErrorContent}>
                                            <div className={styles.errorIcon}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                                </svg>
                                            </div>
                                            <h3>Video cannot be embedded</h3>
                                            <p>This video cannot be played directly. Click below to watch on YouTube.</p>
                                            <a
                                                href={videoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.watchOnYoutubeBtn}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                                </svg>
                                                Watch on YouTube
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    // Thumbnail with optional play button
                                    <div className={styles.imageWrapper}>
                                        <Image
                                            src={image}
                                            alt={title}
                                            width={600}
                                            height={300}
                                            className={styles.postImage}
                                            unoptimized
                                        />

                                        {/* Play button overlay for videos */}
                                        {videoUrl && videoId && (
                                            <button
                                                className={styles.playButton}
                                                onClick={handlePlayClick}
                                                aria-label="Play video"
                                            >
                                                <div className={styles.playButtonCircle}>
                                                    <svg
                                                        className={styles.playIcon}
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                    >
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={styles.engagement}>
                            <button className={styles.engagementButton} onClick={handleDiscussionClick} type="button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                </svg>
                                {discussionCount} Discussions
                            </button>

                            {/* Links display (non-interactive) */}
                            <div className={styles.linksDisplay}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                                {totalLinksCount} Links
                            </div>

                            <button className={styles.engagementButton} onClick={handleShare} type="button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="18" cy="5" r="3"></circle>
                                    <circle cx="6" cy="12" r="3"></circle>
                                    <circle cx="18" cy="19" r="3"></circle>
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                                </svg>
                                Share
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <PostSaveModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                post={{
                    id: _id,
                    title,
                    content,
                    image,
                    username,
                    discussions: discussionCount
                }}
                onSave={handleSaveSuccess}
            />

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                postData={{
                    id: _id,
                    title,
                    content,
                    image
                }}
            />

            <ReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                onSubmit={handleReportSubmit}
                contentDetails={{
                    postId: _id,
                    userId,
                    username,
                    title,
                    content,
                    hashtags,
                    image
                }}
            />
        </article>
    );
};

export default SearchResultItem;