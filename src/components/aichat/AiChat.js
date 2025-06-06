'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './AiChat.module.css';

export default function AiChat({ onSubmit }) {
    const [inputValue, setInputValue] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [requestsRemaining, setRequestsRemaining] = useState(0);
    const [requestsLimit, setRequestsLimit] = useState(30);
    const [resetTime, setResetTime] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [rateLimitError, setRateLimitError] = useState(false);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [minutesUntilReset, setMinutesUntilReset] = useState(0);
    const inputRef = useRef(null);

    // Fetch initial rate limit status
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
            
            if (data.rateLimits?.manual) {
                const { remainingRequests, maxRequests, resetTime: apiResetTime } = data.rateLimits.manual;
                setRequestsRemaining(remainingRequests);
                setRequestsLimit(maxRequests);
                setResetTime(new Date(apiResetTime));
                setIsRateLimited(remainingRequests <= 0);
            } else {
                // Fallback to unknown status
                setRateLimitError(true);
                setRequestsRemaining(0);
                setRequestsLimit(30);
            }
        } catch (error) {
            console.error('Error fetching rate limit status:', error);
            setRateLimitError(true);
            setRequestsRemaining(0);
            setRequestsLimit(30);
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
            // Reset time has passed, refresh rate limit status
            fetchRateLimitStatus();
            return 0;
        }
        
        return Math.ceil(diff / (1000 * 60)); // Convert to minutes
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

        // Update immediately
        updateMinutes();

        // Then update every minute
        const interval = setInterval(updateMinutes, 60000);

        return () => clearInterval(interval);
    }, [isRateLimited, resetTime, calculateMinutesUntilReset, fetchRateLimitStatus]);

    // Fetch rate limit status on component mount
    useEffect(() => {
        fetchRateLimitStatus();
    }, [fetchRateLimitStatus]);

    // Handle input change
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (inputValue.trim() === '' || isRateLimited) return;

        // Call the onSubmit prop with the input value
        if (onSubmit) {
            try {
                // Submit the message
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
                
                // If it's a rate limit error, update the state
                if (error.message && error.message.includes('Rate limit')) {
                    setIsRateLimited(true);
                    setRequestsRemaining(0);
                    setMinutesUntilReset(calculateMinutesUntilReset());
                }
            }
        }

        // Clear input after submission
        setInputValue('');
    };

    // Handle focus events
    const handleFocus = () => setIsInputFocused(true);
    const handleBlur = () => setIsInputFocused(false);

    // Render remaining requests status
    const renderRemainingRequests = () => {
        if (isLoading) {
            return (
                <div className={styles.remainingRequests}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    </svg>
                    <span>Loading rate limit status...</span>
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
                    <span>Unknown rate limit status</span>
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
                        Rate limit reached. Try again in {minutesUntilReset} min{minutesUntilReset !== 1 ? 's' : ''}
                    </span>
                </div>
            );
        }

        // Normal status
        const isLow = requestsRemaining <= 5;
        return (
            <div className={`${styles.remainingRequests} ${isLow ? styles.lowRequests : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>{requestsRemaining}/{requestsLimit} requests remaining</span>
            </div>
        );
    };

    return (
        <div className={styles.aiChatContainer}>
            <form onSubmit={handleSubmit} className={styles.inputForm}>
                <div className={`${styles.inputContainer} ${isInputFocused ? styles.focused : ''} ${isRateLimited ? styles.disabled : ''}`}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder={isRateLimited ? "Rate limit reached..." : "Ask flokkk..."}
                        className={styles.inputField}
                        disabled={isRateLimited}
                    />
                    <button
                        type="submit"
                        className={styles.askButton}
                        disabled={inputValue.trim() === '' || isRateLimited}
                    >
                        Ask
                    </button>
                </div>

                {renderRemainingRequests()}
            </form>
        </div>
    );
}