'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './StudioContainer.module.css';
import PostsList from './PostsList';
import CreateStudioDiscussionModal from './CreateStudioDiscussionModal';

// Updated mock data with local image paths instead of external URLs
const MOCK_POSTS = [
  {
    _id: '1',
    title: 'Getting Started with React Hooks',
    content: 'React Hooks are a powerful way to add state and lifecycle features to functional components...',
    status: 'published',
    createdAt: '2025-04-29T10:30:00Z',
    metrics: {
      views: 342,
      comments: 27,
      contributions: 8
    },
    // Don't use external URLs
    thumbnail: null
  },
  {
    _id: '2',
    title: 'The Future of AI in Web Development',
    content: 'Artificial intelligence is rapidly changing how we build and interact with web applications...',
    status: 'published',
    createdAt: '2025-05-10T14:20:00Z',
    metrics: {
      views: 523,
      comments: 41,
      contributions: 12
    },
    thumbnail: null
  },
  {
    _id: '3',
    title: 'CSS Grid Layout: Tips and Tricks',
    content: 'CSS Grid provides a powerful layout system for modern web design. Here are some advanced techniques...',
    status: 'published',
    createdAt: '2025-05-01T09:15:00Z',
    metrics: {
      views: 187,
      comments: 13,
      contributions: 5
    },
    thumbnail: null
  },
  {
    _id: '4',
    title: 'Building Responsive UIs with Tailwind CSS',
    content: 'Tailwind CSS provides a utility-first approach to styling that can speed up your development workflow...',
    status: 'draft',
    createdAt: '2025-05-15T16:45:00Z',
    metrics: {
      views: 0,
      comments: 0,
      contributions: 0
    },
    thumbnail: null
  },
  {
    _id: '5',
    title: 'Server-Side Rendering vs. Static Site Generation',
    content: 'Comparing different rendering strategies for modern web applications and when to use each approach...',
    status: 'draft',
    createdAt: '2025-05-16T11:30:00Z',
    metrics: {
      views: 0,
      comments: 0,
      contributions: 0
    },
    thumbnail: null
  },
  {
    _id: '6',
    title: 'JavaScript Performance Optimization Techniques',
    content: 'Discover ways to make your JavaScript code run faster and consume fewer resources...',
    status: 'published',
    createdAt: '2025-04-25T13:20:00Z',
    metrics: {
      views: 276,
      comments: 19,
      contributions: 7
    },
    thumbnail: null
  },
  {
    _id: '7',
    title: 'Introduction to WebAssembly',
    content: 'WebAssembly is changing how we think about performance on the web. Learn the basics in this guide...',
    status: 'published',
    createdAt: '2025-05-08T10:10:00Z',
    metrics: {
      views: 192,
      comments: 14,
      contributions: 3
    },
    thumbnail: null
  }
];

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
  // State to control modal visibility
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Load mock data instead of fetching from API
  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setPosts(MOCK_POSTS);
      
      // Calculate stats from mock data
      setStats({
        total: MOCK_POSTS.length,
        published: MOCK_POSTS.filter(post => post.status === 'published').length,
        draft: MOCK_POSTS.filter(post => post.status === 'draft').length
      });
      
      setIsLoading(false);
    }, 1000); // 1 second delay to simulate loading
    
    return () => clearTimeout(timer);
  }, []);

  // Toggle create modal
  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  // Handle creating a new discussion (mock implementation)
  const handleCreateDiscussion = async (discussionData) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a new post with mock ID and date
      const newPost = {
        _id: `new-${Date.now()}`,
        title: discussionData.title,
        content: discussionData.description,
        status: discussionData.status || 'published',
        createdAt: new Date().toISOString(),
        metrics: {
          views: 0,
          comments: 0,
          contributions: 0
        },
        tags: discussionData.hashtags,
        category: discussionData.category,
        type: discussionData.type || 'discussion',
        youtubeUrl: discussionData.videoUrl || null,
        youtubeMetadata: discussionData.youtubeMetadata || null,
        creator: {
          links: discussionData.creatorLinks || []
        },
        community: {
          allowContributions: discussionData.allowContributions
        },
        thumbnail: discussionData.thumbnailPreview
      };
      
      // Update local state
      setPosts(prevPosts => [newPost, ...prevPosts]);
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        total: prevStats.total + 1,
        published: prevStats.published + (discussionData.status === 'published' ? 1 : 0),
        draft: prevStats.draft + (discussionData.status === 'draft' ? 1 : 0)
      }));

      console.log('Created new discussion:', newPost);
      return true;
    } catch (err) {
      console.error('Error creating discussion:', err);
      return false;
    }
  };

  // Handle post update (mock implementation)
  const handlePostUpdate = async (updatedPost) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === updatedPost._id ? { ...post, ...updatedPost } : post
        )
      );
      
      // Update stats if status changed
      const oldPost = posts.find(p => p._id === updatedPost._id);
      if (oldPost && oldPost.status !== updatedPost.status) {
        setStats(prevStats => {
          const newStats = { ...prevStats };
          
          if (oldPost.status === 'published') newStats.published--;
          if (oldPost.status === 'draft') newStats.draft--;
          
          if (updatedPost.status === 'published') newStats.published++;
          if (updatedPost.status === 'draft') newStats.draft++;
          
          return newStats;
        });
      }

      return true;
    } catch (err) {
      console.error('Error updating post:', err);
      return false;
    }
  };

  // Handle post deletion (mock implementation)
  const handlePostDelete = async (postId) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Find post before removing it
      const postToDelete = posts.find(p => p._id === postId);
      
      // Update local state
      setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
      
      // Update stats
      if (postToDelete) {
        setStats(prevStats => ({
          ...prevStats,
          total: prevStats.total - 1,
          published: prevStats.published - (postToDelete.status === 'published' ? 1 : 0),
          draft: prevStats.draft - (postToDelete.status === 'draft' ? 1 : 0)
        }));
      }

      return true;
    } catch (err) {
      console.error('Error deleting post:', err);
      return false;
    }
  };

  // Filter posts based on active tab
  const filteredPosts = posts.filter(post => {
    if (activeTab === 'all') return true;
    if (activeTab === 'published') return post.status === 'published';
    if (activeTab === 'draft') return post.status === 'draft';
    return true;
  });

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
        posts={filteredPosts} 
        isLoading={isLoading} 
        error={error}
        onUpdate={handlePostUpdate}
        onDelete={handlePostDelete}
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