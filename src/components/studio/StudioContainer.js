'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import styles from './StudioContainer.module.css';
import PostsList from './PostsList';
import CreateStudioDiscussionModal from './CreateStudioDiscussionModal';

export default function StudioContainer({ user }) {
  const router = useRouter();
  const { theme } = useTheme();
  const [allPosts, setAllPosts] = useState([]); // Store ALL posts here
  const [displayPosts, setDisplayPosts] = useState([]); // Posts filtered for display
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Sort state
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch ALL posts initially, then filter locally for tabs
  const fetchPosts = async () => {
    console.log('Fetching ALL posts with enhanced engagement metrics');
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Always fetch ALL posts
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,  // Increased limit to make sure we get everything
        status: 'all',
        sortBy: sortBy,
        sortOrder: sortOrder
      });

      console.log(`Fetching from API with params: ${params.toString()}`);

      // Fetch posts from our enhanced API
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
      console.log(`Received ${data.posts.length} posts from API with enhanced metrics`);
      
      // Transform API data to match the expected format for PostItem
      const formattedPosts = data.posts.map(post => {
        // Explicitly determine if this post should be considered published
        // If it doesn't have status='draft', consider it published
        const isDraft = 
          post.status === 'draft' || 
          post.status === 'Draft' || 
          post.status === 'DRAFT';
        
        const isPublished = !isDraft;
        
        // NEW: Use enhanced engagement metrics from the API
        const enhancedMetrics = {
          // Use 'appeared' count as 'views' (this aligns with analytics page)
          views: post.metrics?.appeared || 0,
          // Use real engagement tracking data
          comments: post.metrics?.comments || 0,
          contributions: post.metrics?.contributions || 0,
          // Additional metrics for potential future use
          appeared: post.metrics?.appeared || 0,
          viewed: post.metrics?.viewed || 0,
          penetrated: post.metrics?.penetrated || 0,
          saves: post.metrics?.saves || 0,
          shares: post.metrics?.shares || 0
        };
        
        console.log(`📊 Post "${post.title}" formatted metrics:`, enhancedMetrics);
        
        return {
          _id: post._id,
          id: post._id,
          title: post.title || '',
          content: post.content || '',
          status: isDraft ? 'draft' : 'published', // Normalize status to only 'draft' or 'published'
          image: post.image || null,
          thumbnail: post.image || null,
          createdAt: post.createdAt || new Date().toISOString(),
          updatedAt: post.updatedAt || post.createdAt || new Date().toISOString(),
          type: post.contentType === 'communityPost' ? 'post' : 'discussion',
          // NEW: Use enhanced metrics that align with analytics page
          metrics: enhancedMetrics,
          // Add our own flags for filtering
          isDraft: isDraft,
          isPublished: isPublished
        };
      });
      
      // Log post statuses and metrics for debugging
      console.log("Posts with enhanced metrics:");
      formattedPosts.forEach(post => {
        console.log(`${post.title}: status=${post.status}, appeared=${post.metrics.appeared}, comments=${post.metrics.comments}, contributions=${post.metrics.contributions}`);
      });
      
      // Store all posts
      setAllPosts(formattedPosts);
      
      // Calculate counts for stats
      const publishedCount = formattedPosts.filter(post => post.isPublished).length;
      const draftCount = formattedPosts.filter(post => post.isDraft).length;
      
      // Update stats manually based on our count
      setStats({
        total: formattedPosts.length,
        published: publishedCount,
        draft: draftCount
      });
      
      setTotalPages(data.pagination.totalPages);
      
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter posts locally based on activeTab
  useEffect(() => {
    console.log(`Filtering for ${activeTab} tab from ${allPosts.length} total posts`);
    
    if (allPosts.length === 0) {
      setDisplayPosts([]);
      return;
    }
    
    let filtered = [];
    
    if (activeTab === 'all') {
      filtered = allPosts;
    } else if (activeTab === 'published') {
      filtered = allPosts.filter(post => post.isPublished);
      console.log(`Found ${filtered.length} published posts`);
    } else { // draft tab
      filtered = allPosts.filter(post => post.isDraft);
      console.log(`Found ${filtered.length} draft posts`);
    }
    
    setDisplayPosts(filtered);
  }, [activeTab, allPosts]);

  // Load posts when component mounts or sort/page changes
  useEffect(() => {
    fetchPosts();
  }, [sortBy, sortOrder, currentPage]);

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
        imageUrl = discussionData.thumbnailPreview;
      }
      
      // Create API request body
      const requestBody = {
        title: discussionData.title,
        content: discussionData.description || '',
        image: imageUrl || null,
        videoUrl: discussionData.videoUrl || null,
        hashtags: discussionData.hashtags || [],
        status: discussionData.status,
        creatorLinks: discussionData.creatorLinks || [],
        allowContributions: discussionData.allowContributions !== false
      };
      
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
      
      // Refresh posts after deletion
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
  if (isLoading && displayPosts.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading studio...</p>
      </div>
    );
  }

  // Error state
  if (error && displayPosts.length === 0) {
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
        posts={displayPosts} 
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
        activeTab={activeTab}
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