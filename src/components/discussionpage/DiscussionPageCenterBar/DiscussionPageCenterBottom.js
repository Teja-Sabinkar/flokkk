'use client';

import { useState, useRef, useEffect } from 'react';
import NestedCommentBoxPreview from './NestedCommentBoxPreview';
import ReportModal from '@/components/report/ReportModal'; // Import ReportModal
import DeleteCommentModal from './DeleteCommentModal'; // NEW: Import delete modal
import { submitReport } from '@/components/report/reportService'; // Import report service
import styles from './DiscussionPageCenterBottom.module.css';
import Link from 'next/link';

// Maximum nesting level for comments before showing "Continue this thread"
const MAX_NESTING_LEVEL = 6;

// Safely handle HTML in comments
const sanitizeHtml = (html) => {
  if (!html) return '';

  // If it's not actually HTML content (no tags), just clean up entities
  if (!/<\/?[a-z][\s\S]*>/i.test(html)) {
    return html
      .replace(/&nbsp;/g, ' ')  // Replace &nbsp; text with spaces
      .replace(/\u00A0/g, ' '); // Replace actual non-breaking spaces
  }

  // Otherwise, it's real HTML that needs to be rendered with dangerouslySetInnerHTML
  return html;
};

// Generate a consistent color based on username
const generateColorFromUsername = (username) => {
  if (!username) return '#3b5fe2'; // Default color

  // Simple hash function to get consistent colors
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to hex color
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }

  return color;
};

export default function DiscussionPageCenterBottom({
  comments,
  setComments,
  setOriginalComments,
  searchText = '',
  searchResults = [],
  currentSearchIndex = -1,
  isFilteredView = false,
  loading = false,
  error = null,
  postData = null,
  fetchComments,
  currentUser = null // Added current user prop
}) {
  const [sortOrder, setSortOrder] = useState('best');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [voteAnimation, setVoteAnimation] = useState(null);
  const [highlightedComments, setHighlightedComments] = useState({});
  const [activeContinuationDropdown, setActiveContinuationDropdown] = useState(null); // New state for continuation dropdowns
  const sortMenuRef = useRef(null);
  const commentThreadRef = useRef(null);
  const commentRefs = useRef({});


  // New state for report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [commentToReport, setCommentToReport] = useState(null);

  // NEW: Add state for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add state for verification modal
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);

  // Debug comments received
  useEffect(() => {
    console.log('Comments received in DiscussionPageCenterBottom:', comments?.length || 0);
    console.log('Current user in DiscussionPageCenterBottom:', currentUser);
  }, [comments, currentUser]);

  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Click outside handler for continuation dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeContinuationDropdown) {
        // Check if the click was inside a continuation dropdown
        const dropdownElement = document.querySelector(`.${styles.continuationDropdown}`);
        const triggerElement = document.querySelector(`.${styles.continuationTrigger}[data-comment-id="${activeContinuationDropdown}"]`);

        if ((dropdownElement && !dropdownElement.contains(e.target)) &&
          (triggerElement && !triggerElement.contains(e.target))) {
          setActiveContinuationDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeContinuationDropdown]);

  // Setup event listener for scrolling to comments
  useEffect(() => {
    const handleScrollToComment = (event) => {
      const { commentId } = event.detail;
      if (commentRefs.current[commentId]) {
        commentRefs.current[commentId].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    };

    const parentElement = commentThreadRef.current?.parentElement;
    if (parentElement) {
      parentElement.addEventListener('scrollToComment', handleScrollToComment);

      return () => {
        parentElement.removeEventListener('scrollToComment', handleScrollToComment);
      };
    }
  }, []);

  // Update highlighted comments based on search results
  useEffect(() => {
    if (searchText && searchResults.length > 0) {
      // Create a new object to store highlighted state for all matched comments
      const newHighlighted = {};

      // Mark ALL search results as highlighted, but only one as current
      searchResults.forEach((result, index) => {
        newHighlighted[result.id] = {
          isHighlighted: true,  // All matching comments should be highlighted
          isCurrent: index === currentSearchIndex  // Only one is "current"
        };
      });

      console.log('Setting highlighted comments:', newHighlighted);
      setHighlightedComments(newHighlighted);
    } else {
      setHighlightedComments({});
    }
  }, [searchText, searchResults, currentSearchIndex]);

  // Reset vote animation after 300ms
  useEffect(() => {
    if (voteAnimation) {
      const timer = setTimeout(() => {
        setVoteAnimation(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [voteAnimation]);

  // Check if user is verified
  const isUserVerified = () => {
    return currentUser && currentUser.isEmailVerified === true;
  };

  // Handle verification prompt
  const handleVerificationPrompt = () => {
    setShowVerificationPrompt(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowVerificationPrompt(false);
    }, 3000);
  };

  // Function to handle opening the report modal for a comment
  const handleOpenReportModal = (comment) => {
    setCommentToReport(comment);
    setShowReportModal(true);
  };

  // NEW: Function to handle opening delete confirmation modal
  const handleOpenDeleteModal = (comment) => {
    setCommentToDelete(comment);
    setShowDeleteModal(true);
  };

  // NEW: Function to handle closing delete confirmation modal
  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setShowDeleteModal(false);
      setCommentToDelete(null);
    }
  };

  // NEW: Function to handle comment deletion
  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      setIsDeleting(true);

      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to delete comments');
        return;
      }

      console.log('Deleting comment:', commentToDelete.id);

      const response = await fetch(`/api/comments/${commentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete comment');
      }

      const result = await response.json();
      console.log('Comment deleted successfully:', result);

      // Update the comment in the local state to show as deleted
      const updateCommentInState = (commentsList) => {
        return commentsList.map(comment => {
          if (comment.id === commentToDelete.id) {
            return {
              ...comment,
              text: '[deleted]',
              isDeleted: true,
              username: '[deleted]'
            };
          }

          // Recursively update nested comments
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentInState(comment.replies)
            };
          }

          return comment;
        });
      };

      // Update both comments and originalComments
      setComments(prevComments => updateCommentInState(prevComments));
      setOriginalComments(prevComments => updateCommentInState(prevComments));

      // Close modal and reset state
      setShowDeleteModal(false);
      setCommentToDelete(null);

      // Show success message (optional)
      // You could add a toast notification here if you have one implemented

    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error deleting comment: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for report submission
  const handleReportSubmit = async (reportData) => {
    try {
      await submitReport(reportData);
      setShowReportModal(false);
      setCommentToReport(null);
      alert('Thank you for your report. We will review this comment.');
      return Promise.resolve();
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report: ' + error.message);
      return Promise.reject(error);
    }
  };

  // Prepare content details for report modal
  const getContentDetailsForReport = () => {
    if (!commentToReport) return {};

    return {
      commentId: commentToReport.id,
      postId: postData?.id,
      title: 'Comment by ' + (commentToReport.user?.username || 'Anonymous'),
      content: commentToReport.text,
      userId: commentToReport.user?.id,
      username: commentToReport.user?.username
    };
  };

  // Format timestamp exactly like Reddit
  const formatTimestamp = (date) => {
    const now = new Date();
    const diffSeconds = Math.floor((now - new Date(date)) / 1000);

    if (diffSeconds < 60) return `just now`;
    if (diffSeconds < 120) return `1 min ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
    if (diffSeconds < 7200) return `1 hr ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hrs ago`;
    if (diffSeconds < 172800) return `1 day ago`;
    if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)} days ago`;
    if (diffSeconds < 5184000) return `1 mo ago`;
    if (diffSeconds < 31536000) return `${Math.floor(diffSeconds / 2592000)} mos ago`;
    if (diffSeconds < 63072000) return `1 yr ago`;
    return `${Math.floor(diffSeconds / 31536000)} yrs ago`;
  };

  // Find a comment by ID in the comments tree
  const findComment = (commentId, commentsList) => {
    for (let i = 0; i < commentsList.length; i++) {
      if (commentsList[i].id === commentId) {
        return commentsList[i];
      }

      if (commentsList[i].replies && commentsList[i].replies.length > 0) {
        const found = findComment(commentId, commentsList[i].replies);
        if (found) return found;
      }
    }

    return null;
  };

  // Update a comment by ID in the comments tree
  const updateCommentInTree = (commentId, updatedComment, commentsList) => {
    return commentsList.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, ...updatedComment };
      }

      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentInTree(commentId, updatedComment, comment.replies)
        };
      }

      return comment;
    });
  };

  // Toggle collapse state of a comment
  const toggleCollapse = (commentId) => {
    const commentToUpdate = findComment(commentId, comments);
    if (!commentToUpdate) return;

    const updatedComment = {
      ...commentToUpdate,
      isCollapsed: !commentToUpdate.isCollapsed
    };

    const updatedComments = updateCommentInTree(commentId, updatedComment, [...comments]);
    setComments(updatedComments);
  };

  // Count total replies (including nested) for a comment
  const countReplies = (replies) => {
    if (!replies || replies.length === 0) return 0;

    let count = replies.length;
    for (const reply of replies) {
      count += countReplies(reply.replies);
    }

    return count;
  };

  // Toggle voting on a comment
  const toggleVote = async (commentId, voteType) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to vote');
        return;
      }

      // Check if user is verified before allowing vote
      if (!isUserVerified()) {
        handleVerificationPrompt();
        return;
      }

      // Find the comment to get current vote state
      const commentToUpdate = findComment(commentId, comments);
      if (!commentToUpdate) {
        console.error('Comment not found for voting:', commentId);
        return;
      }

      // Determine vote value
      let voteValue = 0;
      if (voteType === 'up') {
        voteValue = commentToUpdate.isLiked ? 0 : 1;
      } else if (voteType === 'down') {
        voteValue = commentToUpdate.isDownvoted ? 0 : -1;
      }

      // Optimistic UI update
      const updatedComment = { ...commentToUpdate };

      if (voteType === 'up') {
        if (updatedComment.isLiked) {
          // Remove upvote
          updatedComment.isLiked = false;
          updatedComment.likes -= 1;
        } else if (updatedComment.isDownvoted) {
          // Change from downvote to upvote
          updatedComment.isDownvoted = false;
          updatedComment.isLiked = true;
          updatedComment.likes += 2;
          setVoteAnimation({ id: commentId, type: 'upvote' });
        } else {
          // Add upvote
          updatedComment.isLiked = true;
          updatedComment.likes += 1;
          setVoteAnimation({ id: commentId, type: 'upvote' });
        }
      } else if (voteType === 'down') {
        if (updatedComment.isDownvoted) {
          // Remove downvote
          updatedComment.isDownvoted = false;
          updatedComment.likes += 1;
        } else if (updatedComment.isLiked) {
          // Change from upvote to downvote
          updatedComment.isLiked = false;
          updatedComment.isDownvoted = true;
          updatedComment.likes -= 2;
          setVoteAnimation({ id: commentId, type: 'downvote' });
        } else {
          // Add downvote
          updatedComment.isDownvoted = true;
          updatedComment.likes -= 1;
          setVoteAnimation({ id: commentId, type: 'downvote' });
        }
      }

      // Update UI immediately (optimistic update)
      const updatedComments = updateCommentInTree(commentId, updatedComment, [...comments]);
      setComments(updatedComments);

      console.log(`Sending vote to API: commentId=${commentId}, vote=${voteValue}`);

      // Make API call
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vote: voteValue })
      });

      if (!response.ok) {
        throw new Error(`Failed to vote on comment: ${response.status}`);
      }

      const data = await response.json();
      console.log('Vote response:', data);

    } catch (error) {
      console.error('Error voting on comment:', error);
      alert('Error voting on comment. Please try again.');
    }
  };

  // Find continuation threads for a specific comment
  const findContinuationThreads = (commentId) => {
    if (!commentId) return [];

    const results = [];

    // Helper to recursively search comments
    const searchComments = (commentsList) => {
      for (const comment of commentsList) {
        // Check if this comment is a continuation thread for the target comment
        if (comment.replyToId === commentId) {
          console.log(`Found continuation thread: Comment ${comment.id} is replying to ${commentId}`);
          results.push(comment);
        }

        // Check replies recursively
        if (comment.replies && comment.replies.length > 0) {
          searchComments(comment.replies);
        }
      }
    };

    searchComments(comments);
    return results;
  };

  // Navigate to a specific comment
  const navigateToComment = (commentId) => {
    const targetComment = document.getElementById(`comment-${commentId}`);
    if (targetComment) {
      // Expand parent comments if they're collapsed
      let currentElement = targetComment;
      while (currentElement && !currentElement.classList.contains(styles.discussionContainer)) {
        if (currentElement.classList.contains(styles.collapsed)) {
          const collapseButton = currentElement.querySelector(`.${styles.collapseButton}`);
          if (collapseButton) collapseButton.click();
        }
        currentElement = currentElement.parentElement;
      }

      // Scroll the target comment into view
      targetComment.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight the target comment temporarily
      targetComment.classList.add(styles.highlightedComment);
      setTimeout(() => {
        targetComment.classList.remove(styles.highlightedComment);
      }, 2000);
    }
  };

  // Show/hide reply box for a comment
  const showReplyBox = (commentId) => {
    // Check if user is verified before allowing to reply
    if (!isUserVerified()) {
      handleVerificationPrompt();
      return;
    }

    // Find the comment we're targeting
    const commentToUpdate = findComment(commentId, comments);
    if (!commentToUpdate) return;

    // Check if we're toggling off (already showing) or toggling on (currently hidden)
    const isAlreadyShowing = commentToUpdate.showReplyBox === true;

    // If we're toggling on, first close all reply boxes
    if (!isAlreadyShowing) {
      let updatedComments = comments.map(comment => {
        return hideReplyBoxesRecursive(comment);
      });

      // Normal case - just show the reply box
      const updatedComment = {
        ...commentToUpdate,
        showReplyBox: true,
        replyHtml: '',
      };

      updatedComments = updateCommentInTree(commentId, updatedComment, updatedComments);
      setComments(updatedComments);
    } else {
      // If already showing, just close it
      const updatedComment = {
        ...commentToUpdate,
        showReplyBox: false
      };

      const updatedComments = updateCommentInTree(commentId, updatedComment, [...comments]);
      setComments(updatedComments);
    }
  };

  // Recursively hide all reply boxes
  const hideReplyBoxesRecursive = (comment) => {
    const updatedComment = {
      ...comment,
      showReplyBox: false
    };

    if (comment.replies && comment.replies.length > 0) {
      updatedComment.replies = comment.replies.map(reply => hideReplyBoxesRecursive(reply));
    }

    return updatedComment;
  };

  // Submit a reply to a comment
  const submitReply = async (content, parentCommentId, nestingLevel = 0) => {
    if (!content.trim()) {
      console.error('Cannot submit reply - empty content');
      return;
    }

    // Check if user is verified before allowing to post a reply
    if (!isUserVerified()) {
      handleVerificationPrompt();
      return;
    }

    // Check for postData in multiple ways
    const postId = postData?.id || postData?._id;

    if (!postId) {
      console.error('Cannot submit reply - missing post ID', { postData });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to reply');
        return;
      }

      // Find the parent comment
      const commentToUpdate = findComment(parentCommentId, comments);
      if (!commentToUpdate) {
        console.error('Parent comment not found:', parentCommentId);
        return;
      }

      console.log(`Submitting reply to comment ${parentCommentId} at nesting level ${nestingLevel}`);

      // Prepare request body
      let requestBody = {
        content,
        parentId: parentCommentId
      };

      // For deeply nested comments, handle continuation threads
      if (nestingLevel >= MAX_NESTING_LEVEL - 1) {
        console.log(`Creating continuation thread at nesting level ${nestingLevel}`);

        // Create a top-level reply that references the original comment
        requestBody = {
          content,
          replyToId: parentCommentId,
          replyToUsername: commentToUpdate.user.username
        };

        console.log('Continuation thread request:', requestBody);
      }

      // Send API request
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to post reply: ${response.status}`);
      }

      const data = await response.json();
      console.log('Reply posted successfully:', data);

      // Hide the reply box
      const updatedComment = {
        ...commentToUpdate,
        showReplyBox: false
      };

      const updatedComments = updateCommentInTree(parentCommentId, updatedComment, [...comments]);
      setComments(updatedComments);

      // Refresh all comments
      if (fetchComments) {
        await fetchComments();
      }

    } catch (error) {
      console.error('Error posting reply:', error);
      alert('Error posting reply. Please try again.');
    }
  };

  // Toggle sort menu
  const toggleSortMenu = () => {
    setShowSortMenu(!showSortMenu);
  };

  // Handle sort order change
  const handleSortChange = (order) => {
    setSortOrder(order);
    setShowSortMenu(false);
  };

  // Function to determine if text contains HTML
  const containsHTML = (str) => {
    return /<\/?[a-z][\s\S]*>/i.test(str);
  };

  // Simplified highlight search function
  const highlightText = (text, searchTerm) => {
    if (!searchTerm || !text) return text;

    try {
      // Simple approach - works for plain text
      const safeSearchTerm = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${safeSearchTerm})`, 'gi');
      return text.replace(regex, `<span class="${styles.searchMatch}">$1</span>`);
    } catch (e) {
      console.error("Search highlighting error:", e);
      return text;
    }
  };

  // Recursive function to render comments and their replies
  const renderComment = (comment, nestingLevel = 0) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const totalReplies = countReplies(comment.replies);
    const isDeepNested = nestingLevel >= MAX_NESTING_LEVEL - 1;

    // Find any continuation threads for this comment
    const continuationThreads = findContinuationThreads(comment.id);
    const hasContinuationThreads = continuationThreads.length > 0;

    // Debug continuation info
    if (hasContinuationThreads) {
      console.log(`Comment ${comment.id} has ${continuationThreads.length} continuation threads`);
    }

    // Debug reply-to info
    if (comment.replyToId) {
      console.log(`Comment ${comment.id} is replying to ${comment.replyToId} (${comment.replyToUser})`);
    }

    // Check if we should stop nesting and show "Continue thread" link
    if (nestingLevel >= MAX_NESTING_LEVEL && hasReplies) {
      return (
        <div key={comment.id} className={styles.comment} id={`comment-${comment.id}`}>
          {hasContinuationThreads ? (
            <div className={styles.continuationThreadContainer}>
              <a
                className={`${styles.continueThread} ${styles.continuationTrigger}`}
                data-comment-id={comment.id}
                onClick={(e) => {
                  e.preventDefault();
                  // Toggle dropdown for continuation threads
                  setActiveContinuationDropdown(
                    activeContinuationDropdown === comment.id ? null : comment.id
                  );
                }}
              >
                View continuation threads ({continuationThreads.length}) {activeContinuationDropdown === comment.id ? '▲' : '▼'}
              </a>

              {/* Continuation Threads Dropdown */}
              {activeContinuationDropdown === comment.id && (
                <div className={styles.continuationDropdown}>
                  <ul className={styles.continuationThreadList}>
                    {continuationThreads.map((thread, index) => (
                      <li key={thread.id} className={styles.continuationThreadItem}>
                        <div className={styles.continuationThreadLink}>
                          <span className={styles.continuationThreadNumber}>{index + 1}.</span>
                          <span
                            className={`${styles.continuationThreadUsername} ${styles.clickableUsername}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigateToComment(thread.id);
                              setActiveContinuationDropdown(null); // Close dropdown after click
                            }}
                          >
                            {thread.user.username}
                          </span>
                          <span className={styles.continuationThreadTimestamp}>
                            {formatTimestamp(thread.timestamp)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <a className={styles.continueThread} onClick={() => showReplyBox(comment.id)}>
              Continue this thread →
            </a>
          )
          }
        </div >
      );
    }

    // Check if this comment belongs to the current user
    // Use a simpler and more reliable mechanism based on usernames
    const isCurrentUserComment = currentUser &&
      (currentUser.username === comment.user.username);

    console.log(`Comment by ${comment.user.username} - Current user: ${currentUser?.username} - Match: ${isCurrentUserComment}`);

    // NEW: Check if comment is deleted
    const isDeletedComment = comment.isDeleted || comment.text === '[deleted]';

    // Determine the profile path based on whether it's the current user or not
    const profilePath = isCurrentUserComment
      ? `/currentprofile/${comment.user.username}`
      : `/otheruserprofile/${comment.user.username}`;

    console.log(`Profile path for ${comment.user.username}: ${profilePath}`);

    // Determine if the comment text contains HTML
    const hasHTML = containsHTML(comment.text);

    // Prepare content based on search highlighting and HTML content
    let commentContent = sanitizeHtml(comment.text);

    // Apply search highlighting if this comment is in search results and not deleted
    if (searchText && highlightedComments[comment.id]?.isHighlighted && !hasHTML && !isDeletedComment) {
      commentContent = highlightText(commentContent, searchText);
    }

    return (
      <div
        key={comment.id}
        className={`${styles.comment} ${comment.isCollapsed ? styles.collapsed : ''}`}
        data-comment-id={comment.id}
        id={`comment-${comment.id}`}
        ref={el => commentRefs.current[comment.id] = el}
      >
        <div className={styles.commentWrapper}>
          <div className={styles.commentBody}>
            {/* Collapse button - now disabled when no replies */}
            <button
              className={`${styles.collapseButton} ${!hasReplies ? styles.disabledCollapseButton : ''}`}
              onClick={() => hasReplies && toggleCollapse(comment.id)}
              aria-label={comment.isCollapsed ? "Expand comment thread" : "Collapse comment thread"}
              disabled={!hasReplies}
            >
              {comment.isCollapsed ? "+" : "-"}
            </button>

            <div className={styles.commentHeader}>
              <div className={styles.avatar}>
                {/* Only show avatar if comment is not deleted */}
                {!isDeletedComment && comment.user.avatar && comment.user.avatar !== '/profile-placeholder.jpg' ? (
                  <img
                    src={comment.user.avatar}
                    alt={comment.user.username}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div
                    className={styles.avatarPlaceholder}
                    style={{ backgroundColor: isDeletedComment ? '#666' : generateColorFromUsername(comment.user.username) }}
                  >
                    <span className={styles.avatarInitial}>
                      {isDeletedComment ? '?' : (comment.user.username ? comment.user.username.charAt(0).toUpperCase() : 'U')}
                    </span>
                  </div>
                )}
              </div>

              {/* Add a debug output to inspect username comparison */}
              {console.log(`Checking username: comment=${comment.user.username}, currentUser=${currentUser?.username}`)}

              {/* Show username or [deleted] based on deletion status */}
              {isDeletedComment ? (
                <span className={styles.username} style={{ color: '#666', fontStyle: 'italic' }}>
                  [deleted]
                </span>
              ) : (
                <Link
                  href={profilePath}
                  className={styles.username}
                >
                  {comment.user.username}
                </Link>
              )}

              {/* Only show badges if comment is not deleted */}
              {!isDeletedComment && (
                <>
                  {comment.user.isMod && (
                    <span className={styles.userIsMod}>MOD</span>
                  )}

                  {comment.user.isAdmin && (
                    <span className={styles.userIsAdmin}>ADMIN</span>
                  )}
                </>
              )}

              <span className={styles.timestamp}>{formatTimestamp(comment.timestamp)}</span>

              {!isDeletedComment && comment.isEdited && (
                <span className={styles.edited}>edited</span>
              )}

              {/* Only show reply-to information if comment is not deleted */}
              {!isDeletedComment && comment.replyToUser && comment.replyToId && (
                <span className={styles.replyingTo}>
                  replying to
                  <a
                    href={`#comment-${comment.replyToId}`}
                    className={styles.replyingToLink}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToComment(comment.replyToId);
                    }}
                  >
                    @{comment.replyToUser}
                  </a>
                </span>
              )}

              {/* Show continuation thread indicator if this comment has continuation threads */}
              {!isDeletedComment && hasContinuationThreads && (
                <span className={styles.continuationIndicator}>
                  <a
                    href="#"
                    className={styles.continuationIndicatorLink}
                    onClick={(e) => {
                      e.preventDefault();
                      // Toggle dropdown for continuation threads
                      setActiveContinuationDropdown(
                        activeContinuationDropdown === comment.id ? null : comment.id
                      );
                    }}
                  >
                    has {continuationThreads.length} continuation thread(s)
                  </a>

                  {/* Continuation Threads Dropdown when clicked on indicator */}
                  {activeContinuationDropdown === comment.id && (
                    <div className={styles.continuationDropdown}>
                      <ul className={styles.continuationThreadList}>
                        {continuationThreads.map((thread, index) => (
                          <div key={thread.id} className={styles.continuationThreadItem}>
                            <a
                              onClick={(e) => {
                                e.preventDefault();
                                navigateToComment(thread.id);
                                setActiveContinuationDropdown(null); // Close dropdown after click
                              }}
                              className={styles.continuationThreadLink}
                            >
                              <span className={styles.continuationThreadNumber}>{index + 1}.</span>
                              <span className={styles.continuationThreadUsername}>
                                {thread.user.username}
                              </span>
                              <span className={styles.continuationThreadTimestamp}>
                                {formatTimestamp(thread.timestamp)}
                              </span>
                            </a>
                          </div>
                        ))}
                      </ul>
                    </div>
                  )}
                </span>
              )}
            </div>

            {/* Comment content with different rendering based on content type, search status, and deletion status */}
            {hasHTML ? (
              <div
                className={`${styles.commentContent} ${highlightedComments[comment.id]?.isHighlighted ? styles.currentHighlight : ''
                  } ${highlightedComments[comment.id]?.isCurrent ? styles.currentHighlight : ''
                  } ${isDeletedComment ? styles.deletedComment : ''}`}
                dangerouslySetInnerHTML={{ __html: commentContent }}
              />
            ) : searchText && highlightedComments[comment.id]?.isHighlighted && !isDeletedComment ? (
              <div
                className={`${styles.commentContent} ${styles.currentHighlight} ${highlightedComments[comment.id]?.isCurrent ? styles.currentHighlight : ''
                  }`}
                dangerouslySetInnerHTML={{ __html: highlightText(commentContent, searchText) }}
              />
            ) : (
              <div
                className={`${styles.commentContent} ${highlightedComments[comment.id]?.isHighlighted ? styles.currentHighlight : ''
                  } ${highlightedComments[comment.id]?.isCurrent ? styles.currentHighlight : ''
                  } ${isDeletedComment ? styles.deletedComment : ''}`}
              >
                {commentContent}
              </div>
            )}

            <div className={styles.commentActions}>
              {/* Only show vote and action buttons if comment is not deleted */}
              {!isDeletedComment && (
                <>
                  {/* Vote buttons */}
                  <div className={styles.actionVoteButtons}>
                    <button
                      className={`${styles.actionButton} ${comment.isLiked ? styles.actionUpvoted : ''}`}
                      onClick={() => toggleVote(comment.id, 'up')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={comment.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={styles.voteIcon}>
                        <path d="M12 4l8 8h-16l8-8z" />
                      </svg>
                    </button>

                    <span className={`${styles.actionVoteCount} ${comment.isLiked ? styles.upvoted : ''} ${comment.isDownvoted ? styles.downvoted : ''}`}>
                      {comment.likes}
                    </span>

                    <button
                      className={`${styles.actionButton} ${comment.isDownvoted ? styles.actionDownvoted : ''}`}
                      onClick={() => toggleVote(comment.id, 'down')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={comment.isDownvoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={styles.voteIcon}>
                        <path d="M12 20l-8-8h16l-8 8z" />
                      </svg>
                    </button>
                  </div>

                  <button
                    className={styles.actionButton}
                    onClick={() => showReplyBox(comment.id)}
                  >
                    <span className={styles.actionIcon}>↪</span>
                    Reply
                  </button>

                  <button
                    className={styles.actionButton}
                    onClick={() => handleOpenReportModal(comment)}
                  >
                    Report
                  </button>

                  {/* NEW: Delete button - only show if current user is the comment creator */}
                  {isCurrentUserComment && (
                    <button
                      className={styles.actionButton}
                      onClick={() => handleOpenDeleteModal(comment)}
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>

            <div className={`${styles.nestedComments} ${comment.isCollapsed ? styles.collapsed : ''}`}>
              {/* Reply box - only show if comment is not deleted */}
              {!isDeletedComment && comment.showReplyBox && (
                <div className={styles.commentBoxContainer}>
                  <NestedCommentBoxPreview
                    onChange={() => { }}
                    onSubmit={(content) => submitReply(content, comment.id, nestingLevel)}
                    parentCommentId={comment.id}
                  />
                </div>
              )}

              {/* Nested replies */}
              {hasReplies && !comment.isCollapsed && comment.replies.map(reply =>
                renderComment(reply, nestingLevel + 1)
              )}
            </div>

            {/* Collapsed thread indicator */}
            {comment.isCollapsed && hasReplies && (
              <div
                className={styles.collapsedThreadInfo}
                onClick={() => toggleCollapse(comment.id)}
              >
                <span className={styles.collapsedIndicator}>[+]</span>
                <span className={styles.collapsedUsername}>{isDeletedComment ? '[deleted]' : comment.user.username}</span>
                <span>{totalReplies} more {totalReplies === 1 ? 'reply' : 'replies'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.discussionContainer}>
      {/* Verification Prompt */}
      {showVerificationPrompt && (
        <div className={styles.verificationPrompt}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.verificationPromptIcon}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Please verify your email to comment and vote</span>
        </div>
      )}

      {/* Filtered view indicator */}
      {isFilteredView && (
        <div className={styles.filteredViewBanner}>
          <div className={styles.filteredViewIndicator}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            Showing matched comments at top
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={styles.loadingComments}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading comments...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className={styles.errorMessage}>
          <p>{error}</p>
          <button onClick={fetchComments} className={styles.retryButton}>Retry</button>
        </div>
      )}

      {/* Comment thread */}
      <div className={styles.commentThread} ref={commentThreadRef}>
        {!loading && !error && comments.length === 0 && (
          <div className={styles.emptyComments}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>No comments yet</p>
            <p className={styles.emptySubtext}>Be the first to share what you think!</p>
          </div>
        )}

        {!loading && !error && comments.map(comment => renderComment(comment))}
      </div>

      {/* NEW: Delete Confirmation Modal */}
      <DeleteCommentModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteComment}
        commentPreview={commentToDelete?.text}
        isDeleting={isDeleting}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setCommentToReport(null);
        }}
        onSubmit={handleReportSubmit}
        contentDetails={getContentDetailsForReport()}
      />
    </div>
  );
}