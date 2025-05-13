'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
// Import Link but we won't use it for author and tags
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './DiscussionPageCenterTop.module.css';
import PostSaveModal from '@/components/home/PostSaveModal';
import ShareModal from '@/components/share/ShareModal';
import ReportModal from '@/components/report/ReportModal'; // Import the ReportModal
import { submitReport } from '@/components/report/reportService'; // Import the report service

export default function DiscussionPageCenterTop({
  post, // Make sure we use this prop instead of the sample data
  onCommentSubmit,
  commentCount = 0,
  onTextInput,
  searchResults = [],
  currentSearchIndex = -1,
  onNavigateSearch,
  searchMode = false,
  onToggleFilteredView,
  isFilteredView = false
}) {
  const router = useRouter();
  const [showFullContent, setShowFullContent] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  // State for modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false); // Add state for report modal
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedPlaylistName, setSavedPlaylistName] = useState('');
  // State for hide functionality
  const [isHiding, setIsHiding] = useState(false);

  // Reference to the editor div
  const editorRef = useRef(null);
  // Track active formatting
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false
  });

  // Handle successful save
  const handleSaveSuccess = (result) => {
    setSaveSuccess(true);
    setSavedPlaylistName(result.playlistTitle);
    setShowSaveModal(false);

    // Hide success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  // Ensure post has all required properties for the save modal
  const formatPostForSaving = () => {
    return {
      id: post.id,
      title: post.title || 'Untitled Discussion',
      content: post.content || '',
      image: post.image || '/api/placeholder/600/300',
      username: post.author || '',
      hashtags: post.tags || [],
      // Add any other properties needed by the PostSaveModal
    };
  };

  // Function to open save modal
  const handleOpenSaveModal = () => {
    console.log('Opening save modal for post:', post.id);
    setShowSaveModal(true);
  };

  // Handler for opening share modal
  const handleOpenShareModal = () => {
    setShowShareModal(true);
  };

  // Handler for opening report modal
  const handleOpenReportModal = () => {
    console.log('Opening report modal for post:', post.id);
    setShowReportModal(true);
  };

  // Handler for report submission
  const handleReportSubmit = async (reportData) => {
    try {
      await submitReport(reportData);
      setShowReportModal(false);
      alert('Thank you for your report. We will review this content.');
      return Promise.resolve(); // Explicitly resolve the promise
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report: ' + error.message);
      return Promise.reject(error); // Rethrow to let the modal handle the error state
    }
  };

  // Function to handle hide post
  const handleHidePost = async () => {
    // Prevent multiple clicks
    if (isHiding) return;
    
    try {
      setIsHiding(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to hide posts');
        setIsHiding(false);
        return;
      }
      
      const response = await fetch('/api/posts/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId: post.id })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to hide post');
      }
      
      // Show a brief success message
      alert('Post hidden successfully');
      
      // Redirect to homepage
      router.push('/home');
      
    } catch (error) {
      console.error('Error hiding post:', error);
      alert('Error hiding post. Please try again.');
      setIsHiding(false);
    }
  };

  // Prepare content details for report modal
  const getContentDetailsForReport = () => {
    return {
      postId: post.id,
      title: post.title,
      content: post.content,
      userId: post.userId,
      username: post.author,
      hashtags: post.tags
    };
  };

  // Check for active formats when selection changes
  const checkActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough')
    });
  };

  // Handle content change
  const handleContentChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      setCommentText(content);

      // Send the text to parent for searching
      if (onTextInput) {
        onTextInput(editorRef.current.textContent);
      }

      // Update search status based on text length
      setIsSearching(editorRef.current.textContent.trim().length >= 2);
    }
  };

  // Handle comment submission - now calls the prop function
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (editorRef.current && editorRef.current.textContent.trim()) {
      try {
        console.log('Submitting comment for post:', post);

        // Get the post ID from the post object
        const postId = post.id;
        if (!postId) {
          console.error('No post ID available in post object:', post);
          alert('Cannot submit comment: missing post ID');
          return;
        }

        const commentContent = editorRef.current.innerHTML;

        // Call parent component's function to add the comment
        // Pass both the content and the post ID
        onCommentSubmit(commentContent, postId);

        // Clear the input field after submission
        editorRef.current.innerHTML = '';
        setCommentText('');

        // Reset search state
        setIsSearching(false);
        if (onTextInput) {
          onTextInput('');
        }

      } catch (error) {
        console.error('Error submitting comment:', error);
        alert('Error posting comment. Please try again.');
      }
    }
  };

  // Apply formatting
  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);

    // Update content state after format is applied
    if (editorRef.current) {
      setCommentText(editorRef.current.innerHTML);
    }

    // Check active formats after applying format
    checkActiveFormats();

    // Return focus to editor
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCommentSubmit(e);
    }
  };

  // Handle selection change to update format states
  const handleSelectionChange = () => {
    checkActiveFormats();
  };

  // Add event listener for selection change
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  return (
    <div className={styles.discussionContainer}>
      {/* Post Header with Creator Info */}
      <div className={styles.postHeader}>
        <div className={styles.creatorInfo}>
          <span className={styles.postedBy}>Posted by </span>
          {/* Replace Link with a span that has the same styling */}
          <span className={styles.authorLink}>
            {post.author}
          </span>
          <span className={styles.timePosted}>{post.timePosted}</span>
        </div>
      </div>

      {/* Post Title */}
      <h1 className={styles.postTitle}>{post.title}</h1>

      {/* Tags Section */}
      <div className={styles.tagsSection}>
        {post.tags && post.tags.map((tag, index) => (
          // Replace Link with a span that has the same styling
          <span key={index} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>

      {/* Post Content */}
      <div className={styles.postContent}>
        <p>
          {showFullContent ? post.content : (post.content?.length > 250 ? post.content.substring(0, 250) + '...' : post.content)}
        </p>

        {post.content && post.content.length > 250 && (
          showFullContent ? (
            <button
              className={styles.showLessButton}
              onClick={() => setShowFullContent(false)}
            >
              Show less
            </button>
          ) : (
            <button
              className={styles.showMoreButton}
              onClick={() => setShowFullContent(true)}
            >
              Show more
            </button>
          )
        )}
      </div>

      {/* Success message */}
      {saveSuccess && (
        <div className={styles.saveSuccessMessage}>
          Post saved to "{savedPlaylistName}" playlist!
        </div>
      )}

      {/* Post Actions */}
      <div className={styles.postActions}>
        <button className={styles.actionButton}>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>{commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}</span>
        </button>

        {/* Share button */}
        <button
          className={styles.actionButton}
          onClick={handleOpenShareModal}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
          <span>Share</span>
        </button>

        {/* Save button */}
        <button
          className={styles.actionButton}
          onClick={handleOpenSaveModal}
          aria-label="Save to playlist"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Save</span>
        </button>

        {/* Hide button */}
        <button 
          className={styles.actionButton}
          onClick={handleHidePost}
          disabled={isHiding}
          aria-label="Hide post"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
          <span>{isHiding ? 'Hiding...' : 'Hide'}</span>
        </button>

        {/* Report button - now with functionality */}
        <button 
          className={styles.actionButton}
          onClick={handleOpenReportModal}
          aria-label="Report post"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Report</span>
        </button>
      </div>

      {/* Comment Box */}
      <div className={`${styles.commentBox} ${isFocused ? styles.commentBoxFocused : ''}`}>
        <form onSubmit={handleCommentSubmit}>
          <div className={styles.commentToolbar}>
            <button
              type="button"
              onClick={() => applyFormat('bold')}
              className={`${styles.formatButton} ${activeFormats.bold ? styles.activeFormat : ''}`}
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              onClick={() => applyFormat('italic')}
              className={`${styles.formatButton} ${activeFormats.italic ? styles.activeFormat : ''}`}
            >
              <em>I</em>
            </button>
            <button
              type="button"
              onClick={() => applyFormat('underline')}
              className={`${styles.formatButton} ${activeFormats.underline ? styles.activeFormat : ''}`}
            >
              <span style={{ textDecoration: 'underline' }}>U</span>
            </button>
            <button
              type="button"
              onClick={() => applyFormat('strikeThrough')}
              className={`${styles.formatButton} ${activeFormats.strikeThrough ? styles.activeFormat : ''}`}
            >
              <span style={{ textDecoration: 'line-through' }}>S</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const url = prompt('Enter URL:', 'https://');
                if (url) applyFormat('createLink', url);
              }}
              className={styles.formatButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
            </button>
          </div>
          <div
            ref={editorRef}
            className={styles.commentInput}
            contentEditable="true"
            onInput={handleContentChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              handleContentChange();
            }}
            onKeyDown={handleKeyDown}
            data-placeholder="Search with key words or share your thoughts?"
          />
          <div className={styles.commentButtonContainer}>
            {searchMode && searchResults.length > 0 && (
              <div
                className={`${styles.searchResultsContainer} ${isFilteredView ? styles.activeFilter : ''}`}
                onClick={() => onToggleFilteredView()}
                title={isFilteredView ? "Click to restore normal order" : "Click to bring matched comments to top"}
              >
                <span className={styles.searchResultsCount}>
                  {searchResults.length} {searchResults.length === 1 ? 'Match' : 'Matches'}
                </span>
              </div>
            )}
            <button
              type="submit"
              className={styles.commentButton}
              disabled={!commentText.trim()}
            >
              Comment
            </button>
          </div>
        </form>
      </div>

      {/* Save Modal */}
      <PostSaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        post={formatPostForSaving()}
        onSave={handleSaveSuccess}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postData={post}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportSubmit}
        contentDetails={getContentDetailsForReport()}
      />
    </div>
  );
}