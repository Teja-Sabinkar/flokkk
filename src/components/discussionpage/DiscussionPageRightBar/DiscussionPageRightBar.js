'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import styles from './DiscussionPageRightBar.module.css';
import RecommendationItems from './RecommendationItems';

export default function DiscussionPageRightBar(props) {
  // Extract postData safely with better fallback handling
  const postData = props.postData || null;
  const { user } = useUser();
  
  // Refs for elements
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  
  // State for resize functionality
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(330);
  const [initialX, setInitialX] = useState(0);
  const [initialWidth, setInitialWidth] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Add state for input expansion
  const [textareaHeight, setTextareaHeight] = useState('auto');
  const [inputRows, setInputRows] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Enhanced postData for recommendations
  const [enhancedPostData, setEnhancedPostData] = useState(null);
  
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
  
  const [messages, setMessages] = useState([
    {
      id: 2,
      type: 'system',
      content: getUserGreeting(),
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [dbDataAvailable, setDbDataAvailable] = useState([]);
  const [hasInteracted, setHasInteracted] = useState(false); 
  const messagesEndRef = useRef(null);

  // Effect to check and update mobile view state
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 1300);
    };
    
    // Initial check
    checkMobileView();
    
    // Add listener for resize events
    window.addEventListener('resize', checkMobileView);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // New effect to enhance postData for recommendations by combining data sources
  useEffect(() => {
    if (!postData) {
      setEnhancedPostData(null);
      return;
    }
    
    // Search for DiscussionPageCenterTop post data from parent elements
    const centerTopPostData = findCenterTopPostData();
    
    // Merge any found data with our existing postData
    const mergedData = {
      ...postData,
      // Allow centerTopData to override if available
      ...(centerTopPostData || {})
    };
    
    // Normalize property names for consistency (different components use different names)
    const normalizedData = {
      ...mergedData,
      id: mergedData.id || mergedData._id,
      title: mergedData.title || '',
      content: mergedData.content || '',
      // Map hashtags and tags to each other (some components use one or the other)
      hashtags: mergedData.hashtags || mergedData.tags || [],
      tags: mergedData.tags || mergedData.hashtags || [],
      // Map username and author to each other
      username: mergedData.username || mergedData.author || '',
      author: mergedData.author || mergedData.username || ''
    };
    
    setEnhancedPostData(normalizedData);
  }, [postData]);

  // Helper function to find post data from DiscussionPageCenterTop
  const findCenterTopPostData = () => {
    try {
      // Look for an element that might contain the current post title
      const titleElement = document.querySelector('h1.postTitle') || document.querySelector('.postTitle');
      
      if (!titleElement) return null;
      
      const title = titleElement.textContent || '';
      
      // Find author element nearby
      const authorElement = document.querySelector('.authorLink') || document.querySelector('.creatorInfo span');
      const author = authorElement ? (authorElement.textContent || '').trim() : '';
      
      // Find tags if available
      const tagElements = document.querySelectorAll('.tag');
      const tags = Array.from(tagElements).map(el => (el.textContent || '').trim());
      
      // Find content
      const contentElement = document.querySelector('.postContent p');
      const content = contentElement ? (contentElement.textContent || '').trim() : '';
      
      // Only return data if we found at least a title
      if (title) {
        return {
          title,
          author,
          tags,
          content
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Error finding center top post data:', error);
      return null;
    }
  };

  // Improved resize start function - Only works if not in mobile view
  const startResizing = (e) => {
    // Skip resizing if in mobile view
    if (isMobileView) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Store initial positions
    setInitialX(e.clientX);
    setInitialWidth(sidebarWidth);
    
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
      setSidebarWidth(constrainedWidth);
      
      // Store the width in localStorage
      localStorage.setItem('rightBarWidth', constrainedWidth.toString());
      
      // Update the parent element directly via class selector
      const rightBarWrapper = document.querySelector('.rightBarWrapper');
      if (rightBarWrapper) {
        rightBarWrapper.style.width = `${constrainedWidth}px`;
        rightBarWrapper.style.minWidth = `${constrainedWidth}px`;
        rightBarWrapper.style.maxWidth = `${constrainedWidth}px`;
      }
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
  }, [isResizing, sidebarWidth]);

  // Load saved width on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('rightBarWidth');
    if (savedWidth) {
      const width = Number(savedWidth);
      setSidebarWidth(width);
      
      // Initialize parent element too
      setTimeout(() => {
        const rightBarWrapper = document.querySelector('.rightBarWrapper');
        if (rightBarWrapper && !isMobileView) {
          rightBarWrapper.style.width = `${width}px`;
          rightBarWrapper.style.minWidth = `${width}px`;
          rightBarWrapper.style.maxWidth = `${width}px`;
        }
      }, 0);
    }
  }, []); // Don't depend on isMobileView here, check inside instead

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleShowMoreClick = async (e) => {
      // Check if the click was on a show-more-results button
      if (e.target.classList.contains('show-more-results')) {
        e.preventDefault();

        // Get the original query from the data attribute
        const originalQuery = decodeURIComponent(e.target.dataset.query || '');
        // Get the type of show more (db or ai)
        const type = e.target.dataset.type || 'db'; // Default to db for backward compatibility

        if (originalQuery) {
          // Add a system message indicating expanded results are being loaded
          const systemMessage = {
            id: Date.now(),
            type: 'system',
            content: `Loading expanded ${type === 'db' ? 'database' : 'AI'} information...`
          };

          setMessages(prev => [...prev, systemMessage]);
          setIsLoading(true);
          setHasInteracted(true); // Mark as interacted when showing more results

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

  // Handle input change
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    
    // Check if we should expand the input
    if (text.trim().length > 0) {
      setIsExpanded(true);
      
      // Count rows to determine height
      const rows = text.split('\n').length;
      const newRows = Math.min(5, Math.max(1, rows)); // Limit to 5 rows max
      setInputRows(newRows);
      
      // Dynamically adjust height using scrollHeight
      if (textareaRef.current) {
        // Reset height temporarily to get accurate scrollHeight
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;
        
        // Set a min and max height (between default height and 120px)
        const newHeight = Math.min(120, Math.max(43, scrollHeight));
        setTextareaHeight(`${newHeight}px`);
        textareaRef.current.style.height = `${newHeight}px`;
      }
    } else {
      // Reset to default size when empty
      setIsExpanded(false);
      setInputRows(1);
      setTextareaHeight('auto');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Process message text to identify database commands
  const extractDataCommands = (message) => {
    const commands = [];

    // Always include a comprehensive search for most relevant content
    commands.push({
      type: 'comprehensive_search',
      query: message,
      limit: 10
    });

    // For the current post, always get detailed info
    // Use the enhanced post data that combines sources
    if (enhancedPostData) {
      const postId = enhancedPostData.id || enhancedPostData._id;
      if (postId) {
        commands.push({
          type: 'get_post',
          postId: postId
        });
      }
    }

    return commands;
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
    setDbDataAvailable([]);
    setHasInteracted(true); // Mark as interacted when a message is submitted
    
    // Reset textarea height
    setIsExpanded(false);
    setInputRows(1);
    setTextareaHeight('auto');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await sendMessageToAI(inputText);
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
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessageToAI = async (message, showMoreDb = false, showMoreAi = false) => {
    // Enhanced context preparation using both passed postData and enhanced data
    let context = '';
    const contextData = enhancedPostData || postData;
    
    if (contextData) {
      context = `The current discussion is titled "${contextData.title || 'Untitled'}". `;
      if (contextData.content) {
        context += `The post content is: "${contextData.content}". `;
      }
      
      // Use either hashtags or tags, depending on what's available
      const tags = contextData.hashtags || contextData.tags;
      if (tags && tags.length > 0) {
        context += `The discussion has these hashtags: ${tags.join(', ')}. `;
      }
      
      // Use either username or author, depending on what's available
      const creator = contextData.username || contextData.author;
      if (creator) {
        context += `The post was created by user: ${creator}. `;
      }
    }

    // Extract potential database commands from the message
    const dataCommands = extractDataCommands(message);

    // Get authentication token
    const token = localStorage.getItem('token');

    // Prepare request
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

    // Make API request to your backend Claude endpoint
    const response = await fetch('/api/ai/claude', requestOptions);

    // Handle response and add the message
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

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
  };

  // Command suggestions based on available data
  const getCommandSuggestions = () => {
    // Use the enhanced post data that includes info from DiscussionPageCenterTop
    const contextData = enhancedPostData || postData;
    if (!contextData) return [];

    // Get the first hashtag/tag, whichever is available
    const tags = contextData.hashtags || contextData.tags;
    const firstTag = tags && tags.length > 0 ? tags[0] : 'this topic';
    
    // Get creator username, either from username or author property
    const creator = contextData.username || contextData.author;

    const commands = [
      `What's this discussion about?`,
      `Search for posts about ${firstTag}`,
      `Find related discussions`
    ];

    if (creator) {
      commands.push(`Tell me about user @${creator}`);
    }

    commands.push("What's trending on the platform?");

    return commands;
  };

  // Commands handler for keyboard shortcuts
  const handleKeyDown = (e) => {
    // Handle newlines and submissions
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === '/' && inputText === '') {
      // Show commands menu
      e.preventDefault();
      setInputText('/');
    }
  };

  // Suggest questions based on post content
  const getSuggestedQuestions = () => {
    const contextData = enhancedPostData || postData;
    if (!contextData) return [];

    const titleFragment = contextData.title ? 
      `"${contextData.title?.substring(0, 30)}${contextData.title?.length > 30 ? '...' : ''}"` : 
      "this discussion";

    const suggestions = [
      `Can you summarize ${titleFragment}?`,
      "What are the key points in this discussion?",
      "Can you help me understand this topic better?",
      "What similar topics might I be interested in?"
    ];

    return suggestions;
  };

  // Use a suggested question
  const useSuggestion = (suggestion) => {
    setInputText(suggestion);
    
    // Expand the input for the suggestion
    setIsExpanded(true);
    const rows = suggestion.split('\n').length;
    setInputRows(Math.min(5, Math.max(1, rows)));
    
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Delay to ensure the DOM updates
      setTimeout(() => {
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;
        const newHeight = Math.min(120, Math.max(43, scrollHeight));
        setTextareaHeight(`${newHeight}px`);
        textareaRef.current.style.height = `${newHeight}px`;
      }, 0);
    }
  };

  // Effect to update container width when mobile view changes
  useEffect(() => {
    // When mobile view changes, update container styles appropriately
    if (isMobileView) {
      const rightBarWrapper = document.querySelector('.rightBarWrapper');
      if (rightBarWrapper) {
        // Reset fixed widths when in mobile view
        rightBarWrapper.style.width = '100%';
        rightBarWrapper.style.minWidth = '100%';
        rightBarWrapper.style.maxWidth = '100%';
      }
    } else {
      // Apply saved width when not in mobile view
      const savedWidth = localStorage.getItem('rightBarWidth');
      if (savedWidth) {
        const width = Number(savedWidth);
        const rightBarWrapper = document.querySelector('.rightBarWrapper');
        if (rightBarWrapper) {
          rightBarWrapper.style.width = `${width}px`;
          rightBarWrapper.style.minWidth = `${width}px`;
          rightBarWrapper.style.maxWidth = `${width}px`;
        }
      }
    }
  }, [isMobileView]);

  return (
    <div 
      className={styles.chatbotContainer}
      ref={containerRef}
      style={{ 
        width: isMobileView ? '100%' : `${sidebarWidth}px`,
        maxWidth: isMobileView ? '100%' : `${sidebarWidth}px` 
      }}
    >
      {/* Only show resize handle when not in mobile view */}
      {!isMobileView && (
        <div 
          className={`${styles.resizeHandle} ${isResizing ? styles.isResizing : ''}`}
          onMouseDown={startResizing}
          title="Drag to resize"
        >
          <div className={styles.resizeBar}></div>
        </div>
      )}
      
      {/* Debug indicator - only shown when resizing */}
      {isResizing && (
        <div className={styles.resizeDebug}>
          Width: {Math.round(sidebarWidth)}px
        </div>
      )}
      
      <div className={styles.chatMessages}>
        {/* Pass enhancedPostData to RecommendationItems for better recommendations */}
        <RecommendationItems postData={enhancedPostData || postData} />
        
        {messages.map((message) => (
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

      {/* Suggested questions - only show if hasInteracted is false */}
      {!hasInteracted && messages.length <= 3 && !isLoading && !error && (
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

      {/* Database command suggestions - only show if hasInteracted is false */}
      {!hasInteracted && messages.length > 3 && dbDataAvailable.length > 0 && !isLoading && (
        <div className={styles.suggestionsContainer}>
          <p className={styles.suggestionsTitle}>Try these data commands:</p>
          <div className={styles.suggestionsList}>
            {getCommandSuggestions().map((command, index) => (
              <button
                key={index}
                className={`${styles.suggestionButton} ${styles.dbCommandButton}`}
                onClick={() => useSuggestion(command)}
              >
                {command}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.chatInputContainer}>
        <div className={`${styles.chatInputWrapper} ${isFocused ? styles.chatInputWrapperFocused : ''} ${isExpanded ? styles.chatInputWrapperExpanded : ''}`}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask Flock..."
            className={styles.chatInput}
            rows={inputRows}
            style={{ height: textareaHeight }}
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
        <div className={styles.modelSelectorContainer}>
          <div className={styles.dbIndicator}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>Connected to database</span>
          </div>
        </div>
      </form>
    </div>
  );
}