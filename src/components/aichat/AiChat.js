'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import styles from './AiChat.module.css';

export default function AiChat({ onSubmit }) {
    const { theme } = useTheme();
    const router = useRouter();
    const [inputValue, setInputValue] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [requestsRemaining, setRequestsRemaining] = useState(0);
    const [requestsLimit, setRequestsLimit] = useState(30);
    const [resetTime, setResetTime] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [rateLimitError, setRateLimitError] = useState(false);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [minutesUntilReset, setMinutesUntilReset] = useState(0);
    const [authStatus, setAuthStatus] = useState('loading');
    
    // Web search quota state
    const [webSearchQuota, setWebSearchQuota] = useState({
        remaining: 0,
        used: 0,
        limit: 30,
        resetTime: null
    });
    const [isWebSearching, setIsWebSearching] = useState(false);
    const [webSearchError, setWebSearchError] = useState(null);
    
    // NEW: Per-message web search tracking
    const [webSearchedQueries, setWebSearchedQueries] = useState(new Set());
    const [currentWebSearchingQuery, setCurrentWebSearchingQuery] = useState(null);
    
    const inputRef = useRef(null);

    // Helper function to generate a unique ID for queries
    const generateQueryId = useCallback((query) => {
        // Simple hash function for query identification
        return query.toLowerCase().trim().replace(/\s+/g, '_');
    }, []);

    // Check authentication status on component mount
    useEffect(() => {
        const checkAuthStatus = () => {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setAuthStatus('guest');
                return;
            }
            
            const isVerified = localStorage.getItem('isVerified') === 'true';
            setAuthStatus(isVerified ? 'verified' : 'unverified');
        };
        
        checkAuthStatus();
    }, []);

    // Fetch initial rate limit status (ENHANCED for web search quota)
    const fetchRateLimitStatus = useCallback(async () => {
        try {
            setIsLoading(true);
            setRateLimitError(false);

            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const response = await fetch('/api/ai/status', { headers });
            
            if (!response.ok) {
                throw new Error('Failed to fetch status');
            }

            const data = await response.json();
            
            // AI request limits (existing)
            if (data.rateLimits?.manual) {
                const { remainingRequests, maxRequests, resetTime: apiResetTime } = data.rateLimits.manual;
                setRequestsRemaining(remainingRequests);
                setRequestsLimit(maxRequests);
                setResetTime(new Date(apiResetTime));
                setIsRateLimited(remainingRequests <= 0);
            }

            // Web search quota
            if (data.rateLimits?.webSearch) {
                const webQuota = data.rateLimits.webSearch;
                setWebSearchQuota({
                    remaining: webQuota.remaining,
                    used: webQuota.used,
                    limit: webQuota.limit,
                    resetTime: webQuota.resetTime ? new Date(webQuota.resetTime) : null
                });
            } else {
                // Fallback for web search quota
                setWebSearchQuota({
                    remaining: 30,
                    used: 0,
                    limit: 30,
                    resetTime: null
                });
            }
            
        } catch (error) {
            console.error('Error fetching rate limit status:', error);
            setRateLimitError(true);
            setRequestsRemaining(0);
            setRequestsLimit(30);
            setWebSearchQuota({
                remaining: 0,
                used: 0,
                limit: 30,
                resetTime: null
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Calculate minutes until reset
    const calculateMinutesUntilReset = useCallback(() => {
        if (!resetTime) return 0;
        
        const now = new Date();
        const diff = resetTime.getTime() - now.getTime();
        
        if (diff <= 0) {
            fetchRateLimitStatus();
            return 0;
        }
        
        return Math.ceil(diff / (1000 * 60));
    }, [resetTime, fetchRateLimitStatus]);

    // Update minutes countdown every minute when rate limited
    useEffect(() => {
        if (!isRateLimited || !resetTime) return;

        const updateMinutes = () => {
            const minutes = calculateMinutesUntilReset();
            setMinutesUntilReset(minutes);
            
            if (minutes <= 0) {
                setIsRateLimited(false);
                fetchRateLimitStatus();
            }
        };

        updateMinutes();
        const interval = setInterval(updateMinutes, 60000);
        return () => clearInterval(interval);
    }, [isRateLimited, resetTime, calculateMinutesUntilReset, fetchRateLimitStatus]);

    // Fetch rate limit status on component mount
    useEffect(() => {
        fetchRateLimitStatus();
    }, [fetchRateLimitStatus]);

    // ENHANCED: Handle web search requests with per-message tracking
    const handleWebSearch = useCallback(async (query) => {
        console.log('🌐 handleWebSearch called with query:', query);
        
        const queryId = generateQueryId(query);
        console.log('📝 Generated query ID:', queryId);
        console.log('📊 Current web search quota:', webSearchQuota);
        console.log('🔄 Is currently web searching:', isWebSearching);
        console.log('📋 Already searched queries:', Array.from(webSearchedQueries));
        
        // Check if this specific query has already been searched
        if (webSearchedQueries.has(queryId)) {
            console.warn('⚠️ Query already web searched:', queryId);
            return;
        }
        
        if (webSearchQuota.remaining <= 0 || isWebSearching) {
            console.warn('⚠️ Web search blocked:', { 
                quotaRemaining: webSearchQuota.remaining, 
                isWebSearching 
            });
            return;
        }

        try {
            console.log('🚀 Starting web search...');
            setIsWebSearching(true);
            setCurrentWebSearchingQuery(queryId);
            setWebSearchError(null);

            // Mark this query as being searched (optimistic update)
            setWebSearchedQueries(prev => new Set([...prev, queryId]));

            const token = localStorage.getItem('token');
            console.log('🔐 Auth token exists:', !!token);
            
            if (!token) {
                throw new Error('No authentication token found');
            }

            console.log('📡 Making API request to /api/web-search');
            const response = await fetch('/api/web-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query: query,
                    theme: theme
                })
            });

            console.log('📡 API Response status:', response.status);
            console.log('📡 API Response ok:', response.ok);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ API Error:', errorData);
                
                // Remove from searched queries on error
                setWebSearchedQueries(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(queryId);
                    return newSet;
                });
                
                throw new Error(errorData.message || errorData.error || 'Web search failed');
            }

            const data = await response.json();
            console.log('✅ API Success:', data);
            
            // Update quota
            setWebSearchQuota(prev => ({
                ...prev,
                remaining: data.quotaRemaining,
                used: prev.limit - data.quotaRemaining
            }));
            console.log('📊 Updated quota:', data.quotaRemaining);

            // Send web search result to parent component
            if (onSubmit) {
                console.log('📤 Sending result to parent component');
                await onSubmit(query, data.response, true); // true indicates web search result
            } else {
                console.warn('⚠️ No onSubmit function provided');
            }

        } catch (error) {
            console.error('💥 Web search error:', error);
            setWebSearchError(error.message);
            
            // Remove from searched queries on error
            setWebSearchedQueries(prev => {
                const newSet = new Set(prev);
                newSet.delete(queryId);
                return newSet;
            });
            
            // Show error message
            if (onSubmit) {
                const errorMessage = `<div style="color: #ef4444; padding: 10px; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; margin: 8px 0;">
                    ⚠️ Web search failed: ${error.message}
                </div>`;
                await onSubmit(query, errorMessage, true);
            }
        } finally {
            console.log('🏁 Web search completed');
            setIsWebSearching(false);
            setCurrentWebSearchingQuery(null);
        }
    }, [webSearchQuota, isWebSearching, theme, onSubmit, generateQueryId, webSearchedQueries]);

    // ENHANCED: Handle web search button clicks with per-message state
    useEffect(() => {
        const handleWebSearchClick = async (event) => {
            console.log('🖱️ Click event detected:', event.target);
            console.log('🔍 Target classList:', event.target.classList.toString());
            console.log('🔍 Has web-search-button class:', event.target.classList.contains('web-search-button'));
            
            if (event.target.classList.contains('web-search-button')) {
                event.preventDefault();
                console.log('✅ Web search button clicked!');
                
                const query = decodeURIComponent(event.target.dataset.query);
                const queryId = generateQueryId(query);
                
                console.log('📝 Extracted query:', query);
                console.log('📝 Generated query ID:', queryId);
                console.log('📊 Current web search quota:', webSearchQuota);
                console.log('🔄 Is currently web searching:', isWebSearching);
                console.log('📋 Already searched queries:', Array.from(webSearchedQueries));
                
                // Check if this specific query has already been searched
                if (webSearchedQueries.has(queryId)) {
                    console.warn('⚠️ Query already searched, ignoring click');
                    return;
                }
                
                // Check if we can proceed
                if (webSearchQuota.remaining <= 0) {
                    console.warn('⚠️ No web search quota remaining');
                    return;
                }
                
                if (isWebSearching) {
                    console.warn('⚠️ Already performing a web search');
                    return;
                }
                
                // Update button appearance immediately (optimistic UI update)
                event.target.disabled = true;
                event.target.innerHTML = currentWebSearchingQuery === queryId ? 
                    '🔄 Searching...' : 
                    '✅ Searched';
                event.target.style.opacity = '0.6';
                event.target.style.cursor = 'not-allowed';
                
                console.log('🚀 Proceeding with web search...');
                await handleWebSearch(query);
            } else {
                console.log('❌ Not a web search button, ignoring');
            }
        };

        // Enhanced click handler that also manages button states
        const enhancedClickHandler = (event) => {
            // First handle the web search logic
            handleWebSearchClick(event);
            
            // Then update button states for all web search buttons
            setTimeout(() => {
                const allWebSearchButtons = document.querySelectorAll('.web-search-button');
                allWebSearchButtons.forEach(button => {
                    const buttonQuery = decodeURIComponent(button.dataset.query || '');
                    const buttonQueryId = generateQueryId(buttonQuery);
                    
                    if (webSearchedQueries.has(buttonQueryId)) {
                        button.disabled = true;
                        button.innerHTML = '✅ Searched';
                        button.style.opacity = '0.6';
                        button.style.cursor = 'not-allowed';
                        button.style.backgroundColor = '#4ade80';
                        button.style.color = 'white';
                    } else if (currentWebSearchingQuery === buttonQueryId) {
                        button.disabled = true;
                        button.innerHTML = '🔄 Searching...';
                        button.style.opacity = '0.8';
                        button.style.cursor = 'not-allowed';
                    }
                });
            }, 100); // Small delay to ensure DOM is updated
        };

        console.log('🎯 Adding enhanced web search event listener to document');
        document.addEventListener('click', enhancedClickHandler);
        
        return () => {
            console.log('🗑️ Removing web search event listener');
            document.removeEventListener('click', enhancedClickHandler);
        };
    }, [webSearchQuota, isWebSearching, handleWebSearch, generateQueryId, webSearchedQueries, currentWebSearchingQuery]);

    // Update button states when webSearchedQueries or currentWebSearchingQuery changes
    useEffect(() => {
        const updateButtonStates = () => {
            const allWebSearchButtons = document.querySelectorAll('.web-search-button');
            allWebSearchButtons.forEach(button => {
                const buttonQuery = decodeURIComponent(button.dataset.query || '');
                const buttonQueryId = generateQueryId(buttonQuery);
                
                if (webSearchedQueries.has(buttonQueryId)) {
                    button.disabled = true;
                    button.innerHTML = '✅ Searched';
                    button.style.opacity = '0.6';
                    button.style.cursor = 'not-allowed';
                    button.style.backgroundColor = '#4ade80';
                    button.style.color = 'white';
                } else if (currentWebSearchingQuery === buttonQueryId) {
                    button.disabled = true;
                    button.innerHTML = '🔄 Searching...';
                    button.style.opacity = '0.8';
                    button.style.cursor = 'not-allowed';
                    button.style.backgroundColor = '#3b82f6';
                    button.style.color = 'white';
                } else {
                    // Reset to original state
                    button.disabled = false;
                    button.innerHTML = '🌐 Search web for more';
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                    button.style.backgroundColor = '';
                    button.style.color = '';
                }
            });
        };

        // Update on next tick to ensure DOM is ready
        setTimeout(updateButtonStates, 0);
    }, [webSearchedQueries, currentWebSearchingQuery, generateQueryId]);

    // Handle input change
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    // Handle form submission (ENHANCED)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (inputValue.trim() === '' || isRateLimited) return;

        if (authStatus === 'guest') {
            router.push('/login');
            return;
        }

        if (onSubmit) {
            try {
                // Submit the message for community search
                await onSubmit(inputValue);
                
                // Update remaining requests (optimistic update)
                if (requestsRemaining > 0) {
                    const newRemaining = requestsRemaining - 1;
                    setRequestsRemaining(newRemaining);
                    
                    if (newRemaining <= 0) {
                        setIsRateLimited(true);
                        setMinutesUntilReset(calculateMinutesUntilReset());
                    }
                }
            } catch (error) {
                console.error('Error submitting message:', error);
                
                if (error.message && error.message.includes('Rate limit')) {
                    setIsRateLimited(true);
                    setRequestsRemaining(0);
                    setMinutesUntilReset(calculateMinutesUntilReset());
                }
            }
        }

        setInputValue('');
    };

    // Handle focus events
    const handleFocus = () => setIsInputFocused(true);
    const handleBlur = () => setIsInputFocused(false);

    // Render remaining requests status (ENHANCED)
    const renderRemainingRequests = () => {
        if (authStatus === 'guest') {
            return (
                <div className={`${styles.remainingRequests} ${styles.guestStatus}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>Sign in to use flokkk A.I.</span>
                </div>
            );
        }

        if (isLoading) {
            return (
                <div className={styles.remainingRequests}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    </svg>
                    <span>Loading status...</span>
                </div>
            );
        }

        if (rateLimitError) {
            return (
                <div className={`${styles.remainingRequests} ${styles.errorStatus}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>Status unavailable</span>
                </div>
            );
        }

        if (isRateLimited) {
            return (
                <div className={`${styles.remainingRequests} ${styles.rateLimited}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>
                        AI chat limit reached. Try again in {minutesUntilReset} min{minutesUntilReset !== 1 ? 's' : ''}
                    </span>
                </div>
            );
        }

        // Normal status with web search quota
        const isWebSearchLow = webSearchQuota.remaining <= 5;
        
        return (
            <div className={styles.quotaContainer}>
                <div className={`${styles.remainingRequests} ${styles.webSearchQuota} ${isWebSearchLow ? styles.lowRequests : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        <path d="M2 12h20"></path>
                    </svg>
                    <span>Web: {webSearchQuota.remaining}/{webSearchQuota.limit}</span>
                    {webSearchedQueries.size > 0 && (
                        <span style={{ fontSize: '11px', opacity: '0.7', marginLeft: '8px' }}>
                            ({webSearchedQueries.size} searched)
                        </span>
                    )}
                </div>
            </div>
        );
    };

    // Get placeholder text based on auth status
    const getPlaceholderText = () => {
        if (authStatus === 'guest') return "Sign in to use flokkk A.I.";
        if (isRateLimited) return "AI chat limit reached...";
        if (isWebSearching) return "Web searching...";
        return "Ask flokkk...";
    };

    // Determine if the button should be disabled
    const isButtonDisabled = inputValue.trim() === '' || isRateLimited || authStatus === 'guest' || isWebSearching;

    return (
        <div className={styles.aiChatContainer}>
            {/* Web search loading indicator */}
            {isWebSearching && (
                <div className={styles.webSearchLoading}>
                    <div className={styles.loadingSpinner}></div>
                    <span>Searching the web{currentWebSearchingQuery ? ` for "${currentWebSearchingQuery}"...` : '...'}</span>
                </div>
            )}
            
            {/* Web search error display */}
            {webSearchError && (
                <div className={styles.webSearchError}>
                    <span>⚠️ {webSearchError}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className={styles.inputForm}>
                <div className={`${styles.inputContainer} ${isInputFocused ? styles.focused : ''} ${isRateLimited || authStatus === 'guest' ? styles.disabled : ''}`}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder={getPlaceholderText()}
                        className={styles.inputField}
                        disabled={isRateLimited || authStatus === 'loading' || isWebSearching}
                    />
                    <button
                        type="submit"
                        className={styles.askButton}
                        disabled={isButtonDisabled}
                    >
                        {authStatus === 'guest' ? 'Sign In' : 'Ask'}
                    </button>
                </div>

                {renderRemainingRequests()}
            </form>
        </div>
    );
}