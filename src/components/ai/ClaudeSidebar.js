// src/components/ai/ClaudeSidebar.js
import { useState, useEffect, useRef } from 'react';
import styles from './ClaudeSidebar.module.css';

export default function ClaudeSidebar({ user, containerRef, rightSidebarWidth, isResizing, startResizing }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [platformStats, setPlatformStats] = useState({
        activeUsers: '12.4K',
        todaysPosts: '2,847',
        trendingTopic: 'AI & Technology'
    });

    // Rotating News State
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
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Constants
    const NEWS_ITEM_DURATION = 60000; // Changed from 30000 to 60000 (60 seconds per item)
    const PROGRESS_UPDATE_INTERVAL = 100; // Keep same (100ms for smooth progress bar)


    // Fetch rotating news batch
    const fetchRotatingNews = async () => {
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

                // Set next batch timing if available
                if (data.status && data.status.nextRefreshIn) {
                    setNextBatchIn(data.status.nextRefreshIn);
                }

                console.log(`📰 Loaded ${data.items.length} rotating news items`);

                // Start rotation if not paused
                if (!isPaused) {
                    startNewsRotation();
                }
            } else {
                throw new Error(data.message || 'No news items received');
            }

        } catch (error) {
            console.error('Error fetching rotating news:', error);
            setNewsError(error.message);

            // Set fallback news if needed
            if (newsItems.length === 0) {
                setNewsItems([{                          // ← Keep setNewsItems (not setRssNews)
                    id: 'fallback',
                    title: 'Unable to load daily news',         // ← CHANGED
                    description: 'Daily news batch not available. Please try again later.',  // ← CHANGED
                    source: 'System',
                    link: '#',
                    rotationIndex: 0
                }]);
            }
        } finally {
            setNewsLoading(false);
        }
    };

    // Start the news rotation timer
    const startNewsRotation = () => {
        if (newsItems.length === 0 || isPaused) return;

        // Clear existing timers
        clearTimers();

        // Start progress timer
        const startTime = Date.now();
        progressTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / NEWS_ITEM_DURATION) * 100, 100);
            setProgress(newProgress);
        }, PROGRESS_UPDATE_INTERVAL);

        // Start news rotation timer
        newsTimerRef.current = setTimeout(() => {
            goToNextItem();
        }, NEWS_ITEM_DURATION);
    };

    // Go to next news item
    const goToNextItem = () => {
        setCurrentNewsIndex(prevIndex => {
            const nextIndex = prevIndex + 1;

            if (nextIndex >= newsItems.length) {
                // Completed full cycle
                setHasCompletedCycle(true);
                setProgress(100);
                return 0; // Reset to first item
            } else {
                setProgress(0);
                return nextIndex;
            }
        });
    };

    // Manual skip to next item
    const skipToNext = () => {
        clearTimers();
        goToNextItem();

        // Restart rotation if not paused and not completed cycle
        if (!isPaused && !hasCompletedCycle) {
            setTimeout(() => startNewsRotation(), 100);
        }
    };

    // Manual skip to previous item
    const skipToPrevious = () => {
        clearTimers();
        setCurrentNewsIndex(prevIndex => {
            const newIndex = prevIndex > 0 ? prevIndex - 1 : newsItems.length - 1;
            setProgress(0);
            setHasCompletedCycle(false);
            return newIndex;
        });

        // Restart rotation if not paused
        if (!isPaused) {
            setTimeout(() => startNewsRotation(), 100);
        }
    };

    // Toggle pause/play
    const togglePause = () => {
        setIsPaused(prev => {
            const newPaused = !prev;

            if (newPaused) {
                clearTimers();
            } else if (!hasCompletedCycle) {
                startNewsRotation();
            }

            return newPaused;
        });
    };

    // Clear all timers
    const clearTimers = () => {
        if (newsTimerRef.current) {
            clearTimeout(newsTimerRef.current);
            newsTimerRef.current = null;
        }
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }
    };

    // Update next batch countdown
    useEffect(() => {
        if (nextBatchIn && hasCompletedCycle) {
            batchTimerRef.current = setInterval(() => {
                setNextBatchIn(prev => {
                    if (prev <= 1000) {
                        // Time to fetch new batch
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
    }, [nextBatchIn, hasCompletedCycle]);

    // Restart rotation when current index changes (unless paused or completed)
    useEffect(() => {
        if (!isPaused && !hasCompletedCycle && newsItems.length > 0) {
            startNewsRotation();
        }

        return () => clearTimers();
    }, [currentNewsIndex, isPaused, hasCompletedCycle, newsItems.length]);

    // Initial fetch on component mount
    useEffect(() => {
        fetchRotatingNews();

        // Cleanup timers on unmount
        return () => {
            clearTimers();
            if (batchTimerRef.current) {
                clearInterval(batchTimerRef.current);
            }
        };
    }, []);

    // Handle news item click
    const handleNewsClick = () => {
        const currentItem = newsItems[currentNewsIndex];
        if (currentItem && currentItem.link && currentItem.link !== '#') {
            window.open(currentItem.link, '_blank', 'noopener,noreferrer');
        }
    };

    // Format time duration
    const formatDuration = (milliseconds) => {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Current news item
    const currentNewsItem = newsItems[currentNewsIndex];

    // Platform stats update (keeping existing logic)
    useEffect(() => {
        const updateStats = () => {
            const baseUsers = 12400;
            const basePosts = 2847;
            const variance = Math.floor(Math.random() * 100);

            setPlatformStats({
                activeUsers: `${((baseUsers + variance) / 1000).toFixed(1)}K`,
                todaysPosts: (basePosts + variance).toLocaleString(),
                trendingTopic: ['AI & Technology', 'Gaming', 'Music Production', 'Web Development', 'Design'][Math.floor(Math.random() * 5)]
            });
        };

        updateStats();
        const interval = setInterval(updateStats, 30000);
        return () => clearInterval(interval);
    }, []);

    // Existing AI chat functionality (keeping all existing logic)
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleInputChange = (e) => {
        setInputText(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputText,
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);
        setError(null);
        setHasInteracted(true);

        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const response = await fetch('/api/ai/claude', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message: inputText,
                    username: user?.username || 'Anonymous User',
                    dataCommands: [{
                        type: 'comprehensive_search',
                        query: inputText,
                        limit: 10
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();

            const aiResponse = {
                id: Date.now() + 1,
                type: 'ai',
                content: data.response || "I'm sorry, I couldn't process your request."
            };

            setMessages(prev => [...prev, aiResponse]);

        } catch (err) {
            console.error('Error communicating with AI:', err);
            setError(err.message || 'Failed to get a response');

            const errorMessage = {
                id: Date.now() + 1,
                type: 'error',
                content: 'Sorry, I encountered an error. Please try again later.'
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const getSuggestedQuestions = () => {
        return [
            "What discussions are trending right now?",
            "Can you help me find interesting topics?",
            "What's new in gaming discussions?",
            "How can I contribute to a discussion?"
        ];
    };

    const useSuggestion = (suggestion) => {
        setInputText(suggestion);
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const handleQuickAction = (action) => {
        switch (action) {
            case 'explore':
                window.location.href = '/explore';
                break;
            case 'trending':
                setInputText("What's trending today?");
                if (textareaRef.current) {
                    textareaRef.current.focus();
                }
                break;
            case 'create':
                window.location.href = '/home';
                break;
            default:
                break;
        }
    };

    return (
        <div className={styles.rightSidebarScrollable}>
            <div className={styles.chatMessages}>
                {/* Dashboard Section */}
                <div className={styles.dashboardSection}>


                    {/* Rotating News Section */}
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
                                {/* Progress Bar */}
                                <div className={styles.progressContainer}>
                                    <div
                                        className={styles.progressBar}
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>

                                {/* News Content */}
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

                                {/* Controls */}
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

                                {/* Next Batch Info */}
                                {hasCompletedCycle && (
                                    <div className={styles.nextBatchInfo}>
                                        <span>Next daily batch: Tomorrow at 6 AM</span>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Quick Actions */}
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
                                onClick={() => handleQuickAction('trending')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="20" x2="18" y2="10"></line>
                                    <line x1="12" y1="20" x2="12" y2="4"></line>
                                    <line x1="6" y1="20" x2="6" y2="14"></line>
                                </svg>
                                Trending
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
                </div>

                {/* AI messages (keeping existing functionality) */}
                {messages.map((message) => (
                    message.type !== 'system' && (
                        <div
                            key={message.id}
                            className={`${styles.chatMessage} ${styles[message.type]}`}
                        >
                            <div className={styles.messageContent} dangerouslySetInnerHTML={{ __html: message.content }}></div>
                        </div>
                    )
                ))}

                {isLoading && (
                    <div className={`${styles.chatMessage} ${styles.ai}`}>
                        <div className={styles.typingIndicator}>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggested questions when no interaction yet */}
            {!hasInteracted && !isLoading && (
                <div className={styles.suggestionsContainer}>
                    <div className={styles.suggestionsList}>
                        {getSuggestedQuestions().map((question, index) => (
                            <button
                                key={index}
                                className={styles.suggestionButton}
                                onClick={() => useSuggestion(question)}
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat input (keeping existing functionality) */}
            <form onSubmit={handleSubmit} className={styles.chatInputContainer}>
                <div className={styles.chatInputWrapper}>
                    <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={handleInputChange}
                        placeholder="Ask Flock..."
                        className={styles.chatInput}
                        rows={1}
                        disabled={isLoading}
                    />
                    <div className={styles.chatControls}>
                        <button
                            type="submit"
                            className={styles.sendButton}
                            disabled={isLoading || !inputText.trim()}
                        >
                            <span>Ask</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}