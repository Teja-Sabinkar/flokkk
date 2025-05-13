'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './PlaylistsTabDiscussions.module.css';
import { getPlaylistById } from '@/lib/playlists';
import { ReportModal, submitReport } from '@/components/report';
import { useRouter } from 'next/navigation';
import ShareModal from '@/components/share/ShareModal';
import { fetchUserProfile } from '@/lib/profile';

const DiscussionPost = ({ post, onHidePost, onRemoveFromPlaylist }) => {
  const router = useRouter(); // Add this line
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hideSuccess, setHideSuccess] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportContent, setReportContent] = useState(null);
  const [removeSuccess, setRemoveSuccess] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const menuRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Menu option handlers
  const handleSave = () => {
    console.log(`Saved: ${post.title}`);
    setIsMenuOpen(false);
  };

  // Implement hide functionality
  const handleHide = async () => {
    setIsMenuOpen(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to hide posts');
        return;
      }

      // Call API to hide the post
      const response = await fetch('/api/posts/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId: post.id || post._id })
      });

      if (!response.ok) {
        throw new Error('Failed to hide post');
      }

      // Show success message temporarily
      setHideSuccess(true);
      setTimeout(() => {
        setHideSuccess(false);

        // Call the parent function to remove this post from UI
        if (onHidePost) {
          onHidePost(post.id || post._id);
        }
      }, 1500);

    } catch (error) {
      console.error('Error hiding post:', error);
      alert('Failed to hide post. Please try again.');
    }
  };

  // Add handler for removing from playlist
  const handleRemoveFromPlaylist = () => {
    setIsMenuOpen(false);

    // Show success message immediately for better UX feedback
    setRemoveSuccess(true);

    // Call the parent handler function
    if (onRemoveFromPlaylist) {
      onRemoveFromPlaylist(post.id || post._id)
        .then(() => {
          // Success is already shown, just keep it visible for a moment
          setTimeout(() => {
            setRemoveSuccess(false);
          }, 1500);
        })
        .catch(error => {
          // Hide the success message if there was an error
          setRemoveSuccess(false);
          alert('Failed to remove post from playlist. Please try again.');
        });
    }
  };

  const handleReport = () => {
    setIsMenuOpen(false);
    setReportContent(post);
    setIsReportModalOpen(true);
  };

  // Handle report submission
  const handleReportSubmit = async (reportData) => {
    try {
      await submitReport(reportData);
      setIsReportModalOpen(false);
      setReportSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setReportSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  const handleDiscussionClick = () => {
    const postId = post.id || post._id;
    router.push(`/discussion?id=${postId}`);
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const generateColorFromUsername = (username) => {
    if (!username) return '#3b5fe2'; // Default blue color

    // Simple hash function for consistent color generation
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert hash to a hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }

    return color;
  };

  return (
    <div className={styles.postCard}>
      <div className={styles.postHeader}>
        <div className={styles.userInfo}>
          <div className={styles.avatarContainer}>
            {post.profilePicture && post.profilePicture !== '/profile-placeholder.jpg' ? (
              <Image
                src={post.profilePicture}
                alt={`${post.username}'s profile picture`}
                width={40}
                height={40}
                className={styles.avatarImage}
                priority
                unoptimized
                key={post.profilePicture} // Force re-render when URL changes
              />
            ) : (
              <div
                className={styles.avatarPlaceholder}
                style={{ backgroundColor: generateColorFromUsername(post.username) }}
              >
                <span className={styles.avatarInitial}>
                  {post.username ? post.username.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
            )}
          </div>
          <div className={styles.nameDate}>
            <Link href={`/otheruserprofile/${post.username}`} className={styles.username}>
              {post.username}
            </Link>
            <span className={styles.postDate}>{post.timeAgo || 'recently'}</span>
          </div>
        </div>

        <div className={styles.menuContainer} ref={menuRef}>
          <button
            className={styles.postMenu}
            aria-label="Post menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>

          {isMenuOpen && (
            <div className={styles.dropdown}>

              {/* Remove from playlist option */}
              <button
                className={styles.dropdownItem}
                onClick={handleRemoveFromPlaylist}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                <span>Remove</span>
              </button>

              <button
                className={styles.dropdownItem}
                onClick={handleHide}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
                <span>Hide</span>
              </button>
              <button
                className={styles.dropdownItem}
                onClick={handleReport}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <h2 className={styles.postTitle}>{post.title}</h2>
      <p className={styles.postDescription}>{post.content || post.description}</p>

      {post.image && (
        <div className={styles.postImageContainer}>
          <div className={styles.postImageWrapper}>
            <Image
              src={post.image}
              alt={post.title}
              width={600}
              height={300}
              className={styles.postImage}
              unoptimized
              priority
              key={`playlist-discussion-image-${post.id || post._id}-${post.image}`} // Force re-render when image changes
            />
          </div>
        </div>
      )}

      <div className={styles.postEngagement}>
        <button className={styles.commentsBtn} onClick={handleDiscussionClick}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>{post.commentsCount || post.discussions || '0'} Comments</span>
        </button>

        <button className={styles.shareBtn} onClick={handleShare}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
          <span>Share</span>
        </button>
      </div>

      {/* Add ShareModal component */}
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          postData={post}
        />
      )}

      {isReportModalOpen && reportContent && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmit={handleReportSubmit}
          contentDetails={{
            postId: reportContent.id || reportContent._id,
            userId: reportContent.userId,
            username: reportContent.username,
            title: reportContent.title,
            content: reportContent.content || reportContent.description,
            hashtags: reportContent.hashtags,
            image: reportContent.image
          }}
        />
      )}

    </div>
  );
};

const PlaylistsTabDiscussions = ({ playlist, onBack }) => {
  const [currentPlaylist, setCurrentPlaylist] = useState(playlist);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hiddenPostIds, setHiddenPostIds] = useState([]);
  const [userProfiles, setUserProfiles] = useState({}); // Store user profiles by username

  // Handle hiding a post
  const handleHidePost = (postId) => {
    // Existing code unchanged
    setHiddenPostIds(prev => [...prev, postId]);
    setPosts(prevPosts => prevPosts.filter(post =>
      (post.id !== postId && post._id !== postId)
    ));
  };



  // Handle removing a post from the playlist
  const handleRemoveFromPlaylist = async (postId) => {
    try {
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Call API to remove post from playlist
      const response = await fetch(`/api/playlists/${playlist.id}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to remove post from playlist');
      }

      // Update local state to remove the post
      setPosts(prevPosts =>
        prevPosts.filter(post => {
          const currentPostId = post.id || post._id;
          return currentPostId.toString() !== postId.toString();
        })
      );

      // Dispatch an event for playlist update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('playlist-updated'));
      }

      return true;
    } catch (error) {
      console.error('Error removing post from playlist:', error);
      throw error;
    }
  };


  const fetchUserProfiles = async (postsArray) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Get unique usernames from posts
    const usernames = [...new Set(postsArray.map(post => post.username))];

    // Fetch profile data for each unique user
    const profileData = {};

    await Promise.all(usernames.map(async (username) => {
      try {
        const userData = await fetchUserProfile(username, token);
        if (userData) {
          profileData[username] = userData;
        }
      } catch (error) {
        console.error(`Error fetching profile for ${username}:`, error);
      }
    }));

    setUserProfiles(profileData);

    // Update posts with latest profile pictures
    return postsArray.map(post => {
      const userProfile = profileData[post.username];
      return {
        ...post,
        profilePicture: userProfile?.profilePicture || post.profilePicture || '/profile-placeholder.jpg'
      };
    });
  };


  // Fetch playlist details with posts
  useEffect(() => {
    const fetchPlaylistDetails = async () => {
      try {
        setLoading(true);
        // Get detailed playlist data with posts
        const playlistDetails = await getPlaylistById(playlist.id);

        if (playlistDetails) {
          setCurrentPlaylist(playlistDetails);

          if (playlistDetails.posts && Array.isArray(playlistDetails.posts)) {
            // Fetch hidden posts to filter out any hidden posts from the playlist
            const token = localStorage.getItem('token');
            if (token) {
              try {
                const response = await fetch('/api/posts/hidden', {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });

                if (response.ok) {
                  const data = await response.json();
                  // Store hidden post IDs
                  const hiddenIds = data.hiddenPosts.map(hp => hp.postId);
                  setHiddenPostIds(hiddenIds);

                  // Filter out hidden posts
                  const filteredPosts = playlistDetails.posts.filter(post => {
                    const postId = post.id || post._id;
                    return !hiddenIds.includes(postId);
                  });

                  // Fetch latest user profiles and update posts with current profile pictures
                  const updatedPosts = await fetchUserProfiles(filteredPosts);
                  setPosts(updatedPosts);
                } else {
                  // If can't fetch hidden posts, show all posts with updated profiles
                  const updatedPosts = await fetchUserProfiles(playlistDetails.posts);
                  setPosts(updatedPosts);
                }
              } catch (error) {
                console.error('Error fetching hidden posts:', error);
                // Still show posts if hidden posts can't be fetched, with updated profiles
                const updatedPosts = await fetchUserProfiles(playlistDetails.posts);
                setPosts(updatedPosts);
              }
            } else {
              // Not logged in, show all posts
              setPosts(playlistDetails.posts);
            }
          } else {
            setPosts([]);
          }
        } else {
          throw new Error('Failed to fetch playlist details');
        }
      } catch (err) {
        console.error('Error fetching playlist details:', err);
        setError('Failed to load playlist details');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistDetails();

    // Listen for playlist updates and profile updates
    const handlePlaylistUpdate = () => {
      fetchPlaylistDetails();
    };

    window.addEventListener('playlist-updated', handlePlaylistUpdate);
    // Add listener for profile updates
    window.addEventListener('profile-updated', handlePlaylistUpdate);

    return () => {
      window.removeEventListener('playlist-updated', handlePlaylistUpdate);
      window.removeEventListener('profile-updated', handlePlaylistUpdate);
    };
  }, [playlist.id]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>

        <p className={styles.tabdescription}>posts in here are not accessable or visible to other users.</p>

        <button className={styles.backButton} onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Playlists</span>
        </button>
        <h1 className={styles.playlistTitle}>{currentPlaylist.title} - Discussions</h1>
      </div>

      <div className={styles.discussionsContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading discussions...</p>
          </div>
        ) : error ? (
          <div className={styles.errorMessage}>
            <p>{error}</p>
          </div>
        ) : posts.length > 0 ? (
          posts.map(post => (
            <DiscussionPost
              key={post.id || post._id}
              post={post}
              onHidePost={handleHidePost}
              onRemoveFromPlaylist={handleRemoveFromPlaylist}
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            <p>No discussions in this playlist yet.</p>
            <p>Save posts to this playlist to see them here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistsTabDiscussions;