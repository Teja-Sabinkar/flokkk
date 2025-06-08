// src/components/widgets/rotatingNewsContainer.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext'; // Add theme context import
import styles from './rotatingNewsContainer.module.css';

export default function RotatingNewsContainer() {
    const { theme } = useTheme(); // Add theme context
    // State for rotating news
    const [newsItems, setNewsItems] = useState([]);
    const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsError, setNewsError] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [nextBatchIn, setNextBatchIn] = useState(null);
    const [hasCompletedCycle, setHasCompletedCycle] = useState(false);

    // Refs for timers
    const newsTimerRef = useRef(null);
    const progressTimerRef = useRef(null);
    const batchTimerRef = useRef(null);

    // Constants
    const NEWS_ITEM_DURATION = 60000;
    const PROGRESS_UPDATE_INTERVAL = 100;

    // Fetch rotating news
    const fetchRotatingNews = useCallback(async () => {
        try {
            setNewsLoading(true);
            setNewsError(null);

            const response = await fetch('/api/rotating-rss?status=true');

            if (!response.ok) {
                throw new Error(`Failed to fetch rotating news: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.items && data.items.length > 0) {
                setNewsItems(data.items);
                setCurrentNewsIndex(0);
                setProgress(0);
                setHasCompletedCycle(false);

                if (data.status && data.status.nextRefreshIn) {
                    setNextBatchIn(data.status.nextRefreshIn);
                }

                console.log(`📰 Loaded ${data.items.length} rotating news items`);
            } else {
                throw new Error(data.message || 'No news items received');
            }

        } catch (error) {
            console.error('Error fetching rotating news:', error);
            setNewsError(error.message);

            if (newsItems.length === 0) {
                setNewsItems([{
                    id: 'fallback',
                    title: 'Unable to load daily news',
                    description: 'Daily news batch not available. Please try again later.',
                    source: 'System',
                    link: '#',
                    rotationIndex: 0
                }]);
            }
        } finally {
            setNewsLoading(false);
        }
    }, [newsItems.length]);

    // News rotation functions
    const clearTimers = useCallback(() => {
        if (newsTimerRef.current) {
            clearTimeout(newsTimerRef.current);
            newsTimerRef.current = null;
        }
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }
    }, []);

    const goToNextItem = useCallback(() => {
        setCurrentNewsIndex(prevIndex => {
            const nextIndex = prevIndex + 1;

            if (nextIndex >= newsItems.length) {
                setHasCompletedCycle(true);
                setProgress(100);
                return 0;
            } else {
                setProgress(0);
                return nextIndex;
            }
        });
    }, [newsItems.length]);

    const startNewsRotation = useCallback(() => {
        if (newsItems.length === 0 || isPaused) return;

        clearTimers();

        const startTime = Date.now();
        progressTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / NEWS_ITEM_DURATION) * 100, 100);
            setProgress(newProgress);
        }, PROGRESS_UPDATE_INTERVAL);

        newsTimerRef.current = setTimeout(() => {
            goToNextItem();
        }, NEWS_ITEM_DURATION);
    }, [newsItems.length, isPaused, clearTimers, goToNextItem]);

    const skipToNext = useCallback(() => {
        clearTimers();
        goToNextItem();

        if (!isPaused && !hasCompletedCycle) {
            setTimeout(() => startNewsRotation(), 100);
        }
    }, [clearTimers, goToNextItem, isPaused, hasCompletedCycle, startNewsRotation]);

    const skipToPrevious = useCallback(() => {
        clearTimers();
        setCurrentNewsIndex(prevIndex => {
            const newIndex = prevIndex > 0 ? prevIndex - 1 : newsItems.length - 1;
            setProgress(0);
            setHasCompletedCycle(false);
            return newIndex;
        });

        if (!isPaused) {
            setTimeout(() => startNewsRotation(), 100);
        }
    }, [clearTimers, newsItems.length, isPaused, startNewsRotation]);

    const togglePause = useCallback(() => {
        setIsPaused(prev => {
            const newPaused = !prev;

            if (newPaused) {
                clearTimers();
            } else if (!hasCompletedCycle) {
                startNewsRotation();
            }

            return newPaused;
        });
    }, [clearTimers, hasCompletedCycle, startNewsRotation]);

    // News rotation effects
    useEffect(() => {
        if (!isPaused && !hasCompletedCycle && newsItems.length > 0) {
            startNewsRotation();
        }

        return () => clearTimers();
    }, [currentNewsIndex, isPaused, hasCompletedCycle, newsItems.length, startNewsRotation, clearTimers]);

    // Update next batch countdown
    useEffect(() => {
        if (nextBatchIn && hasCompletedCycle) {
            batchTimerRef.current = setInterval(() => {
                setNextBatchIn(prev => {
                    if (prev <= 1000) {
                        fetchRotatingNews();
                        return null;
                    }
                    return prev - 1000;
                });
            }, 1000);
        }

        return () => {
            if (batchTimerRef.current) {
                clearInterval(batchTimerRef.current);
            }
        };
    }, [nextBatchIn, hasCompletedCycle, fetchRotatingNews]);

    // Initial fetch on component mount
    useEffect(() => {
        fetchRotatingNews();

        return () => {
            clearTimers();
            if (batchTimerRef.current) {
                clearInterval(batchTimerRef.current);
            }
        };
    }, []); // Empty dependency array - only run once

    // Handle news item click
    const handleNewsClick = useCallback(() => {
        const currentItem = newsItems[currentNewsIndex];
        if (currentItem && currentItem.link && currentItem.link !== '#') {
            window.open(currentItem.link, '_blank', 'noopener,noreferrer');
        }
    }, [newsItems, currentNewsIndex]);

    // Current news item
    const currentNewsItem = newsItems[currentNewsIndex];

    return (
        <div className={styles.rotatingNewsContainer}>
            <div className={styles.newsHeader}>
                <h4 className={styles.newsTitle}>
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={styles.radioIcon}
                    >
                        <circle cx="12" cy="12" r="2"></circle>
                        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path>
                    </svg>
                    Live Radio
                </h4>
            </div>

            {newsLoading && newsItems.length === 0 ? (
                <div className={styles.newsLoading}>
                    <div className={styles.loadingSpinner}></div>
                    <span>Loading news rotation...</span>
                </div>
            ) : newsError && newsItems.length === 0 ? (
                <div className={styles.newsError}>
                    <span>Failed to load news</span>
                    <button onClick={fetchRotatingNews} className={styles.retryButton}>
                        Retry
                    </button>
                </div>
            ) : currentNewsItem ? (
                <div className={styles.currentNewsItem}>
                    <div className={styles.progressContainer}>
                        <div
                            className={styles.progressBar}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    <div
                        className={styles.newsContent}
                        onClick={handleNewsClick}
                    >
                        <div className={styles.newsItemTitle}>
                            {currentNewsItem.title}
                        </div>
                        <div className={styles.newsItemMeta}>
                            <span className={styles.newsSource}>{currentNewsItem.source}</span>
                            <span className={styles.newsDot}>•</span>
                            <span className={styles.newsCategory}>{currentNewsItem.category}</span>
                        </div>
                    </div>

                    <div className={styles.newsControls}>
                        <button
                            className={styles.controlButton}
                            onClick={skipToPrevious}
                            title="Previous"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="19,20 9,12 19,4"></polygon>
                                <line x1="5" y1="19" x2="5" y2="5"></line>
                            </svg>
                        </button>

                        <button
                            className={styles.controlButton}
                            onClick={togglePause}
                            title={isPaused ? "Resume" : "Pause"}
                        >
                            {isPaused ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="5,3 19,12 5,21"></polygon>
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="6" y="4" width="4" height="16"></rect>
                                    <rect x="14" y="4" width="4" height="16"></rect>
                                </svg>
                            )}
                        </button>

                        <button
                            className={styles.controlButton}
                            onClick={skipToNext}
                            title="Next"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="5,4 15,12 5,20"></polygon>
                                <line x1="19" y1="5" x2="19" y2="19"></line>
                            </svg>
                        </button>
                    </div>

                    {hasCompletedCycle && (
                        <div className={styles.nextBatchInfo}>
                            <span>Next daily batch: Tomorrow at 6 AM</span>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}