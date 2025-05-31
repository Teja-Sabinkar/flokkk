'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import styles from './DiscussionPageRightBar.module.css';
import aiChatStyles from '@/components/aichat/AiChat.module.css'; // Import AiChat styles
import RecommendationItems from './RecommendationItems';
import AiChat from '@/components/aichat/AiChat'; // Correct path to the AiChat component

export default function DiscussionPageRightBar(props) {
  // Extract postData safely with better fallback handling
  const postData = props.postData || null;
  const { user } = useUser();

  // Refs for elements
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // State for resize functionality
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(330);
  const [initialX, setInitialX] = useState(0);
  const [initialWidth, setInitialWidth] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);

  // Enhanced postData for recommendations
  const [enhancedPostData, setEnhancedPostData] = useState(null);

  // NEW: Add suggestion tracking state
  const [currentSuggestionType, setCurrentSuggestionType] = useState(null);

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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dbDataAvailable, setDbDataAvailable] = useState([]);
  const [hasInteracted, setHasInteracted] = useState(false);

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
      username: mergedData.username || mergedData.author || ''
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
      // Check for the new button types
      if (
        e.target.classList.contains('show-more-discussions-links') ||
        e.target.classList.contains('show-more-insights') ||
        e.target.classList.contains('show-more-insights-links') ||
        e.target.classList.contains('show-more-results') // Keep existing support
      ) {
        e.preventDefault();

        // Get data from the clicked element
        const originalQuery = decodeURIComponent(e.target.dataset.query || '');
        const showMoreType = e.target.dataset.type || '';
        const postIdFromButton = e.target.dataset.postId || '';

        // Use postId from button or from context
        const targetPostId = postIdFromButton || (enhancedPostData?.id || enhancedPostData?._id) || null;

        console.log('Show more clicked:', {
          originalQuery,
          showMoreType,
          targetPostId,
          buttonClass: e.target.className
        });

        if (originalQuery && showMoreType) {
          // Add a system message indicating loading
          const systemMessage = {
            id: Date.now(),
            type: 'system',
            content: `Loading additional ${showMoreType.includes('insights') ? 'insights' : 'content'}...`
          };

          setMessages(prev => [...prev, systemMessage]);
          setIsLoading(true);
          setHasInteracted(true);

          try {
            // Send the request with showMoreType
            await sendMessageToAI(originalQuery, false, false, 'manual', null, showMoreType, targetPostId);
          } catch (err) {
            console.error('Error loading more content:', err);

            // Replace the "Loading..." message with an error message
            setMessages(prev => {
              const newMessages = [...prev];
              for (let i = newMessages.length - 1; i >= 0; i--) {
                if (newMessages[i].id === systemMessage.id) {
                  newMessages[i] = {
                    id: systemMessage.id,
                    type: 'error',
                    content: 'Sorry, I encountered an error loading additional content.'
                  };
                  return newMessages;
                }
              }
              return prev;
            });
          } finally {
            setIsLoading(false);
          }
        } else {
          console.warn('Missing data for show more action:', { originalQuery, showMoreType });
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
  }, [enhancedPostData]); // Add enhancedPostData as dependency

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

  // Handle form submit for AiChat
  const handleAiChatSubmit = async (message) => {
    if (!message.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
    };

    setMessages(prev => [...prev, userMessage]);

    // Determine source based on suggestion tracking
    const source = currentSuggestionType ? 'suggestion' : 'manual';
    const suggestionType = currentSuggestionType || null;

    // Clear suggestion tracking
    setCurrentSuggestionType(null);

    setIsLoading(true);
    setError(null);
    setDbDataAvailable([]);
    setHasInteracted(true);

    try {
      await sendMessageToAI(message, false, false, source, suggestionType);
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

  const sendMessageToAI = async (message, showMoreDb = false, showMoreAi = false, source = 'manual', suggestionType = null, showMoreType = null, postId = null) => {
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

    // Extract potential database commands from the message (only for non-suggestion queries)
    const dataCommands = source === 'suggestion' ? [] : extractDataCommands(message);

    // Get authentication token
    const token = localStorage.getItem('token');

    // Get the correct post ID
    const targetPostId = postId || (contextData?.id || contextData?._id) || null;

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
        showMoreAi: showMoreAi,
        source: source,
        suggestionType: suggestionType,
        // NEW: Add the show more parameters
        showMoreType: showMoreType,
        originalQuery: showMoreType ? message : null,
        postId: targetPostId
      })
    };

    console.log('Sending request to Claude API:', {
      message: message.substring(0, 50) + '...',
      source,
      suggestionType,
      showMoreType,
      postId: targetPostId
    });

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

  // Suggested questions
  const getSuggestedQuestions = () => {
    const contextData = enhancedPostData || postData;
    if (!contextData) return [];

    const titleFragment = contextData.title ?
      `"${contextData.title?.substring(0, 30)}${contextData.title?.length > 30 ? '...' : ''}"` :
      "this discussion";

    const suggestions = [
      `Can you summarize ${titleFragment}?`,
      "What similar topics might I be interested in?"
    ];

    return suggestions;
  };

  // Use a suggested question
  const useSuggestion = (suggestion) => {
    // Track suggestion type
    if (suggestion.includes('summarize')) {
      setCurrentSuggestionType('summarize');
    } else if (suggestion.includes('similar topics')) {
      setCurrentSuggestionType('similar');
    }

    // Submit the suggestion
    handleAiChatSubmit(suggestion);
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
      {/* Resize handle */}
      <div
        className={`${styles.resizeHandle} ${isResizing ? styles.isResizing : ''}`}
        onMouseDown={startResizing}
        title="Drag to resize"
      >
        <div className={styles.resizeBar}></div>
      </div>

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

      {/* Replace old chat input with AiChat component */}
      <AiChat onSubmit={handleAiChatSubmit} />

    </div>
  );
}