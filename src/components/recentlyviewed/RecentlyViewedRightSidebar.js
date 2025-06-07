// src/components/recentlyviewed/RecentlyViewedRightSidebar.js
import { useRef, useState, useEffect, useCallback } from 'react';
import RotatingNewsContainer from '@/components/widgets/rotatingNewsContainer';
import QuickActions from '@/components/widgets/quickActions';
import AiChat from '@/components/aichat/AiChat';
import aiChatStyles from '@/components/aichat/AiChat.module.css';
import styles from './RecentlyViewedRightSidebar.module.css';

export default function RecentlyViewedRightSidebar({
  user,
  isRightSidebarVisible = true,
  isMobileView = false,
  onClose,
  onWidthChange
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(330);

  // Chat related states
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Check if there are any user messages to determine header visibility
  const hasUserMessages = messages.some(message => message.type === 'user');

  // Handle quick action selection
  const handleQuickAction = useCallback((action) => {
    switch (action) {
      case 'explore':
        window.location.href = '/explore';
        break;
      case 'trending':
        console.log('Trending action selected');
        break;
      case 'create':
        window.location.href = '/home';
        break;
      default:
        break;
    }
  }, []);

  // Handle mobile close if provided
  const handleClose = useCallback(() => {
    if (onClose && isMobileView) {
      onClose();
    }
  }, [onClose, isMobileView]);

  // Update CSS variables when sidebar width changes
  useEffect(() => {
    // Update the document root for global access
    document.documentElement.style.setProperty('--sidebar-width', `${rightSidebarWidth}px`);
    document.documentElement.style.setProperty('--toggle-position', `${rightSidebarWidth + 15}px`);
  }, [rightSidebarWidth]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Resize functionality for right sidebar
  const startResizing = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);

    // Apply global cursor styles directly
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Add class to disable pointer events on other elements
    document.body.style.pointerEvents = 'none';
    // Re-enable pointer events on the sidebar for resize functionality
    if (containerRef.current) {
      containerRef.current.style.pointerEvents = 'auto';
    }
  }, []);

  // Listen for mouse events during resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

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

      // Notify parent component of width change
      if (onWidthChange) {
        onWidthChange(constrainedWidth);
      }
    };

    const handleMouseUp = () => {
      if (!isResizing) return;

      // Clean up global styles
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';

      if (containerRef.current) {
        containerRef.current.style.pointerEvents = '';
      }
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
  }, [isResizing, onWidthChange]);

  // Load saved width on mount and notify parent immediately
  useEffect(() => {
    const savedWidth = localStorage.getItem('rightSidebarWidth');
    if (savedWidth) {
      const width = Number(savedWidth);
      setRightSidebarWidth(width);
      // Immediately notify parent component of the loaded width
      if (onWidthChange) {
        onWidthChange(width);
      }
    }
  }, [onWidthChange]);

  // Enhanced function to handle AI chat submission with show more functionality
  const handleAiChatSubmit = async (message) => {
    if (!message.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

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
          message: message,
          username: user?.username || 'Anonymous User'
        })
      };

      // Make API request to your backend Claude endpoint
      const response = await fetch('/api/ai/claude', requestOptions);

      // Handle response and add the message
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
      setError(err.message || 'Failed to get a response from Claude AI');

      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again later.'
      };

      setMessages(prev => [...prev, errorMessage]);

      // Re-throw the error so AiChat component can handle rate limiting
      throw err;
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
    const messagesContainer = containerRef.current?.querySelector(`.${styles.messagesContainer}`);
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

  // Add or update welcome message when component mounts or user changes
  useEffect(() => {
    console.log('useEffect triggered - User object received:', user);

    // Don't create welcome message for fallback/guest users - wait for real user data
    if (!user || user.name === 'Guest' || user.username === 'Guest') {
      console.log('Skipping welcome message - waiting for real user data or user is Guest');
      return;
    }

    // Get username from user object with robust fallback logic
    let username = 'there'; // default fallback

    if (user) {
      // Try username first, then name, then email prefix as last resort
      username = user.username ||
        user.name ||
        (user.email ? user.email.split('@')[0] : 'there');
    }

    // Clean the username (remove any @ symbols or spaces)
    const cleanUsername = username.replace(/[@\s]/g, '');

    console.log('Creating/updating welcome message for:', cleanUsername);

    const timeGreeting = getTimeBasedGreeting();
    const welcomeMessage = {
      id: 1,
      type: 'system',
      content: `Hi ${cleanUsername}, ${timeGreeting}! How can I assist you today?`
    };

    // Always set the welcome message when we have real user data
    setMessages([welcomeMessage]);
  }, [user]); // Only depend on user changes

  return (
    <div
      className={`${styles.rightSidebarContainer} ${isRightSidebarVisible ? styles.visible : styles.hidden} ${isResizing ? styles.resizing : ''}`}
      ref={containerRef}
      data-width={rightSidebarWidth}
    >
      {/* Resize handle */}
      <div
        className={`${styles.resizeHandle} ${isResizing ? styles.isResizing : ''}`}
        onMouseDown={startResizing}
        title="Drag to resize"
      >
        <div className={styles.resizeBar}></div>
      </div>

      <div className={styles.sidebarContentWrapper}>
        {/* Main widgets area */}
        <div className={styles.widgetsArea}>
          <div className={styles.widgetsContainer}>
            {/* Rotating News Container */}
            <RotatingNewsContainer />

            {/* Quick Actions */}
            <QuickActions onActionSelect={handleQuickAction} />

            {/* Display chat messages */}
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
        </div>

        {/* Header text - only show when no user messages exist */}
        {!hasUserMessages && (
          <div className={styles.headerText}>
            <p className={styles.promptText}>Something on your mind?</p>
          </div>
        )}

        {/* AI Chat Component - Fixed at bottom */}
        <div className={styles.aiChatWrapper}>
          <AiChat onSubmit={handleAiChatSubmit} />
        </div>
      </div>
    </div>
  );
}