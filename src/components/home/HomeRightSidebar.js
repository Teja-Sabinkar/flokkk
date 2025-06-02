'use client';

import { useState, useEffect, useRef } from 'react';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import AiChat from '@/components/aichat/AiChat';
import styles from './HomeRightSidebar.module.css';
import aiChatStyles from '@/components/aichat/AiChat.module.css';

export default function HomeRightSidebar({
    isVisible,
    isMobileView,
    onToggle,
    user
}) {
    const [isResizing, setIsResizing] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(330);
    const [initialX, setInitialX] = useState(0);
    const [initialWidth, setInitialWidth] = useState(0);

    // Chat related states
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Refs
    const containerRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Update CSS variable when sidebar width changes
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    }, [sidebarWidth]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Resize functionality
    const startResizing = (e) => {
        e.preventDefault();
        e.stopPropagation();

        setInitialX(e.clientX);
        setInitialWidth(sidebarWidth);
        setIsResizing(true);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.body.classList.add('resizing-active');
    };

    // Listen for mouse events during resize
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;

            const windowWidth = window.innerWidth;
            const newWidth = windowWidth - e.clientX;
            const minWidth = 250;
            const maxWidth = Math.min(600, windowWidth * 0.4);
            const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

            setSidebarWidth(constrainedWidth);
            localStorage.setItem('rightSidebarWidth', constrainedWidth.toString());
        };

        const handleMouseUp = () => {
            if (!isResizing) return;

            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.body.classList.remove('resizing-active');
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, sidebarWidth]);

    // Load saved width on mount
    useEffect(() => {
        const savedWidth = localStorage.getItem('rightSidebarWidth');
        if (savedWidth) {
            setSidebarWidth(Number(savedWidth));
        }
    }, []);

    // Enhanced function to handle AI chat submission with show more functionality
    const handleAiChatSubmit = async (message) => {
        if (!message.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: message,
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');

            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: message,
                    username: user?.username || 'Anonymous User'
                })
            };

            const response = await fetch('/api/ai/claude', requestOptions);

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
            setError(err.message || 'Failed to get a response from Claude AI');

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

    // Helper function to handle show more requests
    const handleShowMoreRequest = async (type, originalQuery, element) => {
        if (isLoading) return;

        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');

            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: 'Show more content',
                    username: user?.username || 'Anonymous User',
                    showMoreType: type,
                    originalQuery: originalQuery
                })
            };

            const response = await fetch('/api/ai/claude', requestOptions);

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();

            // Add the show more response
            const showMoreResponse = {
                id: Date.now(),
                type: 'ai',
                content: data.response || "I couldn't load additional content."
            };

            setMessages(prev => [...prev, showMoreResponse]);

            // Hide the clicked button
            if (element) {
                element.style.display = 'none';
            }

        } catch (err) {
            console.error('Error handling show more request:', err);

            const errorMessage = {
                id: Date.now(),
                type: 'error',
                content: 'Sorry, I couldn\'t load more content. Please try again.'
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Add click event listeners for dynamically generated content
    useEffect(() => {
        const handleDynamicClicks = (event) => {
            const target = event.target;

            // Handle "Show more insights" clicks
            if (target.classList.contains('show-more-insights')) {
                event.preventDefault();
                const originalQuery = decodeURIComponent(target.dataset.query || '');
                handleShowMoreRequest('more-insights', originalQuery, target);
            }

            // Handle "Show more discussions & links" clicks
            if (target.classList.contains('show-more-discussions-links')) {
                event.preventDefault();
                const originalQuery = decodeURIComponent(target.dataset.query || '');
                handleShowMoreRequest('more-discussions-links', originalQuery, target);
            }

            // Handle "Show more insights and links" clicks
            if (target.classList.contains('show-more-insights-links')) {
                event.preventDefault();
                const originalQuery = decodeURIComponent(target.dataset.query || '');
                handleShowMoreRequest('more-insights-links', originalQuery, target);
            }
        };

        // Add event listener to the messages container
        const messagesContainer = containerRef.current?.querySelector(`.${styles.chatMessages}`);
        if (messagesContainer) {
            messagesContainer.addEventListener('click', handleDynamicClicks);
        }

        // Cleanup
        return () => {
            if (messagesContainer) {
                messagesContainer.removeEventListener('click', handleDynamicClicks);
            }
        };
    }, [messages, isLoading, user]);

    // Function to get time-based greeting
    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            return "Good Morning";
        } else if (hour >= 12 && hour < 17) {
            return "Good Afternoon";
        } else if (hour >= 17 && hour < 21) {
            return "Good Evening";
        } else {
            return "Good Night";
        }
    };

    // Add welcome message when component mounts or user changes
    useEffect(() => {
        // Don't show welcome message for guest users
        if (!user || user.name === 'Guest' || user.username === 'Guest') {
            return;
        }

        // More robust username extraction with multiple fallbacks
        let username = 'there';
        if (user) {
            username = user.username || user.name || (user.email ? user.email.split('@')[0] : 'there');
        }

        // Clean username by removing @ symbols and spaces
        const cleanUsername = username.replace(/[@\s]/g, '');
        const timeGreeting = getTimeBasedGreeting();
        
        const welcomeMessage = {
            id: 1,
            type: 'system',
            content: `Hi ${cleanUsername}, ${timeGreeting}! How can I assist you today?`
        };

        setMessages([welcomeMessage]);
    }, [user]);

    return (
        <>
            {/* Right sidebar toggle button - Only visible on mobile */}
            {isMobileView && (
                <button
                    className={`${styles.rightSidebarToggle} ${isVisible ? styles.active : ''}`}
                    onClick={onToggle}
                    aria-label="Toggle sidebar"
                >
                    <span className={styles.toggleText}>floocc</span>
                </button>
            )}

            {/* Right sidebar container */}
            <div
                className={`${styles.rightSidebarContainer} ${isVisible ? styles.visible : ''}`}
                ref={containerRef}
                style={{
                    width: `${sidebarWidth}px`,
                    minWidth: `${sidebarWidth}px`,
                    maxWidth: `${sidebarWidth}px`
                }}
            >
                {/* Resize handle */}
                <div
                    className={`${styles.resizeHandle} ${isResizing ? styles.isResizing : ''}`}
                    onMouseDown={startResizing}
                    title="Drag to resize"
                >
                    <div className={styles.resizeBar}></div>
                </div>

                <div className={styles.rightSidebarScrollable}>
                    {/* Chat messages container */}
                    <div className={styles.chatMessages}>
                        {/* Top content - RecentlyViewed component */}
                        <div className={styles.sidebarTopContent}>
                            <div className="RecentlyViewed_itemsList">
                                <RecentlyViewed />
                            </div>
                        </div>

                        {/* Display chat messages using AiChat styles */}
                        {messages.length > 0 && (
                            <div className={styles.messagesContainer}>
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`${aiChatStyles.chatMessage} ${aiChatStyles[message.type]}`}
                                    >
                                        <div className={aiChatStyles.messageContent} dangerouslySetInnerHTML={{ __html: message.content }}></div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className={`${aiChatStyles.chatMessage} ${aiChatStyles.ai}`}>
                                        <div className={aiChatStyles.typingIndicator}>
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Bottom content - AiChat component */}
                    <div className={styles.aiChatWrapper}>
                        <AiChat onSubmit={handleAiChatSubmit} />
                    </div>
                </div>
            </div>
        </>
    );
}