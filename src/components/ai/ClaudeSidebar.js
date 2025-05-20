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
    const [dailyInsight, setDailyInsight] = useState('');

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);



    // Generate daily insight based on time of day and user activity
    const generateDailyInsight = () => {
        const insights = [
            "💡 Did you know? Users who engage with 3+ discussions daily are 40% more likely to discover interesting content!",
            "🌟 Today's tip: Try exploring a new category you haven't visited before - you might find your next favorite topic!",
            "🚀 Platform insight: Video discussions get 25% more engagement than text-only posts on average.",
            "🎯 Quick tip: Using specific keywords in your searches helps you find exactly what you're looking for.",
            "📊 Fun fact: The most active discussion time is between 2-4 PM - perfect for engaging conversations!",
            "🔥 Today's trend: AI and technology discussions are seeing unprecedented engagement this week.",
            "💬 Community insight: Users who comment thoughtfully get more meaningful responses and connections.",
            "⭐ Did you know? Saving posts to playlists helps you build your personal knowledge library over time."
        ];
        
        const today = new Date();
        const dayIndex = today.getDate() % insights.length;
        return insights[dayIndex];
    };

    // Update daily insight when user changes
    useEffect(() => {
        setDailyInsight(generateDailyInsight());
    }, [user]);

    // Simulated platform stats update (in real app, this would come from API)
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
        const interval = setInterval(updateStats, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle input change
    const handleInputChange = (e) => {
        setInputText(e.target.value);
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || isLoading) return;

        // Add user message
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
            // Get token for authentication
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            // Prepare the request
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

            // Add AI response message
            const aiResponse = {
                id: Date.now() + 1,
                type: 'ai',
                content: data.response || "I'm sorry, I couldn't process your request."
            };

            setMessages(prev => [...prev, aiResponse]);

        } catch (err) {
            console.error('Error communicating with AI:', err);
            setError(err.message || 'Failed to get a response');

            // Add error message
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

    // Suggest questions for the AI
    const getSuggestedQuestions = () => {
        return [
            "What discussions are trending right now?",
            "Can you help me find interesting topics?",
            "What's new in gaming discussions?",
            "How can I contribute to a discussion?"
        ];
    };

    // Use a suggested question
    const useSuggestion = (suggestion) => {
        setInputText(suggestion);
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    // Handle quick action buttons
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
            {/* Chat messages with new dashboard section */}
            <div className={styles.chatMessages}>
                {/* New Dashboard Section */}
                <div className={styles.dashboardSection}>
                    {/* Platform Stats */}
                    <div className={styles.statsContainer}>
                        <h3 className={styles.sectionTitle}>Platform Pulse</h3>
                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <div className={styles.statNumber}>{platformStats.activeUsers}</div>
                                <div className={styles.statLabel}>Active Now</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statNumber}>{platformStats.todaysPosts}</div>
                                <div className={styles.statLabel}>Today's Posts</div>
                            </div>
                        </div>
                        <div className={styles.trendingTopic}>
                            <span className={styles.trendingLabel}>🔥 Trending:</span>
                            <span className={styles.trendingText}>{platformStats.trendingTopic}</span>
                        </div>
                    </div>

                    {/* Daily Insight */}
                    <div className={styles.insightContainer}>
                        <div className={styles.dailyInsight}>
                            {dailyInsight}
                        </div>
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

                {/* AI messages */}
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

            {/* Chat input at the bottom of the sidebar */}
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