'use client';
import { useState, useRef, useEffect } from 'react';
import DiscussionPageHeader from '@/components/layout/DiscussionPageHeader/DiscussionPageHeader';
import DiscussionPageSidebarNavigation from '@/components/layout/DiscussionPageSidebarNavigation/DiscussionPageSidebarNavigation';
import AiChat from '@/components/aichat/AiChat'; // Import AiChat component
import aiChatStyles from '@/components/aichat/AiChat.module.css'; // Import AiChat styles
import styles from './page.module.css';

export default function AIchatPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAI, setSelectedAI] = useState('Claude');
    const messagesEndRef = useRef(null);

    // Check if there are any user messages to determine header visibility
    const hasUserMessages = messages.some(message => message.type === 'user');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const suggestions = [
        { icon: '📊', text: 'Analyze data' },
        { icon: '📝', text: 'Summarize text' },
        { icon: '✨', text: 'Surprise me' },
        { icon: '💡', text: 'Get advice' },
        { icon: '📅', text: 'Make a plan' },
    ];

    const examplePrompts = [
        'Help me learn Python',
        'Create a road trip itinerary',
        'What are the best sources of protein?',
        'Learn techniques for effective time management'
    ];

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

    // Modified useEffect - No longer adds welcome message to messages array
    // since it's now handled in the welcome section
    useEffect(() => {
        // Initialize with empty messages array
        // The greeting will be shown in the welcome section instead
        setMessages([]);
    }, []);

    // Modified handleSubmit to work with AiChat component and connect to Claude AI
    const handleSubmit = async (inputValue) => {
        if (!inputValue.trim() || isLoading) return;

        // Add user message
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputValue
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            // Call Claude AI API
            const token = localStorage.getItem('token');

            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: inputValue.trim(),
                    username: 'Anonymous User', // You can get this from user context if available
                    source: 'manual' // Explicitly mark as manual query
                })
            };

            // Make API request to Claude endpoint
            const response = await fetch('/api/ai/claude', requestOptions);

            // Handle response
            if (!response.ok) {
                const errorData = await response.json();

                // Check if it's a rate limit error
                if (response.status === 429) {
                    throw new Error(`Rate limit exceeded: ${errorData.message}`);
                }

                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();

            // Add AI response message
            const aiResponse = {
                id: Date.now() + 1,
                type: 'ai',
                content: data.response || "I'm sorry, I couldn't process your request."
            };

            setMessages(prev => [...prev, aiResponse]);
        } catch (err) {
            console.error('Error communicating with AI:', err);

            // Add error message
            const errorMessage = {
                id: Date.now() + 1,
                type: 'error',
                content: err.message.includes('Rate limit')
                    ? 'You\'ve reached the rate limit. Please try again later.'
                    : 'Sorry, I encountered an error. Please try again.'
            };

            setMessages(prev => [...prev, errorMessage]);

            // Re-throw the error so AiChat component can handle rate limiting
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (text) => {
        // Since we can't directly set the input value in AiChat from here,
        // we'll just submit the suggestion directly
        handleSubmit(text);
    };

    // Handle show more requests similar to ExploreRightSidebar
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
                    username: 'Anonymous User',
                    source: 'manual',
                    showMoreType: type,
                    originalQuery: originalQuery.trim()
                })
            };

            const response = await fetch('/api/ai/claude', requestOptions);

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 429) {
                    throw new Error(`Rate limit exceeded: ${errorData.message}`);
                }
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
        const messagesContainer = document.querySelector(`.${styles.messagesContainer}`);
        if (messagesContainer) {
            messagesContainer.addEventListener('click', handleDynamicClicks);
        }

        // Cleanup
        return () => {
            if (messagesContainer) {
                messagesContainer.removeEventListener('click', handleDynamicClicks);
            }
        };
    }, [messages, isLoading]);

    return (
        <div className={styles.container}>
            <DiscussionPageHeader
                onMenuToggle={toggleSidebar}
                isMobileMenuOpen={isSidebarOpen}
            />

            <div className={styles.mainContent}>
                {/* Apply the hidden class by default, remove when sidebar should be open */}
                <div className={`${styles.sidebarContainer} ${!isSidebarOpen ? styles.sidebarHidden : ''}`}>
                    <DiscussionPageSidebarNavigation
                        isOpen={isSidebarOpen}
                    />
                </div>

                {/* Overlay for mobile */}
                {isSidebarOpen && (
                    <div
                        className={styles.overlay}
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                <div className={styles.chatContainer}>

                    {/* Messages Container - Modified to show welcome section only when no user messages */}
                    <div className={styles.messagesContainer}>

                        {/* Welcome Section - Only show when no user messages exist */}
                        {!hasUserMessages && (
                            <div className={styles.welcomeSection}>
                                {/* Pulsing SVG Logo */}
                                <div className={styles.welcomeLogoContainer}>
                                    <svg width="120" height="120" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={styles.welcomeLogo}>
                                        <defs>
                                            <linearGradient id="welcomeLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" style={{ stopColor: "#4f46e5", stopOpacity: 1 }} />
                                                <stop offset="100%" style={{ stopColor: "#06b6d4", stopOpacity: 1 }} />
                                            </linearGradient>
                                        </defs>

                                        {/* Rounded rectangle background */}
                                        <rect x="15" y="15" width="170" height="170" rx="35" ry="35" fill="url(#welcomeLogoGradient)" />

                                        {/* Main vertical line (left) */}
                                        <rect x="40" y="40" width="20" height="120" fill="white" rx="10" className={`${styles.pulsingLine} ${styles.line1}`} />

                                        {/* Top horizontal line */}
                                        <rect x="40" y="40" width="120" height="20" fill="white" rx="10" className={`${styles.pulsingLine} ${styles.line2}`} />

                                        {/* Middle horizontal line (shorter) */}
                                        <rect x="90" y="85" width="70" height="20" fill="white" rx="10" className={`${styles.pulsingLine} ${styles.line3}`} />

                                        {/* Small square/dot bottom right */}
                                        <rect x="125" y="125" width="25" height="25" fill="white" rx="6" className={`${styles.pulsingLine} ${styles.line4}`} />
                                    </svg>
                                </div>

                                <h1 className={styles.welcomeTitle}>
                                    {selectedAI === 'Claude' && 'flokkk A.I'}
                                </h1>
                                <div className={`${aiChatStyles.chatMessage} ${aiChatStyles.system}`}>
                                    <div className={aiChatStyles.messageContent}>
                                        Hi there, {getTimeBasedGreeting()}! How can I assist you today?
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Regular Messages - Filter out system messages when user hasn't sent any messages yet */}
                        {messages
                            .filter(message => hasUserMessages || message.type !== 'system')
                            .map((message) => (
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

                    {/* Replace the input form with AiChat component */}
                    <div className={styles.inputSection}>
                        <AiChat onSubmit={handleSubmit} />
                    </div>
                </div>
            </div>
        </div>
    );
}