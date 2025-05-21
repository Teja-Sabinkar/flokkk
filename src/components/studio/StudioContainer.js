'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './StudioContainer.module.css';
import PostsList from './PostsList';
import CreateStudioDiscussionModal from './CreateStudioDiscussionModal';

export default function StudioContainer({ user }) {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // New sort state to track sorting options
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch posts from the API
  const fetchPosts = async () => {
    console.log('Fetching posts with active tab:', activeTab);
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Create query params with explicit logging
      const status = activeTab === 'all' ? 'all' : (activeTab === 'published' ? 'published' : 'draft');
      console.log(`Setting status filter to: ${status} based on activeTab: ${activeTab}`);
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        status: status,
        sortBy: sortBy,
        sortOrder: sortOrder
      });

      console.log(`Fetching from API with params: ${params.toString()}`);

      // Fetch posts from our API
      const response = await fetch(`/api/studio?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch posts');
      }

      const data = await response.json();
      console.log(`Received ${data.posts.length} posts from API`);
      console.log('Posts statuses:', data.posts.map(p => p.status).join(', '));
      
      // Transform API data to match the expected format for PostItem
      const formattedPosts = data.posts.map(post => {
        // Create a properly structured post object
        return {
          _id: post._id,
          id: post._id,  // Include both forms for compatibility
          title: post.title || '',
          content: post.content || '',
          status: post.status || 'published',  // Ensure status exists
          image: post.image || null,
          thumbnail: post.image || null, // Duplicate as thumbnail for PostItem
          createdAt: post.createdAt || new Date().toISOString(),
          updatedAt: post.updatedAt || post.createdAt || new Date().toISOString(),
          type: post.contentType === 'communityPost' ? 'post' : 'discussion',
          metrics: {
            views: post.views || post.metrics?.views || 0,
            comments: post.comments || post.metrics?.comments || 0,
            contributions: post.metrics?.contributions || 
                         ((post.communityLinks?.length || 0) + (post.creatorLinks?.length || 0)) || 0
          }
        };
      });
      
      console.log('StudioContainer formatted posts:', formattedPosts);
      setPosts(formattedPosts);
      setTotalPages(data.pagination.totalPages);
      
      // Fetch metrics for stats
      const metricsResponse = await fetch('/api/studio/metrics', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        
        setStats({
          total: metricsData.discussions.total,
          published: metricsData.discussions.published,
          draft: metricsData.discussions.draft
        });
      }
      
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load posts when component mounts or filters change
  useEffect(() => {
    fetchPosts();
  }, [activeTab, sortBy, sortOrder, currentPage]);

  // Toggle create modal
  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  // Create a new discussion
  const handleCreateDiscussion = async (discussionData) => {
    try {
      setIsLoading(true);
      
      // Log the entire discussion data for debugging
      console.log('Creating discussion with data:', discussionData);
      console.log('Status value:', discussionData.status);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      // First, upload the image if present
      let imageUrl = null;
      if (discussionData.thumbnailFile) {
        const formData = new FormData();
        formData.append('file', discussionData.thumbnailFile);
        formData.append('directory', 'posts');
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        
        if (!uploadResponse.ok) throw new Error('Image upload failed');
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.filepath;
      } else if (discussionData.thumbnailPreview && 
                !discussionData.thumbnailPreview.startsWith('/api/placeholder')) {
        // If there's a preview URL from fetched data, use that
        imageUrl = discussionData.thumbnailPreview;
      }
      
      // Create API request body with status explicitly highlighted for debugging
      const requestBody = {
        title: discussionData.title,
        content: discussionData.description || '',
        image: imageUrl || null,
        videoUrl: discussionData.videoUrl || null,
        hashtags: discussionData.hashtags || [],
        status: discussionData.status, // Explicitly pass status value
        creatorLinks: discussionData.creatorLinks || [],
        allowContributions: discussionData.allowContributions !== false
      };

      console.log('API request body:', requestBody);
      console.log('Status being sent to API:', requestBody.status);
      
      // Create the post
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create discussion');
      }
      
      // Refresh posts after creation
      fetchPosts();
      
      return true;
    } catch (err) {
      console.error('Error creating discussion:', err);
      setError('Failed to create discussion. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update post
  const handlePostUpdate = async (updatedPost) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/studio/posts/${updatedPost._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contentType: updatedPost.contentType,
          title: updatedPost.title,
          content: updatedPost.content,
          status: updatedPost.status,
          hashtags: updatedPost.tags || updatedPost.hashtags
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update post');
      }
      
      // Refresh posts after update
      fetchPosts();
      
      return true;
    } catch (err) {
      console.error('Error updating post:', err);
      return false;
    }
  };

  // Delete post
  const handlePostDelete = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/studio/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      // Remove post from state and refresh
      fetchPosts();
      
      return true;
    } catch (err) {
      console.error('Error deleting post:', err);
      return false;
    }
  };

  // Handle sort change
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // If clicking on the same column, toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking on a different column, set it as the new sort column and default to desc
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    
    // Reset to page 1 when sorting changes
    setCurrentPage(1);
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Loading state
  if (isLoading && posts.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading studio...</p>
      </div>
    );
  }

  // Error state
  if (error && posts.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <button 
          className={styles.retryButton}
          onClick={() => fetchPosts()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.studioContent}>
      <div className={styles.studioHeader}>
        <h1 className={styles.studioTitle}>Content Studio</h1>
        <button 
          className={styles.createPostButton}
          onClick={handleOpenCreateModal}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create New Post
        </button>
      </div>

      <div className={styles.statsContainer}>
        <div className={styles.statCard}>
          <h3>Total Posts</h3>
          <p className={styles.statNumber}>{stats.total}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Published</h3>
          <p className={styles.statNumber}>{stats.published}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Drafts</h3>
          <p className={styles.statNumber}>{stats.draft}</p>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'all' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Posts
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'published' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('published')}
        >
          Published
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'draft' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('draft')}
        >
          Drafts
        </button>
      </div>

      <PostsList 
        posts={posts} 
        isLoading={isLoading}
        error={error}
        onUpdate={handlePostUpdate}
        onDelete={handlePostDelete}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />

      {isCreateModalOpen && (
        <CreateStudioDiscussionModal 
          onClose={handleCloseCreateModal} 
          onSave={handleCreateDiscussion}
        />
      )}
    </div>
  );
}