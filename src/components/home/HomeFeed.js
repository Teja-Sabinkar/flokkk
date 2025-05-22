'use client';

import { useState, useEffect } from 'react';
import Post from './Post';
import CreateDiscussionModal from './CreateDiscussionModal';
import styles from './HomeFeed.module.css';
import { createPost, fetchPosts } from '@/lib/posts';

export default function HomeFeed() {
  // State for controlling the discussion modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for posts
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Function to open the modal
  const openModal = () => setIsModalOpen(true);

  // Function to close the modal
  const closeModal = () => setIsModalOpen(false);

  // Fetch posts on component mount
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        let postsData;
        // Try the feed endpoint first
        try {
          const response = await fetch('/api/posts/feed?limit=10', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });

          if (response.ok) {
            const data = await response.json();
            postsData = data.posts || [];
          }
        } catch (feedError) {
          console.warn('Feed API not available, falling back to regular posts API');
          const data = await fetchPosts({ token, limit: 10 });
          postsData = data.posts || [];
        }

        // Enhance posts with user profile pictures
        const enhancedPosts = await Promise.all(postsData.map(async (post) => {
          if (!post.userImage && post.userId) {
            try {
              // Fetch user data to get profile picture
              const userResponse = await fetch(`/api/users?id=${post.userId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
              });

              if (userResponse.ok) {
                const userData = await userResponse.json();
                return {
                  ...post,
                  userImage: userData.profilePicture || null
                };
              }
            } catch (error) {
              console.error(`Error fetching user data for post ${post._id}:`, error);
            }
          }
          return post;
        }));

        setPosts(enhancedPosts);

      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');

        if (token) {
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            setCurrentUser(userData);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Update the addNewPost function in HomeFeed.js
  const addNewPost = async (newPostData) => {
    try {
      setLoading(true);

      // Get the token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to create a post');
        return;
      }

      // Handle image upload if there's a file
      let imageUrl = null;
      if (newPostData.thumbnailFile) {
        const formData = new FormData();
        formData.append('file', newPostData.thumbnailFile);
        formData.append('directory', 'posts');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          console.error('Upload error:', errorData);
          throw new Error(errorData.message || 'Image upload failed');
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.filepath;
      } else if (newPostData.thumbnailPreview && !newPostData.thumbnailPreview.startsWith('/api/placeholder')) {
        // If there's a preview URL from fetched data, use that
        imageUrl = newPostData.thumbnailPreview;
      }

      // Explicitly handle creator links with robust protection against undefined values
      let creatorLinks = [];
      if (newPostData.creatorLinks && Array.isArray(newPostData.creatorLinks)) {
        creatorLinks = newPostData.creatorLinks.filter(link => link && typeof link === 'object')
          .map(link => ({
            title: link.title?.trim() || '',
            url: link.url?.trim() || '',
            description: link.description?.trim() || ''
          }));
      }

      // Check if allowContributions setting is provided, default to true if not specified
      // IMPORTANT: Convert to boolean explicitly to avoid any type issues
      const allowContributions = newPostData.allowContributions === false ? false : true;

      // Prepare post data with explicit creator links and allowContributions setting
      const postData = {
        title: newPostData.title,
        content: newPostData.description || '',
        image: imageUrl || '/api/placeholder/600/300',
        videoUrl: newPostData.videoUrl || null,
        hashtags: newPostData.hashtags || [],
        isDiscussion: true,
        // Explicitly include creator links
        creatorLinks: creatorLinks,
        // Add the allowContributions setting
        allowContributions: allowContributions
      };

      // Send post data to API with a longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Failed to create post';
        try {
          const errorData = await response.json();
          console.error('Post creation error:', errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse the error response
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      const createdPost = await response.json();

      // Add the new post to the top of the posts list
      setPosts(prevPosts => [createdPost, ...prevPosts]);

      // Publish an event that other components can listen for
      const event = new CustomEvent('post-created', {
        detail: { post: createdPost }
      });
      window.dispatchEvent(event);

      // Close the modal
      closeModal();
    } catch (error) {
      console.error('Error creating post:', error);
      alert(error.message || 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add this temporary test button to any component for debugging
  const testAppearanceTracking = async () => {
    const token = localStorage.getItem('token');
    const testPostId = '682e9c1a76e295f5999d44c3'; // Real post ID from your database

    console.log('🧪 Testing appearance tracking...');

    try {
      const response = await fetch(`/api/posts/${testPostId}/track-appear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('📊 Test result:', data);

      // Now test fetching the post to see if metrics are returned
      const postResponse = await fetch(`/api/posts/${testPostId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const postData = await postResponse.json();
      console.log('📈 Post data with metrics:', postData.metrics);
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  };



  return (
    <div className={styles.homeFeed}>
      {/* Create Discussion Button */}
      <button
        className={styles.createDiscussionBtn}
        onClick={openModal}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
        Create Discussion
      </button>


      {/* Loading and error states */}
      {loading && posts.length === 0 && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading discussions...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorContainer}>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      )}

      {/* Posts List */}
      <div className={styles.postsList}>


        <button
          onClick={testAppearanceTracking}
          style={{
            position: 'fixed',
            top: '100px',
            right: '100px',
            zIndex: 9999,
            background: '#4169e1',
            color: 'white',
            padding: '10px',
            borderRadius: '4px',
            border: 'none'
          }}
        >
          Test Tracking
        </button>

        {posts.length > 0 ? (
          posts
            .filter(post => post && (post._id || post.id)) // Only show posts with valid IDs
            .map((post, index) => (
              <Post
                key={post._id || post.id || `post-${index}`}
                post={{
                  id: post._id || post.id, // Try both
                  _id: post._id || post.id, // Include both formats
                  username: post.username || 'Anonymous',
                  userImage: post.userImage,
                  date: post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date',
                  timeAgo: post.createdAt ? getTimeAgo(post.createdAt) : '',
                  title: post.title || 'Untitled Post',
                  content: post.content || '',
                  image: post.image || '/api/placeholder/600/300',
                  videoUrl: post.videoUrl, // IMPORTANT: Pass the videoUrl
                  discussions: post.discussions?.toString() || '0',
                  shares: post.shares || 0,
                  hashtags: post.hashtags || []
                }}
              />
            ))
        ) : !loading && (
          <div className={styles.noPostsContainer}>
            <p>No discussions found. Be the first to create one!</p>
          </div>
        )}
      </div>

      {/* Create Discussion Modal */}
      <CreateDiscussionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={addNewPost}
      />
    </div>
  );
}

// Helper function to calculate time ago
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  // Time intervals in seconds
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  let counter;
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    counter = Math.floor(seconds / secondsInUnit);
    if (counter > 0) {
      return `${counter} ${unit}${counter !== 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}