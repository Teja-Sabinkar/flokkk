'use client';

import { useState } from 'react';
import styles from './PostsList.module.css';
import PostItem from './PostItem';
// EditPostModal import removed

export default function PostsList({ posts, isLoading, error, onUpdate, onDelete }) {
  // Modal-related state removed
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Handle sorting change
  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Sort posts
  const sortedPosts = [...posts].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'date') {
      comparison = new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'views') {
      comparison = (b.metrics?.views || 0) - (a.metrics?.views || 0);
    } else if (sortBy === 'comments') {
      comparison = (b.metrics?.comments || 0) - (a.metrics?.comments || 0);
    }
    
    return sortOrder === 'asc' ? comparison * -1 : comparison;
  });

  // Modal-related handlers removed

  // Handle post deletion
  const handleDeletePost = async (postId) => {
    const confirmed = window.confirm('Are you sure you want to delete this post? This action cannot be undone.');
    if (confirmed) {
      const success = await onDelete(postId);
      return success;
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading your posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <h3>No posts found</h3>
        <p>You haven't created any posts yet. Start creating content!</p>
      </div>
    );
  }

  return (
    <div className={styles.postsListContainer}>
      <div className={styles.listControls}>
        <div className={styles.sortControls}>
          <label htmlFor="sortBy">Sort by:</label>
          <select 
            id="sortBy" 
            className={styles.sortSelect}
            value={sortBy}
            onChange={handleSortChange}
          >
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="views">Views</option>
            <option value="comments">Comments</option>
          </select>
          
          <button 
            className={styles.sortOrderButton} 
            onClick={toggleSortOrder}
            aria-label={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
          >
            {sortOrder === 'asc' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            )}
          </button>
        </div>
        
        <p className={styles.totalCount}>{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
      </div>

      <div className={styles.tableHeader}>
        <div className={styles.postTitleHeader}>Post</div>
        <div className={styles.postDateHeader}>Date</div>
        <div className={styles.postStatsHeader}>Views</div>
        <div className={styles.postStatsHeader}>Comments</div>
        <div className={styles.postStatsHeader}>Contributions</div>
        <div className={styles.postActionsHeader}>Actions</div>
      </div>
      
      <div className={styles.postsList}>
        {sortedPosts.map(post => (
          <PostItem
            key={post._id}
            post={post}
            // onEdit prop removed as we're handling navigation directly in PostItem
            onDelete={() => handleDeletePost(post._id)}
          />
        ))}
      </div>

      {/* EditPostModal removed */}
    </div>
  );
}