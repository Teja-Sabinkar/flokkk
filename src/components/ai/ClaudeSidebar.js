// src/components/ai/ClaudeSidebar.js - Enhanced with full feature parity
import { useState, useEffect, useRef } from 'react';
import styles from './ClaudeSidebar.module.css';

export default function ClaudeSidebar({ 
    user, 
    containerRef, 
    rightSidebarWidth, 
    isResizing, 
    startResizing,
    homePageContext = null,
    customGreeting = null,
    hideDefaultGreeting = false,
    hideRecentlyViewed = false
}) {
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

    // NEW: Enhanced state for context and data commands
    const [currentPageContext, setCurrentPageContext] = useState(null);
    const [userRecentActivity, setUserRecentActivity] = useState(null);
    const [dbDataAvailable, setDbDataAvailable] = useState([]);

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
    const NEWS_ITEM_DURATION = 60000;
    const PROGRESS_UPDATE_INTERVAL = 100;

    // NEW: Build enhanced context for ClaudeSidebar with HomePage-specific additions
    const buildEnhancedContext = () => {
        let context = '';
        
        // Add HomePage-specific context if provided
        if (homePageContext) {
            context += `The user is currently on the home feed page (main dashboard). `;
            if (homePageContext.specialBehavior.emphasizeFeed) {
                context += 'Focus on helping with feed discovery and content exploration. ';
            }
            if (homePageContext.specialBehavior.prioritizeDiscovery) {
                context += 'Prioritize content discovery and trending topics. ';
            }
            if (homePageContext.specialBehavior.includeCreationPrompts) {
                context += 'Include suggestions for creating new content and engaging with the community. ';
            }
        }
        
        // Add current page context
        if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            const currentParams = new URLSearchParams(window.location.search);
            
            if (currentPath.includes('/home') || currentPath === '/') {
                if (!homePageContext) { // Only add if not already added above
                    context += 'The user is currently on the home feed page. ';
                }
            } else if (currentPath.includes('/explore')) {
                context += 'The user is currently browsing the explore page. ';
            } else if (currentPath.includes('/discussion')) {
                const postId = currentParams.get('id');
                if (postId) {
                    context += `The user is currently viewing a discussion page (Post ID: ${postId}). `;
                }
            } else if (currentPath.includes('/subscriptions')) {
                context += 'The user is currently viewing their subscriptions page. ';
            } else if (currentPath.includes('/recently-viewed')) {
                context += 'The user is currently viewing their recently viewed content. ';
            } else if (currentPath.includes('/currentprofile')) {
                context += 'The user is currently on their own profile page. ';
            }
        }
        
        // Add user context
        if (user) {
            context += `The user's username is ${user.username || user.name}. `;
            if (user.bio) {
                context += `User bio: "${user.bio}". `;
            }
        }
        
        // Add platform stats context
        context += `Current platform activity: ${platformStats.activeUsers} active users, ${platformStats.todaysPosts} posts today. Trending topic: ${platformStats.trendingTopic}. `;
        
        return context;
    };

    // NEW: Enhanced data command extraction with HomePage-specific commands
    const extractDataCommands = (message) => {
        const commands = [];

        // Always include comprehensive search for general exploration
        commands.push({
            type: 'comprehensive_search',
            query: message,
            limit: 10
        });

        // HomePage-specific commands
        if (homePageContext && homePageContext.isHomePage) {
            // Emphasize trending content for home page
            commands.push({
                type: 'get_trending',
                limit: 8 // More trending content for home page
            });
            
            // Add feed-specific commands
            if (homePageContext.specialBehavior.emphasizeFeed) {
                commands.push({
                    type: 'get_recent_posts',
                    limit: 5
                });
            }
        } else {
            // Standard trending for other pages
            commands.push({
                type: 'get_trending',
                limit: 5
            });
        }

        // Add user-specific commands if we have user info
        if (user?.username) {
            const limit = homePageContext && homePageContext.isHomePage ? 5 : 3;
            commands.push({
                type: 'get_user_posts',
                username: user.username,
                limit: limit
            });
        }

        // Context-aware commands based on current page
        if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            const currentParams = new URLSearchParams(window.location.search);
            
            if (currentPath.includes('/discussion')) {
                const postId = currentParams.get('id');
                if (postId) {
                    commands.push({
                        type: 'get_post',
                        postId: postId
                    });
                    commands.push({
                        type: 'get_related_posts',
                        postId: postId,
                        limit: 3
                    });
                }
            }
        }

        // Smart command detection based on message content
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('forum') || lowerMessage.includes('community')) {
            commands.push({
                type: 'search_forums',
                topic: message,
                limit: 3
            });
        }

        return commands;
    };

    // NEW: Main sendMessageToAI function (like DiscussionPageRightBar)
    const sendMessageToAI = async (message, showMoreDb = false, showMoreAi = false) => {
        try {
            // Build enhanced context
            const context = buildEnhancedContext();
            
            // Extract data commands using sophisticated approach
            const dataCommands = extractDataCommands(message);

            // Get authentication token
            const token = localStorage.getItem('token');

            // Prepare request exactly like DiscussionPageRightBar
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: message,
                    context: context,
                    username: user?.username || 'Anonymous User',
                    dataCommands: dataCommands,
                    showMoreDb: showMoreDb,
                    showMoreAi: showMoreAi
                })
            };

            // Make API request to Claude endpoint
            const response = await fetch('/api/ai/claude', requestOptions);

            // Handle response and add the message
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            // Parse successful response
            const data = await response.json();

            // Store available database data types
            if (data.dataAvailable) {
                setDbDataAvailable(data.dataAvailable);
            }

            // Add AI response message
            const aiResponse = {
                id: Date.now() + 1,
                type: 'ai',
                content: data.response || "I'm sorry, I couldn't process your request.",
                hasMoreDb: data.hasMoreDb,
                hasMoreAi: data.hasMoreAi
            };

            // Always add as a new message, regardless of expansion type
            setMessages(prev => [...prev, aiResponse]);

            return data;
        } catch (error) {
            console.error('Error in sendMessageToAI:', error);
            throw error;
        }
    };

    // NEW: Show more functionality (copied from DiscussionPageRightBar)
    useEffect(() => {
        const handleShowMoreClick = async (e) => {
            // Check if the click was on a show-more-results button
            if (e.target.classList.contains('show-more-results')) {
                e.preventDefault();

                // Get the original query from the data attribute
                const originalQuery = decodeURIComponent(e.target.dataset.query || '');
                // Get the type of show more (db or ai)
                const type = e.target.dataset.type || 'db';

                if (originalQuery) {
                    // Add a system message indicating expanded results are being loaded
                    const systemMessage = {
                        id: Date.now(),
                        type: 'system',
                        content: `Loading expanded ${type === 'db' ? 'database' : 'AI'} information...`
                    };

                    setMessages(prev => [...prev, systemMessage]);
                    setIsLoading(true);
                    setHasInteracted(true);

                    try {
                        // Send the same query again but with appropriate showMore flags
                        if (type === 'db') {
                            await sendMessageToAI(originalQuery, true, false);
                        } else if (type === 'ai') {
                            await sendMessageToAI(originalQuery, false, true);
                        }
                    } catch (err) {
                        console.error('Error loading more results:', err);

                        // Replace the "Loading..." message with an error message
                        setMessages(prev => {
                            const newMessages = [...prev];
                            for (let i = newMessages.length - 1; i >= 0; i--) {
                                if (newMessages[i].id === systemMessage.id) {
                                    newMessages[i] = {
                                        id: systemMessage.id,
                                        type: 'error',
                                        content: 'Sorry, I encountered an error loading more results.'
                                    };
                                    return newMessages;
                                }
                            }
                            return prev;
                        });
                    } finally {
                        setIsLoading(false);
                    }
                }
            }
        };

        // Add event listener to the messages container
        const messagesContainer = document.querySelector(`.${styles.chatMessages}`);
        if (messagesContainer) {
            messagesContainer.addEventListener('click', handleShowMoreClick);
        }

        return () => {
            // Clean up the event listener
            if (messagesContainer) {
                messagesContainer.removeEventListener('click', handleShowMoreClick);
            }
        };
    }, []);

    // NEW: Fetch user recent activity and current page context
    useEffect(() => {
        const fetchEnhancedContext = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                // Fetch recent activity (recently viewed, recent posts, etc.)
                const [recentlyViewedResponse, userPostsResponse] = await Promise.all([
                    fetch('/api/recently-viewed', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(() => null),
                    user?.username ? fetch(`/api/users/${user.username}/posts?limit=3`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(() => null) : null
                ]);

                let contextData = {};

                if (recentlyViewedResponse?.ok) {
                    const recentData = await recentlyViewedResponse.json();
                    contextData.recentlyViewed = recentData.items?.slice(0, 3) || [];
                }

                if (userPostsResponse?.ok) {
                    const postsData = await userPostsResponse.json();
                    contextData.userRecentPosts = postsData.posts?.slice(0, 3) || [];
                }

                setUserRecentActivity(contextData);
            } catch (error) {
                console.error('Error fetching enhanced context:', error);
            }
        };

        fetchEnhancedContext();
    }, [user]);

    // Rotating News Functions (keeping existing functionality)
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

                if (data.status && data.status.nextRefreshIn) {
                    setNextBatchIn(data.status.nextRefreshIn);
                }

                console.log(`📰 Loaded ${data.items.length} rotating news items`);

                if (!isPaused) {
                    startNewsRotation();
                }
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
    };

    const startNewsRotation = () => {
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
    };

    const goToNextItem = () => {
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
    };

    const skipToNext = () => {
        clearTimers();
        goToNextItem();

        if (!isPaused && !hasCompletedCycle) {
            setTimeout(() => startNewsRotation(), 100);
        }
    };

    const skipToPrevious = () => {
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
    };

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

    useEffect(() => {
        if (!isPaused && !hasCompletedCycle && newsItems.length > 0) {
            startNewsRotation();
        }

        return () => clearTimers();
    }, [currentNewsIndex, isPaused, hasCompletedCycle, newsItems.length]);

    // Initial fetch on component mount
    useEffect(() => {
        fetchRotatingNews();

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

    // Platform stats update
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

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleInputChange = (e) => {
        setInputText(e.target.value);
    };

    // UPDATED: Enhanced submit handler using sendMessageToAI
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
        setDbDataAvailable([]);
        setHasInteracted(true);

        try {
            await sendMessageToAI(inputText);
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

    // NEW: Enhanced suggested questions based on context with HomePage-specific suggestions
    const getSuggestedQuestions = () => {
        let baseQuestions = [];
        
        // HomePage-specific suggestions
        if (homePageContext && homePageContext.isHomePage) {
            baseQuestions = [
                "What's trending on my feed today?",
                "Show me the most engaging discussions right now",
                "What topics are my connections talking about?",
                "Help me discover new creators to follow"
            ];
            
            if (homePageContext.specialBehavior.includeCreationPrompts) {
                baseQuestions.push("What should I post about today?");
            }
        } else {
            // Standard suggestions for other pages
            baseQuestions = [
                "What discussions are trending right now?",
                "Can you help me find interesting topics?",
                "What's new in gaming discussions?",
                "How can I contribute to a discussion?"
            ];
            
            // Add context-aware suggestions for other pages
            if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                
                if (currentPath.includes('/explore')) {
                    baseQuestions.unshift("Show me the most popular content in each category");
                } else if (currentPath.includes('/subscriptions')) {
                    baseQuestions.unshift("What's new from creators I follow?");
                } else if (currentPath.includes('/recently-viewed')) {
                    baseQuestions.unshift("Find similar content to what I've been viewing");
                }
            }
        }

        return baseQuestions.slice(0, 4); // Keep only 4 suggestions
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
                {/* Conditionally render Dashboard Section - Hide on HomePage when RecentlyViewed is external */}
                {!hideRecentlyViewed && (
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
                )}

                {/* AI messages with enhanced formatting */}
                {messages.map((message) => (
                    message.type !== 'system' && (
                        <div
                            key={message.id}
                            className={`${styles.chatMessage} ${styles[message.type]}`}
                        >
                            {message.type === 'ai' && (
                                <div className={styles.avatarContainer}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 16.5a4.5 4.5 0 004.5-4.5H7.5a4.5 4.5 0 004.5 4.5zM10 10a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2z" fill="#D1D1D1" />
                                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="#D1D1D1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}
                            <div className={styles.messageContent} dangerouslySetInnerHTML={{ __html: message.content }}></div>
                        </div>
                    )
                ))}

                {isLoading && (
                    <div className={`${styles.chatMessage} ${styles.ai}`}>
                        <div className={styles.avatarContainer}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 16.5a4.5 4.5 0 004.5-4.5H7.5a4.5 4.5 0 004.5 4.5zM10 10a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2z" fill="#D1D1D1" />
                                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="#D1D1D1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className={styles.typingIndicator}>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Enhanced suggested questions when no interaction yet */}
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

            {/* Chat input */}
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