'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './PostItem.module.css';

export default function PostItem({ post, onEdit, onDelete }) {
  const router = useRouter();
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // Add debug information about this post
  console.log(`Rendering PostItem: ${post.title}, status=${post.status}, isDraft=${post.isDraft}, isPublished=${post.isPublished}`);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Toggle actions dropdown
  const toggleActions = (e) => {
    e.stopPropagation();
    setIsActionsOpen(!isActionsOpen);
  };

  // Close dropdown when clicking outside
  const handleClickOutside = () => {
    if (isActionsOpen) {
      setIsActionsOpen(false);
    }
  };

  // Navigate to post view
  const handleViewPost = () => {
    window.open(`/discussion?id=${post._id}`, '_blank');
  };

  // Navigate to analytics page
  const handleViewAnalytics = () => {
    router.push(`/editpostanalytics/${post._id}`);
    setIsActionsOpen(false);
  };

  // Generate a status badge based on post status
  const getStatusBadge = () => {
    // Normalize status check to be extra careful
    const isDraft = 
      post.status === 'draft' || 
      post.status === 'Draft' || 
      post.isDraft === true;
    
    if (!isDraft) {
      return <span className={`${styles.statusBadge} ${styles.publishedBadge}`}>Published</span>;
    } else {
      return <span className={`${styles.statusBadge} ${styles.draftBadge}`}>Draft</span>;
    }
  };

  return (
    <div 
      className={`${styles.postItem} ${process.env.NODE_ENV === 'development' ? `debug-status-${post.status}` : ''}`} 
      onClick={handleClickOutside}
      data-status={post.status}
    >
      <div className={styles.postContent}>
        <div className={styles.postTitle}>
          {/* Thumbnail - with fallback */}
          <div className={styles.thumbnailContainer}>
            {post.thumbnail ? (
              <Image
                src={post.thumbnail}
                alt={post.title}
                width={48}
                height={48}
                className={styles.thumbnail}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className={styles.thumbnailPlaceholder}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
            )}
          </div>
          <div className={styles.titleWrapper}>
            <h3 className={styles.title} onClick={handleViewPost}>{post.title}</h3>
            <div className={styles.meta}>
              {getStatusBadge()}
              <span className={styles.postType}>
                {post.type === 'discussion' ? 'Discussion' : 'Post'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.postDate}>
          {formatDate(post.createdAt)}
        </div>

        <div className={styles.postStat}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          {post.metrics?.views || 0}
        </div>

        <div className={styles.postStat}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          {post.metrics?.comments || 0}
        </div>

        <div className={styles.postStat}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          {post.metrics?.contributions || 0}
        </div>

        <div className={styles.postActions}>
          <button
            className={styles.actionButton}
            onClick={toggleActions}
            aria-label="Post actions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>

          {isActionsOpen && (
            <div className={styles.actionsDropdown}>
              <button
                className={styles.actionItem}
                onClick={(e) => {
                  e.stopPropagation();
                  // Instead of calling onEdit(), navigate to dedicated edit page
                  window.open(`/edit-post/${post._id}`, '_blank'); // Opens in new tab
                  // Alternatively use router.push for same window navigation:
                  // router.push(`/edit-post/${post._id}`);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Edit
              </button>

              <button
                className={styles.actionItem}
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewAnalytics();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                Analytics
              </button>

              <button
                className={`${styles.actionItem} ${styles.deleteAction}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1-2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.mobilePostStats}>
        <div className={styles.mobileStatItem}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span>{post.metrics?.views || 0} views</span>
        </div>

        <div className={styles.mobileStatItem}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>{post.metrics?.comments || 0} comments</span>
        </div>

        <div className={styles.mobileStatItem}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <span>{post.metrics?.contributions || 0} contributions</span>
        </div>
      </div>
    </div>
  );
}