'use client';

import React, { useState, useEffect, useRef } from 'react';
import DiscussionPageCenterTop from './DiscussionPageCenterTop';
import DiscussionPageCenterBottom from './DiscussionPageCenterBottom';
import styles from './DiscussionPageCenterBar.module.css';

export default function DiscussionPageCenterBar({ postData, loading, error, currentUser }) {
  // State for comments - lifted up from DiscussionPageCenterBottom
  const [comments, setComments] = useState([]);
  const [originalComments, setOriginalComments] = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState(null);

  // State for search functionality
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isFilteredView, setIsFilteredView] = useState(false);
  const bottomSectionRef = useRef(null);

  // Format post data for display using postData from props, or fallback to sample data
  const post = postData ? {
    id: postData.id || postData._id,
    author: postData.username || 'Anonymous',
    timePosted: getTimeAgo(postData.createdAt) || '5 hrs ago',
    title: postData.title || 'Untitled Post',
    tags: postData.hashtags || [],
    content: postData.content || ''
  } : {
    // Fallback sample data when no post data is provided
    id: 1,
    author: 'u/Original_Poster',
    timePosted: '5 hrs ago',
    title: 'Learn HTML, CSS & JS',
    tags: ['#WebDevelopment', '#HTML', '#CSS'],
    content: `This tutorial is part of our Web Development Series. Don't forget to like and subscribe for more content like this!`
  };

  // Helper function to calculate time ago
  function getTimeAgo(timestamp) {
    if (!timestamp) return '';

    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  }

  // Function to fetch comments
  const fetchComments = async () => {
    // Get the post ID, checking both id and _id fields
    const postId = postData && (postData.id || postData._id);

    if (!postId) {
      return;
    }

    setCommentLoading(true);
    setCommentError(null);

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await fetch(`/api/posts/${postId}/comments`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }

      const data = await response.json();

      if (data.comments && Array.isArray(data.comments)) {
        setComments(data.comments);
        setOriginalComments(data.comments);
      } else {
        setComments([]);
        setOriginalComments([]);
      }
    } catch (error) {
      setCommentError('Failed to load comments. Please try again.');
    } finally {
      setCommentLoading(false);
    }
  };

  // Function to add a new top-level comment
  const addComment = async (commentText, postId) => {
    // Use the passed postId parameter, falling back to postData.id if not provided
    const targetPostId = postId || (postData && (postData.id || postData._id));

    if (!targetPostId) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to comment');
        return;
      }

      // Call API to submit comment
      const response = await fetch(`/api/posts/${targetPostId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: commentText
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to post comment: ${response.status}`);
      }

      // Refresh comments
      await fetchComments();
    } catch (error) {
      alert('Error posting comment. Please try again.');
    }
  };

  // Calculate total comments count including all nested replies
  const getTotalCommentCount = () => {
    const countReplies = (replies) => {
      if (!replies || replies.length === 0) return 0;
      let count = replies.length;
      for (const reply of replies) {
        count += countReplies(reply.replies);
      }
      return count;
    };

    // Count top-level comments plus all their nested replies
    const total = comments.length + comments.reduce((total, comment) =>
      total + countReplies(comment.replies), 0);

    return total;
  };

  // Handle text input for both comment and search
  const handleTextInput = (text) => {
    setSearchText(text);

    // If we were in filtered view and search text changes, reset to original comments
    if (isFilteredView && text.trim().length < 2) {
      setComments([...originalComments]);
      setIsFilteredView(false);
    }

    if (text.trim().length >= 2) {
      // Search the comments for matches
      const results = searchCommentsTree(text);
      setSearchResults(results);
      setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    } else {
      // Clear search results if search text is too short
      setSearchResults([]);
      setCurrentSearchIndex(-1);
    }
  };

  // Toggle filtered view to bring matched comments to the top
  const toggleFilteredView = () => {
    if (searchResults.length === 0) return;

    if (!isFilteredView) {
      // Find all comment IDs with matches, including both direct matches and their parents
      const directMatchCommentIds = new Set();
      const topLevelParentIds = new Set();

      // First, collect all comments with direct matches
      searchResults.forEach(result => {
        directMatchCommentIds.add(result.id);

        // If this is a nested comment, track its top-level parent
        if (result.path.length > 1) {
          topLevelParentIds.add(result.path[0]);
        } else {
          // If it's already a top-level comment
          topLevelParentIds.add(result.id);
        }
      });

      // Create a new array with matched comments at the top
      const matchedTopLevelComments = [];
      const unmatchedTopLevelComments = [];

      // Sort the comments - top level comments with matches or with matching children go to the top
      originalComments.forEach(comment => {
        if (topLevelParentIds.has(comment.id)) {
          matchedTopLevelComments.push(comment);
        } else {
          unmatchedTopLevelComments.push(comment);
        }
      });

      // Update comments with the new sorted array
      setComments([...matchedTopLevelComments, ...unmatchedTopLevelComments]);
      setIsFilteredView(true);
    } else {
      // Restore original comment order
      setComments([...originalComments]);
      setIsFilteredView(false);
    }
  };

  // Search through all comments and their replies for matching text
  const searchCommentsTree = (searchText) => {
    if (!searchText || searchText.trim().length < 2) return [];

    const results = [];
    const searchPattern = new RegExp(searchText.trim(), 'i');

    // Recursive function to search through comments
    const searchInComments = (commentList, depth = 0, parentIds = []) => {
      commentList.forEach(comment => {
        // Check if the comment text contains the search term
        if (searchPattern.test(comment.text)) {
          results.push({
            id: comment.id,
            text: comment.text,
            depth,
            path: [...parentIds, comment.id],
            highlightData: {
              text: comment.text,
              searchTerm: searchText.trim()
            }
          });
        }

        // Recursively search in replies
        if (comment.replies && comment.replies.length > 0) {
          searchInComments(comment.replies, depth + 1, [...parentIds, comment.id]);
        }
      });
    };

    searchInComments(originalComments);
    return results;
  };

  // Navigate to the next/previous search result
  const navigateSearchResults = (direction) => {
    if (searchResults.length === 0) return;

    // Always move to next result when clicking the matches indicator
    setCurrentSearchIndex((prevIndex) =>
      prevIndex + 1 >= searchResults.length ? 0 : prevIndex + 1
    );
  };

  // Scroll to the current search result
  useEffect(() => {
    if (currentSearchIndex >= 0 && searchResults.length > 0) {
      const currentResult = searchResults[currentSearchIndex];
      if (currentResult && bottomSectionRef.current) {
        // Send the ID to the bottom component to handle scrolling
        const event = new CustomEvent('scrollToComment', {
          detail: { commentId: currentResult.id }
        });
        bottomSectionRef.current.dispatchEvent(event);
      }
    }
  }, [currentSearchIndex, searchResults]);

  // Fetch comments when post data changes
  useEffect(() => {
    if (postData) {
      const postId = postData.id || postData._id;
      if (postId) {
        fetchComments();
      }
    }
  }, [postData]);

  return (
    <div className={styles.centerBarContainer}>
      {/* Show loading state */}
      {loading && (
        <div className={styles.loadingState || styles.centerContent}>
          <div className={styles.loadingSpinner || 'loadingSpinner'}></div>
          <p>Loading discussion...</p>
        </div>
      )}

      {/* Show error state */}
      {error && (
        <div className={styles.errorState || styles.centerContent}>
          <p>{error}</p>
        </div>
      )}

      {/* Only show content when not loading and no error */}
      {!loading && !error && (
        <>
          {/* Top section - Post content */}
          <div className={styles.topSection}>
            <DiscussionPageCenterTop
              post={post}
              onCommentSubmit={addComment}
              commentCount={getTotalCommentCount()}
              onTextInput={handleTextInput}
              searchResults={searchResults}
              currentSearchIndex={currentSearchIndex}
              onNavigateSearch={navigateSearchResults}
              searchMode={searchText.trim().length >= 2}
              onToggleFilteredView={toggleFilteredView}
              isFilteredView={isFilteredView}
              currentUser={currentUser}
            />
          </div>

          {/* Bottom section - Discussion thread */}
          <div className={styles.bottomSection} ref={bottomSectionRef}>
            <DiscussionPageCenterBottom
              comments={comments}
              setComments={setComments}
              setOriginalComments={setOriginalComments}
              searchText={searchText.trim().length >= 2 ? searchText : ''}
              searchResults={searchResults}
              currentSearchIndex={currentSearchIndex}
              isFilteredView={isFilteredView}
              loading={commentLoading}
              error={commentError}
              postData={postData}
              fetchComments={fetchComments}
              currentUser={currentUser}
            />
          </div>
        </>
      )}
    </div>
  );
}