'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import HomeFeed from '@/components/home/HomeFeed';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import styles from './page.module.css';

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(330);
  const [initialX, setInitialX] = useState(0);
  const [initialWidth, setInitialWidth] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Add state for right sidebar visibility and mobile view detection
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(() => {
    // Initially visible only if screen width >= 1300px (desktop)
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1300;
    }
    return true; // Default to true for SSR
  });
  const [isMobileView, setIsMobileView] = useState(false);

  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Function to get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon";
    } else if (hour >= 17 && hour < 21) {
      return "Good Evening";
    } else if (hour >= 21 && hour < 24) {
      return "Good Late Evening";
    } else {
      return "Good Early Morning";
    }
  };

  // Format username for greeting with larger time-based greeting
  const getUserGreeting = () => {
    const username = user?.username || 'there';
    const timeGreeting = getTimeBasedGreeting();
    return `Hi @${username}<br/><span style="font-size: 2em; font-weight: 500;">${timeGreeting}</span>`;
  };

  // Update greeting message when user changes
  useEffect(() => {
    setMessages([
      {
        id: 2,
        type: 'system',
        content: getUserGreeting(),
      }
    ]);
  }, [user]);

  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth < 1300;
      setIsMobileView(isMobile);

      // If not in mobile view, ensure sidebar is visible
      if (!isMobile) {
        setIsRightSidebarVisible(true);
      }
    };

    // Check initially
    checkMobileView();

    // Set up event listener for window resize
    window.addEventListener('resize', checkMobileView);

    // Clean up
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Fetch user data if not using a context
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');

      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            // Ensure we have a valid avatar URL or null
            userData.avatar = userData.avatar || null;
            setUser(userData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, []);

  // If no user data from API, provide a fallback
  const userWithFallback = user || {
    name: 'Guest',
    avatar: null,
    notifications: 0
  };

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle overlay click to close sidebar
  const handleOverlayClick = () => {
    setIsSidebarOpen(false);
  };

  // Define the right sidebar toggle function
  const handleRightSidebarToggle = () => {
    setIsRightSidebarVisible(!isRightSidebarVisible);
  };

  // Update CSS variable when sidebar width changes
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${rightSidebarWidth}px`);
  }, [rightSidebarWidth]);

  // Resize functionality for right sidebar
  const startResizing = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Store initial positions
    setInitialX(e.clientX);
    setInitialWidth(rightSidebarWidth);

    // Update state
    setIsResizing(true);

    // Apply global styles
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Add a debug class to the body
    document.body.classList.add('resizing-active');
  };

  // Listen for mouse events during resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      // Calculate the width from the window width, not relative to the parent
      const windowWidth = window.innerWidth;
      const newWidth = windowWidth - e.clientX;

      // Apply constraints
      const minWidth = 250;
      const maxWidth = Math.min(600, windowWidth * 0.4);
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

      // Update state
      setRightSidebarWidth(constrainedWidth);

      // Store the width in localStorage
      localStorage.setItem('rightSidebarWidth', constrainedWidth.toString());
    };

    const handleMouseUp = () => {
      if (!isResizing) return;

      // Clean up
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.classList.remove('resizing-active');
    };

    // Only add listeners when resizing is active
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    // Clean up
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, rightSidebarWidth]);

  // Load saved width on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('rightSidebarWidth');
    if (savedWidth) {
      setRightSidebarWidth(Number(savedWidth));
    }
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

  return (
    <div className={styles.pageContainer}>
      {/* Header fixed at the top */}
      <div className={styles.headerContainer}>
        <Header
          user={userWithFallback}
          onMenuToggle={toggleSidebar}
          isMobileMenuOpen={isSidebarOpen}
        />
      </div>

      {/* Main content area with three columns */}
      <div className={styles.mainContent}>
        {/* Left sidebar with navigation */}
        <div className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.open : ''}`}>
          <div className={styles.sidebarScrollable}>
            <SidebarNavigation isOpen={isSidebarOpen} />
          </div>
        </div>

        {/* Mobile overlay for sidebar - only covers the content area */}
        {isSidebarOpen && (
          <div
            className={styles.mobileOverlay}
            onClick={handleOverlayClick}
          />
        )}

        {/* Middle content with HomeFeed */}
        <div className={`${styles.feedContainer} ${isMobileView && !isRightSidebarVisible ? styles.expandedFeed : ''}`}>
          <div className={styles.feedScrollable}>
            <HomeFeed />
          </div>
        </div>


        {/* Right sidebar toggle button - Only visible on mobile */}
        {isMobileView && (
          <button
            className={`${styles.rightSidebarToggle} ${isRightSidebarVisible ? styles.active : ''}`}
            onClick={handleRightSidebarToggle}
            aria-label="Toggle AI sidebar"
          >
            <span className={styles.aiText}>flock</span>
          </button>
        )}


        {/* Right sidebar with AI and Recently Viewed */}
        <div
          className={`${styles.rightSidebarContainer} ${isRightSidebarVisible ? styles.visible : ''}`}
          ref={containerRef}
          style={{
            width: `${rightSidebarWidth}px`,
            minWidth: `${rightSidebarWidth}px`,
            maxWidth: `${rightSidebarWidth}px`
          }}
        >
          {/* Resize handle like in Discussion page */}
          <div
            className={`${styles.resizeHandle} ${isResizing ? styles.isResizing : ''}`}
            onMouseDown={startResizing}
            title="Drag to resize"
          >
            <div className={styles.resizeBar}></div>
          </div>

          <div className={styles.rightSidebarScrollable}>
            {/* Chat messages with RecentlyViewed inside it */}
            <div className={styles.chatMessages}>
              {/* RecentlyViewed component at the top of the chat messages */}
              <div className={styles.recentlyViewedWrapper}>
                <RecentlyViewed initialItemCount={3} />
              </div>

              {/* Chat divider to separate RecentlyViewed from AI messages */}
              <div className={styles.chatDivider}>
                <div className={styles.chatDividerLine}></div>
              </div>

              {/* Time-based greeting */}
              <div className={styles.sectionHeader}>
                <div dangerouslySetInnerHTML={{ __html: getUserGreeting() }} />
              </div>

              {/* AI messages */}
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
        </div>
      </div>
    </div>
  );
}