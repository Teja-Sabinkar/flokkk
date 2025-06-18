import { useRef, useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext'; // Add theme context import
import { useRouter } from 'next/navigation'; // Add router import
import RotatingNewsContainer from '@/components/widgets/rotatingNewsContainer';
import QuickActions from '@/components/widgets/quickActions';
import AiChat from '@/components/aichat/AiChat';
import aiChatStyles from '@/components/aichat/AiChat.module.css';
import styles from './ExploreRightSidebar.module.css';

export default function ExploreRightSidebar({
  user,
  isRightSidebarVisible = true,
  isMobileView = false,
  onClose,
  onWidthChange
}) {
  const { theme } = useTheme(); // Add theme context
  const router = useRouter(); // Add router for redirects
  const [isResizing, setIsResizing] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(330);

  // Add auth status tracking
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading', 'guest', 'unverified', 'verified'

  // Chat related states
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setAuthStatus('guest');
        return;
      }

      // Check if user is verified
      const isVerified = localStorage.getItem('isVerified') === 'true';
      setAuthStatus(isVerified ? 'verified' : 'unverified');
    };

    checkAuthStatus();
  }, []);

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

  // Enhanced function to handle AI chat submission with authentication check
  const handleAiChatSubmit = async (message, response = null, isWebSearch = false) => {
    console.log('🎯 ExploreRightSidebar onSubmit called:', {
      message,
      hasResponse: !!response,
      isWebSearch,
      responseLength: response?.length || 0
    });

    if (!message.trim() || isLoading) return;

    // Check if user is authenticated
    if (authStatus === 'guest') {
      router.push('/login');
      return;
    }

    // CRITICAL FIX: If this is a web search response, just display it!
    if (isWebSearch && response) {
      console.log('🌐 Displaying web search response directly');

      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: message,
      };

      const webSearchMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response, // Use the web search response directly
        isWebSearch: true
      };

      setMessages(prev => [...prev, userMessage, webSearchMessage]);

      // Don't make any additional API calls!
      return;
    }

    // Only make community search API call if it's NOT a web search
    console.log('🏠 Making community search for:', message);

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
          message: message.trim(), // Ensure clean message for better keyword extraction
          username: user?.username || 'Anonymous User',
          source: 'manual' // Explicitly mark as manual query for proper processing
        })
      };

      // Make API request to your backend Claude endpoint
      const apiResponse = await fetch('/api/ai/claude', requestOptions);

      // Handle response and add the message
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();

        // Check if it's a rate limit error
        if (apiResponse.status === 429) {
          throw new Error(`Rate limit exceeded: ${errorData.message}`);
        }

        throw new Error(`Error: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();

      // Add AI response message
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.response || "I'm sorry, I couldn't process your request.",
        isWebSearch: false
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

  // Helper function to handle show more requests with authentication check
  const handleShowMoreRequest = async (type, originalQuery, element) => {
    if (isLoading) return;

    // Check if user is authenticated
    if (authStatus === 'guest') {
      // Redirect to login page if not authenticated
      router.push('/login');
      return;
    }

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
          message: 'Show more content', // Standard message for show more requests
          username: user?.username || 'Anonymous User',
          source: 'manual', // Ensure proper processing path
          showMoreType: type,
          originalQuery: originalQuery.trim() // Clean query for better keyword extraction
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

  // Add click event listeners for dynamically generated content with authentication check
  useEffect(() => {
    const handleDynamicClicks = (event) => {
      const target = event.target;

      // Check for authentication before handling any dynamic clicks
      if (authStatus === 'guest') {
        router.push('/login');
        return;
      }

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
  }, [messages, isLoading, user, authStatus, router]);

  // Initialize messages based on authentication status
  useEffect(() => {
    console.log('useEffect triggered - User object received:', user);
    console.log('Auth status:', authStatus);

    if (authStatus === 'guest') {
      const timeGreeting = getTimeBasedGreeting();
      setMessages([
        {
          id: 1,
          type: 'system',
          content: `Hi @there<br/><span style="font-size: 2em; font-weight: 500;">${timeGreeting}</span>`,
        },
        {
          id: 2,
          type: 'system',
          content: 'Sign in to use flokkk A.I. assistant and get personalized help.',
        }
      ]);
    } else if (authStatus === 'verified' && user && user.username !== 'Guest') {
      // More robust username extraction with multiple fallbacks
      let username = 'there';
      if (user) {
        username = user.username || user.name || (user.email ? user.email.split('@')[0] : 'there');
      }

      // Clean username by removing @ symbols and spaces
      const cleanUsername = username.replace(/[@\s]/g, '');

      console.log('Creating/updating welcome message for:', cleanUsername);

      const welcomeMessage = {
        id: 1,
        type: 'system',
        content: getUserGreeting()
      };

      setMessages([welcomeMessage]);
    }
  }, [authStatus, user]);

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