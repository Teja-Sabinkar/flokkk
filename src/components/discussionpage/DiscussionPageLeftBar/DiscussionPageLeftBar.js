'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './DiscussionPageLeftBar.module.css';
import LinkItemModal from './LinkItemModal';
import AddLinkModal from './AddLinkModal';
import ContributeLinkModal from './ContributeLinkModal';

export default function DiscussionPageLeftBar({ postData, loading, error, currentUser }) {

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [creatorProfilePic, setCreatorProfilePic] = useState(null);
  // New state to track if the user is following the post creator
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);

  // Constants for link visibility
  const INITIAL_VISIBLE_COUNT = 3;

  // State for expandable sections
  const [creatorLinksExpanded, setCreatorLinksExpanded] = useState(true);
  const [communityLinksExpanded, setCommunityLinksExpanded] = useState(true);

  // State for number of visible links
  const [visibleCreatorLinks, setVisibleCreatorLinks] = useState(INITIAL_VISIBLE_COUNT);
  const [visibleCommunityLinks, setVisibleCommunityLinks] = useState(INITIAL_VISIBLE_COUNT);

  // Track user votes
  const [userVotes, setUserVotes] = useState({});

  // Track loading state for buttons
  const [loadingVotes, setLoadingVotes] = useState({});

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [selectedLink, setSelectedLink] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  // Add link modal state
  const [addLinkModalOpen, setAddLinkModalOpen] = useState(false);
  const [addLinkSection, setAddLinkSection] = useState(null); // 'creator' or 'community'

  // Contribute modal state
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);

  // State for links with sorting
  const [creatorLinksData, setCreatorLinksData] = useState([]);
  const [communityLinksData, setCommunityLinksData] = useState([]);

  // State for feedback messages
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // NEW: State for video playback
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoId, setVideoId] = useState(null);

  // Check if current user is the creator of the post
  const isPostCreator = currentUser && postData &&
    (currentUser.username === postData.username ||
      currentUser.id === postData.userId);
      
  // Check if contributions are allowed
  // FIXED: More explicit checking - handle both undefined and boolean values correctly
  // Convert to explicit boolean value to handle edge cases
  const isContributionsAllowed = postData?.allowContributions !== false;

  // Add detailed debugging to track the issue
  console.log('Post data with ID:', postData?.id || postData?._id);
  console.log('Raw allowContributions value:', postData?.allowContributions);
  console.log('allowContributions type:', typeof postData?.allowContributions);
  console.log('Is contributions allowed?', isContributionsAllowed);
  console.log('Is following creator?', isFollowingCreator);

  // Component for "Follow to contribute" message that can be clicked to follow
  const FollowToContributeButton = ({ onClick, isLoading }) => {
    return (
      <div 
        className={`${styles.contributionsDisabled} ${styles.followToContribute}`}
        onClick={onClick}
      >
        {isLoading ? (
          <>
            <div className={styles.smallLoader}></div>
            <span>Following...</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M19 8v6"></path>
              <path d="M22 11h-6"></path>
            </svg>
            <span>Follow</span>
          </>
        )}
      </div>
    );
  };

  // Handle follow action to enable contributions
  const handleFollowCreator = async () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (!postData || !postData.userId) {
      console.error('Missing post creator data');
      return;
    }

    try {
      setSubscribeLoading(true); // Reuse the existing loading state

      const token = localStorage.getItem('token');
      if (!token) return;

      // Make the API call to follow the creator
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: postData.userId,
          action: 'follow'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Follow creator response:', data);

        // Update subscription status and count
        setIsSubscribed(true);
        setIsFollowingCreator(true);
        if (data.followerCount !== undefined) {
          setSubscriberCount(data.followerCount);
        }

        // Show success feedback
        setFeedbackMessage({
          type: 'success',
          text: `You are now following ${postData.username}. You can now contribute links.`
        });

        // Clear feedback message after 5 seconds
        setTimeout(() => {
          setFeedbackMessage(null);
        }, 5000);
      } else {
        console.error('Error response from follow API:', await response.text());
        
        // Show error feedback
        setFeedbackMessage({
          type: 'error',
          text: 'Failed to follow creator. Please try again.'
        });

        // Clear feedback message after 5 seconds
        setTimeout(() => {
          setFeedbackMessage(null);
        }, 5000);
      }
    } catch (error) {
      console.error('Error following creator:', error);
      
      // Show error feedback
      setFeedbackMessage({
        type: 'error',
        text: 'An error occurred. Please try again.'
      });

      // Clear feedback message after 5 seconds
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 5000);
    } finally {
      setSubscribeLoading(false);
    }
  };

  // Update community links section
  useEffect(() => {
    if (postData) {
      // Log the allowContributions value to help debug
      console.log('Post data loaded with allowContributions:', {
        value: postData.allowContributions,
        type: typeof postData.allowContributions
      });
    }
  }, [postData]);

  // NEW: Extract YouTube video ID when postData changes
  useEffect(() => {
    if (postData && postData.videoUrl) {
      console.log('Video URL found:', postData.videoUrl);
      const extractedVideoId = extractYouTubeVideoId(postData.videoUrl);
      setVideoId(extractedVideoId);
      console.log('Extracted video ID:', extractedVideoId);
    } else {
      setVideoId(null);
      setIsVideoPlaying(false);
    }
  }, [postData]);

  // NEW: Function to extract YouTube video ID from URL
  const extractYouTubeVideoId = (url) => {
    if (!url) return null;

    let videoId = null;

    try {
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v');
      } else if (url.includes('youtu.be/')) {
        const parts = url.split('/');
        videoId = parts[parts.length - 1].split('?')[0];
      } else if (url.includes('youtube.com/embed/')) {
        const parts = url.split('/embed/');
        videoId = parts[parts.length - 1].split('?')[0];
      }
    } catch (error) {
      console.error('Error extracting YouTube video ID:', error);
    }

    return videoId;
  };

  // NEW: Toggle video playback
  const toggleVideoPlayback = () => {
    if (videoId) {
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  // Function to fetch user vote status for each link
  const fetchUserVoteStatus = async () => {
    if (!postData || !currentUser) return;

    const postId = postData.id || postData._id;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Fetch creator links vote status
      for (let i = 0; i < creatorLinksData.length; i++) {
        const response = await fetch(`/api/posts/${postId}/vote-creator?linkIndex=${i}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.userVote !== 0) {
            setUserVotes(prev => ({
              ...prev,
              [`creator-${creatorLinksData[i].id}`]: data.userVote === 1 ? 'up' : 'down'
            }));

            // Update vote count in UI if it's different
            if (data.voteCount !== creatorLinksData[i].votes) {
              setCreatorLinksData(prev => {
                const newLinks = [...prev];
                newLinks[i].votes = data.voteCount;
                return newLinks;
              });
            }
          }
        }
      }

      // Fetch community links vote status
      for (let i = 0; i < communityLinksData.length; i++) {
        const response = await fetch(`/api/posts/${postId}/vote-community?linkIndex=${i}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.userVote !== 0) {
            setUserVotes(prev => ({
              ...prev,
              [`community-${communityLinksData[i].id}`]: data.userVote === 1 ? 'up' : 'down'
            }));

            // Update vote count in UI if it's different
            if (data.voteCount !== communityLinksData[i].votes) {
              setCommunityLinksData(prev => {
                const newLinks = [...prev];
                newLinks[i].votes = data.voteCount;
                return newLinks;
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching vote status:', error);
    }
  };

  // Update creator links when post data is available
  useEffect(() => {
    if (postData) {
      console.log('Post data received in LeftBar:', postData);

      // Process creator links
      if (postData.creatorLinks && Array.isArray(postData.creatorLinks)) {
        console.log('Creator links found in post data:', JSON.stringify(postData.creatorLinks, null, 2));

        // Map post's creator links to the format expected by the component
        const formattedLinks = postData.creatorLinks.map((link, index) => {
          // Extra validation and logging for URL
          let linkUrl = link.url;

          if (!linkUrl || linkUrl === '#') {
            console.warn(`Creator link at index ${index} has missing or placeholder URL:`, link);
            // If URL is missing, use a clear placeholder that indicates it's missing
            linkUrl = '#';
          }

          return {
            id: index + 1, // Simple ID for UI purposes
            title: link.title || 'Untitled Link',
            description: link.description || '',
            url: linkUrl,
            votes: link.voteCount || 0,
            views: 0
          };
        });

        console.log('Formatted creator links for display:', formattedLinks);
        setCreatorLinksData(formattedLinks);
      } else {
        console.warn('No creator links array found in post data');
        setCreatorLinksData([]);
      }

      // Process community links
      if (postData.communityLinks && Array.isArray(postData.communityLinks)) {
        console.log('Community links found in post data:', JSON.stringify(postData.communityLinks, null, 2));

        // Map post's community links to the format expected by the component
        const formattedCommunityLinks = postData.communityLinks.map((link, index) => {
          return {
            id: index + 1, // Simple ID for UI purposes
            title: link.title || 'Untitled Link',
            description: link.description || '',
            url: link.url || '#',
            votes: link.voteCount || link.votes || 0,
            contributorUsername: link.contributorUsername || 'Anonymous',
          };
        });

        console.log('Formatted community links for display:', formattedCommunityLinks);
        setCommunityLinksData(formattedCommunityLinks);
      } else {
        console.warn('No community links array found in post data');
        setCommunityLinksData([]);
      }
    } else {
      console.log('No post data available yet');
    }
  }, [postData]);

  // Fetch vote status when links or current user changes
  useEffect(() => {
    if (creatorLinksData.length > 0 || communityLinksData.length > 0) {
      fetchUserVoteStatus();
    }
  }, [creatorLinksData.length, communityLinksData.length, currentUser]);

  // Modified to set isFollowingCreator state
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      // Only proceed if we have both current user and post data with userId
      if (!currentUser || !postData || !postData.userId) {
        console.log('Skipping subscription check - missing user or post data');
        return;
      }

      // Skip if current user is the post creator
      if (currentUser.id === postData.userId) {
        console.log('Skipping subscription check - user is post creator');
        return;
      }

      console.log('Checking subscription status:', {
        currentUserId: currentUser.id,
        postCreatorId: postData.userId
      });

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Direct API call to check follow status
        const response = await fetch(`/api/users/follow/check?targetId=${postData.userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Subscription check response:', data);

          // Update both isSubscribed and isFollowingCreator states
          setIsSubscribed(!!data.isFollowing);
          setIsFollowingCreator(!!data.isFollowing); // Set follow status for community links
          console.log('Set isSubscribed and isFollowingCreator to:', !!data.isFollowing);
        } else {
          console.error('Error response from subscription check:', await response.text());
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };

    // Run the check
    checkSubscriptionStatus();
  }, [currentUser, postData]);

  const handleSubscribeToggle = async () => {
    // Guard clauses for safety
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (!postData || !postData.userId) {
      console.error('Missing post creator data');
      return;
    }

    console.log('Subscribe toggle clicked, current status:', isSubscribed);

    try {
      setSubscribeLoading(true);

      const token = localStorage.getItem('token');
      if (!token) return;

      // Make the API call
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: postData.userId,
          action: isSubscribed ? 'unfollow' : 'follow'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Subscribe toggle response:', data);

        // Update both subscription status and count
        setIsSubscribed(!isSubscribed);
        setIsFollowingCreator(!isSubscribed); // Also update following creator status
        if (data.followerCount !== undefined) {
          setSubscriberCount(data.followerCount);
        }

        console.log('Updated isSubscribed and isFollowingCreator to:', !isSubscribed);
      } else {
        console.error('Error response from subscribe toggle:', await response.text());
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
    } finally {
      setSubscribeLoading(false);
    }
  };

  useEffect(() => {
    if (postData) {
      // Check for subscribers directly in postData
      if (postData.subscribers !== undefined) {
        setSubscriberCount(postData.subscribers);
        console.log('Subscriber count from postData:', postData.subscribers);
      }
      // If the creator ID is available, we can fetch their profile
      else if (postData.userId) {
        const fetchCreatorProfile = async () => {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/users/${postData.username}?id=${postData.userId}`, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
              const userData = await response.json();
              console.log('Creator profile data:', userData);
              if (userData.subscribers !== undefined) {
                setSubscriberCount(userData.subscribers);
              }
            }
          } catch (error) {
            console.error('Error fetching creator profile:', error);
          }
        };

        fetchCreatorProfile();
      }
    }
  }, [postData]);

  useEffect(() => {
    const fetchCreatorProfile = async () => {
      // Only fetch if we have a post with a creator ID
      if (!postData || !postData.userId) return;

      try {
        console.log("Fetching profile for creator:", postData.userId);

        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${postData.username || ''}?id=${postData.userId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.ok) {
          const userData = await response.json();
          console.log("Creator profile data:", userData);

          // Update profile picture if available
          if (userData.profilePicture) {
            console.log("Setting profile picture:", userData.profilePicture);
            setCreatorProfilePic(userData.profilePicture);
          }
        }
      } catch (error) {
        console.error('Error fetching creator profile:', error);
      }
    };

    fetchCreatorProfile();
  }, [postData]);

  const handleSubscribe = async () => {
    if (!currentUser) {
      // Redirect to login if not logged in
      window.location.href = '/login';
      return;
    }

    if (!postData || !postData.userId) {
      console.error('Missing post data or creator ID');
      return;
    }

    try {
      setIsSubscribeLoading(true);

      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: postData.userId,
          action: isSubscribed ? 'unfollow' : 'follow'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIsSubscribed(data.isFollowing);
        setIsFollowingCreator(data.isFollowing); // Update following creator status
        setSubscriberCount(data.followerCount);
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
    } finally {
      setIsSubscribeLoading(false);
    }
  };

  // Helper function to format subscriber count
  const formatSubscriberCount = (count) => {
    if (!count && count !== 0) return '0';

    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    } else {
      return count.toString();
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter links based on search query
  const filterLinks = (links) => {
    if (!searchQuery) return links;

    return links.filter(link =>
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Handle opening modal with selected link
  const openLinkModal = (link, section) => {
    setSelectedLink(link);
    setSelectedSection(section);
  };

  // Handle closing modal
  const closeLinkModal = () => {
    setSelectedLink(null);
    setSelectedSection(null);
  };

  // Handle opening add link modal
  const openAddLinkModal = (section, e) => {
    e.stopPropagation(); // Prevent toggling the section
    setAddLinkSection(section);
    setAddLinkModalOpen(true);
  };

  // Handle closing add link modal
  const closeAddLinkModal = () => {
    setAddLinkModalOpen(false);
    setAddLinkSection(null);
  };

  // Replace the openAddLinkModal function for 'community' with this:
  const openContributeModal = (e) => {
    e.stopPropagation(); // Prevent toggling the section
    setIsContributeModalOpen(true);
  };

  // Handle closing contribute modal
  const closeContributeModal = () => {
    setIsContributeModalOpen(false);
  };

  // Add handler for contribution submission
  const handleSubmitContribution = (contribution) => {
    console.log("Contribution submitted successfully:", contribution);
    // Show feedback message to user
    setFeedbackMessage({
      type: 'success',
      text: 'Your contribution was submitted successfully and is awaiting approval.'
    });

    // Clear feedback message after 5 seconds
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 5000);
  };

  // Handle adding a new link
  const handleAddLink = async (linkData) => {
    try {
      // Close the modal immediately after form submission
      // This provides instant UI feedback
      closeAddLinkModal();

      // Show a loading message
      setFeedbackMessage({
        type: 'success',
        text: 'Adding link...'
      });

      if (addLinkSection === 'creator') {
        // Set optimistic state update
        const newLink = {
          id: Date.now(), // Temporary client-side ID
          title: linkData.title,
          description: linkData.description,
          url: linkData.url,
          votes: 0,
          views: 0
        };

        // Optimistically update the UI
        setCreatorLinksData(prevLinks => {
          const updatedLinks = [...prevLinks, newLink];
          return sortLinksByVotes(updatedLinks);
        });

        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          throw new Error('You must be logged in to add links');
        }

        // Make sure we have a post ID
        if (!postData || (!postData.id && !postData._id)) {
          console.error('Cannot update post: missing post ID');
          throw new Error('Post ID not found');
        }

        const postId = postData.id || postData._id;

        // Prepare the API payload - we need to include all existing links plus the new one
        // Format links to match the expected structure
        const updatedCreatorLinks = [
          ...creatorLinksData.map(link => ({
            title: link.title,
            url: link.url,
            description: link.description || ''
          })),
          {
            title: linkData.title,
            url: linkData.url,
            description: linkData.description || ''
          }
        ];

        console.log('Updating post with new creator links:', updatedCreatorLinks);

        // Make API call to update the post with the new creator links
        const response = await fetch(`/api/posts/${postId}/links`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            creatorLinks: updatedCreatorLinks
          })
        });

        if (!response.ok) {
          // If API call fails, rollback the optimistic update
          throw new Error('Failed to save link');
        }

        const result = await response.json();
        console.log('Link saved successfully:', result);

        // Replace optimistic data with server data if returned
        if (result.creatorLinks) {
          const serverLinks = result.creatorLinks.map((link, index) => ({
            id: index + 1,
            title: link.title || 'Untitled Link',
            description: link.description || '',
            url: link.url || '#',
            votes: link.voteCount || 0,
            views: 0
          }));

          setCreatorLinksData(sortLinksByVotes(serverLinks));
        }

        // Update feedback message for success
        setFeedbackMessage({
          type: 'success',
          text: 'Link added successfully!'
        });

        // Clear feedback message after 3 seconds
        setTimeout(() => {
          setFeedbackMessage(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving creator link:', error);

      // Show error message
      setFeedbackMessage({
        type: 'error',
        text: error.message || 'Failed to save link. Please try again.'
      });

      // Clear feedback message after 5 seconds
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 5000);

      // Rollback optimistic update on error
      if (postData && postData.creatorLinks) {
        // Restore original links from post data
        const originalLinks = postData.creatorLinks.map((link, index) => ({
          id: index + 1,
          title: link.title || 'Untitled Link',
          description: link.description || '',
          url: link.url || '#',
          votes: link.voteCount || 0,
          views: 0
        }));

        setCreatorLinksData(originalLinks);
      }
    }
  };

  // Clear search query
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Function to sort links by vote count (descending)
  const sortLinksByVotes = (links) => {
    return [...links].sort((a, b) => b.votes - a.votes);
  };

  // Handle show more for creator links
  const handleShowMoreCreator = () => {
    // Increase the number of visible creator links by 3
    setVisibleCreatorLinks(prev => Math.min(prev + 3, creatorLinksData.length));
  };

  // Handle show less for creator links
  const handleShowLessCreator = () => {
    // Reset to initial count
    setVisibleCreatorLinks(INITIAL_VISIBLE_COUNT);
  };

  // Handle show more for community links
  const handleShowMoreCommunity = () => {
    // Increase the number of visible community links by 3
    setVisibleCommunityLinks(prev => Math.min(prev + 3, communityLinksData.length));
  };

  // Handle show less for community links
  const handleShowLessCommunity = () => {
    // Reset to initial count
    setVisibleCommunityLinks(INITIAL_VISIBLE_COUNT);
  };

  // Enhanced handle vote function with toggle functionality
  const handleVote = async (linkId, section, isUpvote) => {
    try {
      // Create a unique key for this link
      const voteKey = `${section}-${linkId}`;
      const loadingKey = `loading-${voteKey}`;

      // Don't allow voting if already in progress
      if (loadingVotes[loadingKey]) {
        return;
      }

      // Make sure we have a valid post ID
      if (!postData || (!postData.id && !postData._id)) {
        console.error('Cannot vote: missing post ID');
        setFeedbackMessage({
          type: 'error',
          text: 'Error: Could not submit vote'
        });
        return;
      }

      const postId = postData.id || postData._id;

      // Check if we're toggling the current vote
      const currentVote = userVotes[voteKey];
      const isToggling = (isUpvote && currentVote === 'up') || (!isUpvote && currentVote === 'down');

      // Calculate vote value based on toggling behavior
      let voteValue;
      if (isToggling) {
        // If clicking the same button, remove the vote (0)
        voteValue = 0;
      } else {
        // Otherwise set a new vote (1 for upvote, -1 for downvote)
        voteValue = isUpvote ? 1 : -1;
      }

      // Set loading state for this button
      setLoadingVotes(prev => ({
        ...prev,
        [loadingKey]: true
      }));

      // Find the actual index of the link in the array
      let linkArrayIndex;

      if (section === 'creator') {
        linkArrayIndex = creatorLinksData.findIndex(link => link.id === linkId);
      } else {
        linkArrayIndex = communityLinksData.findIndex(link => link.id === linkId);
      }

      if (linkArrayIndex === -1) {
        console.error(`Link with ID ${linkId} not found in ${section} links`);
        setLoadingVotes(prev => ({
          ...prev,
          [loadingKey]: false
        }));
        return;
      }

      // Optimistically update UI
      if (section === 'creator') {
        setCreatorLinksData(prev => {
          const newLinks = [...prev];
          const link = newLinks[linkArrayIndex];

          // Calculate vote change
          let voteChange = 0;

          if (isToggling) {
            // Removing a vote
            voteChange = isUpvote ? -1 : 1;
          } else if (currentVote === 'up' && !isUpvote) {
            // Changing from upvote to downvote
            voteChange = -2;
          } else if (currentVote === 'down' && isUpvote) {
            // Changing from downvote to upvote
            voteChange = 2;
          } else {
            // New vote
            voteChange = isUpvote ? 1 : -1;
          }

          // Update vote count
          link.votes += voteChange;

          // Sort by votes (descending)
          return sortLinksByVotes(newLinks);
        });
      } else {
        // Update community links in the same way
        setCommunityLinksData(prev => {
          const newLinks = [...prev];
          const link = newLinks[linkArrayIndex];

          // Calculate vote change
          let voteChange = 0;

          if (isToggling) {
            // Removing a vote
            voteChange = isUpvote ? -1 : 1;
          } else if (currentVote === 'up' && !isUpvote) {
            // Changing from upvote to downvote
            voteChange = -2;
          } else if (currentVote === 'down' && isUpvote) {
            // Changing from downvote to upvote
            voteChange = 2;
          } else {
            // New vote
            voteChange = isUpvote ? 1 : -1;
          }

          // Update vote count
          link.votes += voteChange;

          // Sort by votes (descending)
          return sortLinksByVotes(newLinks);
        });
      }

      // Update user votes tracking (UI state)
      setUserVotes(prev => {
        const newVotes = { ...prev };

        if (isToggling) {
          // Remove the vote
          delete newVotes[voteKey];
        } else {
          // Set new vote
          newVotes[voteKey] = isUpvote ? 'up' : 'down';
        }

        return newVotes;
      });

      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication required to vote');
        setFeedbackMessage({
          type: 'error',
          text: 'You must be logged in to vote'
        });

        // Reset loading state
        setLoadingVotes(prev => ({
          ...prev,
          [loadingKey]: false
        }));
        return;
      }

      // Make API call to vote endpoint
      const apiUrl = section === 'creator'
        ? `/api/posts/${postId}/vote-creator`
        : `/api/posts/${postId}/vote-community`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          linkIndex: linkArrayIndex,
          voteValue: voteValue
        })
      });

      console.log(`API Response status: ${response.status}`);

      // Reset loading state
      setLoadingVotes(prev => ({
        ...prev,
        [loadingKey]: false
      }));

      if (!response.ok) {
        // If API call fails, show error
        console.error('Vote API error:', response.status);

        // Try to get more detailed error information
        try {
          const errorData = await response.json();
          console.error('Error details:', errorData);
        } catch (e) {
          console.error('Could not parse error response');
        }

        setFeedbackMessage({
          type: 'error',
          text: 'Failed to save vote. Please try again.'
        });

        // Revert optimistic update by fetching current state
        fetchUserVoteStatus();
        return;
      }

      // On success, get the server result
      const result = await response.json();
      console.log('Vote recorded successfully:', result);

      // Update with the server values for consistency
      if (section === 'creator') {
        setCreatorLinksData(prev => {
          const newLinks = [...prev];
          if (linkArrayIndex >= 0 && linkArrayIndex < newLinks.length) {
            newLinks[linkArrayIndex].votes = result.voteCount;
          }
          return newLinks;
        });
      } else {
        setCommunityLinksData(prev => {
          const newLinks = [...prev];
          if (linkArrayIndex >= 0 && linkArrayIndex < newLinks.length) {
            newLinks[linkArrayIndex].votes = result.voteCount;
          }
          return newLinks;
        });
      }

      // Update user vote to match server
      if (result.userVote === 0) {
        setUserVotes(prev => {
          const newVotes = { ...prev };
          delete newVotes[voteKey];
          return newVotes;
        });
      } else {
        setUserVotes(prev => ({
          ...prev,
          [voteKey]: result.userVote === 1 ? 'up' : 'down'
        }));
      }

      // Show success message
      setFeedbackMessage({
        type: 'success',
        text: 'Vote recorded successfully!'
      });

      // Clear feedback after 3 seconds
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 3000);

    } catch (error) {
      console.error('Error voting on link:', error);

      // Reset loading state for all buttons
      setLoadingVotes({});

      setFeedbackMessage({
        type: 'error',
        text: 'An error occurred while voting'
      });
    }
  };

  // Function to open a URL when clicking on a creator link
  const openCreatorLink = (link, e) => {
    e.stopPropagation(); // Prevent opening the modal

    // Only open if there's a valid URL (not a placeholder)
    if (link.url && link.url !== '#') {
      console.log(`Opening link URL: ${link.url}`);
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('Cannot open link with invalid URL:', link);
    }
  };

  const generateColorFromUsername = (username) => {
    if (!username) return '#3b5fe2'; // Default blue color

    // Simple hash function for consistent color generation
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

  return (
    <div className={styles.leftBarContainer}>
      {/* Video Container - Modified to handle YouTube videos */}
      <div
        className={`${styles.videoContainer} ${videoId ? styles.hasVideo : ''}`}
        onClick={toggleVideoPlayback}
      >
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <p>Error loading content</p>
          </div>
        ) : videoId ? (
          // YouTube video embed
          isVideoPlaying ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className={styles.videoIframe}
              key={`video-iframe-${videoId}`} // Force re-render when video changes
            ></iframe>
          ) : (
            // YouTube thumbnail with play button overlay
            <div className={styles.videoThumbnail}>
              <Image
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                alt={postData?.title || "Video thumbnail"}
                fill
                style={{ objectFit: 'cover' }}
                className={styles.thumbnailImage}
                unoptimized
                priority
                key={`video-thumb-${videoId}`} // Force re-render when video changes
              />
              <div className={styles.playButtonOverlay}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="red"
                  stroke="white"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" fill="rgba(0, 0, 0, 0.6)"></circle>
                  <polygon points="10 8 16 12 10 16 10 8" fill="white" stroke="none"></polygon>
                </svg>
              </div>
            </div>
          )
        ) : postData && postData.image ? (
          // Regular post image
          <Image
            src={postData.image || "/api/placeholder/600/300"}
            alt={postData.title || "Post image"}
            fill
            style={{ objectFit: 'cover' }}
            className={styles.postImage}
            unoptimized
            priority
            key={`post-image-${postData.id || postData._id}-${postData.image}`} // Force re-render when image changes
          />
        ) : (
          // Fallback placeholder
          <div className={styles.imagePlaceholder}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <p>No image available</p>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className={styles.profileInfo}>
        {/* Add profile picture */}
        <div className={styles.profilePicture}>
          {creatorProfilePic && creatorProfilePic !== '/profile-placeholder.jpg' ? (
            <Image
              src={creatorProfilePic}
              alt={`${postData?.username || 'User'}'s profile`}
              width={40}
              height={40}
              className={styles.profileImage}
              priority
              unoptimized
              key={creatorProfilePic} // Force re-render when URL changes
            />
          ) : (
            <div
              className={styles.initialAvatar}
              style={{
                backgroundColor: generateColorFromUsername(postData?.username || ''),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              {postData?.username ? postData.username.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>

        <div className={styles.profileDetails}>
          <Link href={
            currentUser && postData &&
              (currentUser.username === postData.username || currentUser.id === postData.userId)
              ? `/currentprofile/${currentUser?.username || ''}`
              : `/otheruserprofile/${postData?.username || ''}`
          }>
            <h2 className={`${styles.channelName} ${styles.clickableChannelName}`}>
              {postData ? postData.username || 'Unknown User' : 'Unknown User'}
            </h2>
          </Link>
          <span className={styles.subscriberCount}>
            {subscriberCount || 0} {subscriberCount === 1 ? 'subscriber' : 'subscribers'}
          </span>
        </div>

        {/* Button remains unchanged */}
        {currentUser && postData && (
          currentUser.id === postData.userId ? (
            <Link href={`/currentprofile/${currentUser.username || ''}`}>
              <button className={`${styles.subscribeButton} ${styles.viewProfileButton}`}>
                View Profile
              </button>
            </Link>
          ) : (
            <button
              className={`${styles.subscribeButton} ${isSubscribed ? styles.subscribedButton : ''}`}
              onClick={handleSubscribeToggle}
              disabled={isSubscribeLoading}
            >
              {isSubscribeLoading
                ? 'Loading...'
                : isSubscribed
                  ? 'Subscribed'
                  : 'Subscribe'
              }
            </button>
          )
        )}
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className={`${styles.feedbackMessage} ${styles[feedbackMessage.type]}`}>
          {feedbackMessage.text}
        </div>
      )}

      {/* Link Search */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search for links..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={handleSearchChange}
        />
        {searchQuery && (
          <button
            className={styles.clearButton}
            onClick={clearSearch}
            title="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
        <button className={styles.searchButton}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>

      {/* Creator Links Section */}
      <div className={styles.linksSection}>
        <div className={styles.sectionHeader}>
          <div
            className={styles.sectionTitleContainer}
            onClick={() => setCreatorLinksExpanded(!creatorLinksExpanded)}
          >
            <h3 className={styles.sectionTitle}>Creator Links</h3>
            <div className={styles.sectionToggle}>
              {creatorLinksExpanded ? '▼' : '▶'}
            </div>
          </div>

          {/* Only show Add Link button if current user is the post creator */}
          {isPostCreator && (
            <button
              className={styles.addLinkButton}
              onClick={(e) => openAddLinkModal('creator', e)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Link
            </button>
          )}
        </div>

        {creatorLinksExpanded && (
          <div className={styles.linksList}>
            {creatorLinksData.length === 0 ? (
              <div className={styles.noLinksMessage}>
                No creator links available for this post.
              </div>
            ) : (
              filterLinks(creatorLinksData).slice(0, visibleCreatorLinks).map((link) => (
                <div
                  key={link.id}
                  className={styles.linkItem}
                  onClick={() => openLinkModal(link, 'creator')}
                >
                  <div className={styles.linkContent}>
                    <div className={styles.linkContentTop}>
                      <span className={styles.linkTitle}>
                        {link.title}
                      </span>
                    </div>
                    <p className={styles.linkDescription}>{link.description}</p>
                    <div className={styles.linkStats}>
                      <span className={styles.linkTag}>{link.url && link.url !== '#' ? link.url.substring(0, 20) + '...' : '#'}</span>
                    </div>
                  </div>
                  <div className={styles.voteContainer} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`${styles.voteButton} ${styles.upvoteButton} ${userVotes[`creator-${link.id}`] === 'up' ? styles.active : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(link.id, 'creator', true);
                      }}
                      disabled={loadingVotes[`loading-creator-${link.id}`]}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 4l8 8h-16l8-8z" />
                      </svg>
                    </button>
                    <span className={styles.voteCount}>{link.votes}</span>
                    <button
                      className={`${styles.voteButton} ${styles.downvoteButton} ${userVotes[`creator-${link.id}`] === 'down' ? styles.active : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(link.id, 'creator', false);
                      }}
                      disabled={loadingVotes[`loading-creator-${link.id}`]}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20l-8-8h16l-8 8z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Show message when no matches found */}
            {creatorLinksData.length > 0 && filterLinks(creatorLinksData).length === 0 && (
              <div className={styles.noResultsMessage}>
                No matches found for "{searchQuery}"
              </div>
            )}

            {/* Buttons for showing more/less */}
            {filterLinks(creatorLinksData).length > 0 && (
              <div className={styles.buttonContainer}>
                {visibleCreatorLinks < filterLinks(creatorLinksData).length && (
                  <button
                    className={styles.showMoreButton}
                    onClick={handleShowMoreCreator}
                  >
                    Show More
                  </button>
                )}

                {visibleCreatorLinks > INITIAL_VISIBLE_COUNT && filterLinks(creatorLinksData).length > INITIAL_VISIBLE_COUNT && (
                  <button
                    className={styles.showLessButton}
                    onClick={handleShowLessCreator}
                  >
                    Show Less
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Community Links Section - UPDATED with Follow requirement */}
      <div className={styles.linksSection}>
        <div className={styles.sectionHeader}>
          <div
            className={styles.sectionTitleContainer}
            onClick={() => setCommunityLinksExpanded(!communityLinksExpanded)}
          >
            <h3 className={styles.sectionTitle}>Community Links</h3>
            <div className={styles.sectionToggle}>
              {communityLinksExpanded ? '▼' : '▶'}
            </div>
          </div>

          {/* Display contribute button or appropriate message based on conditions */}
          {currentUser && !isPostCreator ? (
            isContributionsAllowed ? (
              isFollowingCreator ? (
                <button
                  className={styles.addLinkButton}
                  onClick={openContributeModal}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Contribute
                </button>
              ) : (
                <FollowToContributeButton 
                  onClick={handleFollowCreator}
                  isLoading={subscribeLoading}
                />
              )
            ) : (
              <div className={styles.contributionsDisabled}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="5" y1="5" x2="19" y2="19"></line>
                </svg>
                <span>Contributions disabled</span>
              </div>
            )
          ) : null}
        </div>

        {communityLinksExpanded && (
          <div className={styles.linksList}>
            {communityLinksData.length === 0 ? (
              <div className={styles.noLinksMessage}>
                {isContributionsAllowed ? (
                  isFollowingCreator ? 
                    "No community links yet. Be the first to contribute!" :
                    "No community links yet. Follow the creator to contribute."
                ) : (
                  "No community links available. The creator has disabled contributions."
                )}
              </div>
            ) : (
              filterLinks(communityLinksData).slice(0, visibleCommunityLinks).map((link) => (
                <div
                  key={link.id}
                  className={styles.linkItem}
                  onClick={() => openLinkModal(link, 'community')}
                >
                  <div className={styles.linkContent}>
                    <div className={styles.linkContentTop}>
                      <span className={styles.linkTitle}>
                        {link.title}
                      </span>
                    </div>
                    <p className={styles.linkDescription}>{link.description}</p>
                    <div className={styles.linkStats}>
                      <span className={styles.contributorInfo}>
                        Contributed by: {link.contributorUsername}
                      </span>
                    </div>
                  </div>
                  <div className={styles.voteContainer} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`${styles.voteButton} ${styles.upvoteButton} ${userVotes[`community-${link.id}`] === 'up' ? styles.active : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(link.id, 'community', true);
                      }}
                      disabled={loadingVotes[`loading-community-${link.id}`]}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 4l8 8h-16l8-8z" />
                      </svg>
                    </button>
                    <span className={styles.voteCount}>{link.votes}</span>
                    <button
                      className={`${styles.voteButton} ${styles.downvoteButton} ${userVotes[`community-${link.id}`] === 'down' ? styles.active : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(link.id, 'community', false);
                      }}
                      disabled={loadingVotes[`loading-community-${link.id}`]}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20l-8-8h16l-8 8z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
            
            {/* Empty state with Follow button when no contributions but following is required */}
            {communityLinksData.length === 0 && isContributionsAllowed && !isFollowingCreator && currentUser && !isPostCreator && (
              <div className={styles.emptyStateWithAction}>
                <button 
                  className={styles.followCreatorButton}
                  onClick={handleFollowCreator}
                  disabled={subscribeLoading}
                >
                  {subscribeLoading ? (
                    <>
                      <div className={styles.smallLoader}></div>
                      Following...
                    </>
                  ) : (
                    'Follow Creator'
                  )}
                </button>
                <p className={styles.emptyStateHelp}>
                  You need to follow {postData?.username || 'the creator'} to contribute links.
                </p>
              </div>
            )}

            {/* Show message when no matches found */}
            {communityLinksData.length > 0 && filterLinks(communityLinksData).length === 0 && (
              <div className={styles.noResultsMessage}>
                No matches found for "{searchQuery}"
              </div>
            )}

            {/* Buttons for showing more/less */}
            {filterLinks(communityLinksData).length > 0 && (
              <div className={styles.buttonContainer}>
                {visibleCommunityLinks < filterLinks(communityLinksData).length && (
                  <button
                    className={styles.showMoreButton}
                    onClick={handleShowMoreCommunity}
                  >
                    Show More
                  </button>
                )}

                {visibleCommunityLinks > INITIAL_VISIBLE_COUNT && filterLinks(communityLinksData).length > INITIAL_VISIBLE_COUNT && (
                  <button
                    className={styles.showLessButton}
                    onClick={handleShowLessCommunity}
                  >
                    Show Less
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for expanded link item */}
      {selectedLink && (
        <LinkItemModal
          link={selectedLink}
          section={selectedSection}
          onClose={closeLinkModal}
          onVote={handleVote}
          userVote={userVotes[`${selectedSection}-${selectedLink.id}`]}
          isVoting={
            selectedSection &&
            selectedLink &&
            loadingVotes[`loading-${selectedSection}-${selectedLink.id}`]
          }
          currentUser={currentUser} // Pass the current user to the modal
        />
      )}

      {/* Modal for adding new links */}
      {addLinkModalOpen && (
        <AddLinkModal
          section={addLinkSection}
          onClose={closeAddLinkModal}
          onAddLink={handleAddLink}
        />
      )}

      {/* Contribute modal - only show if contributions are allowed AND user is following creator */}
      {isContributeModalOpen && isContributionsAllowed && isFollowingCreator && (
        <ContributeLinkModal
          postId={postData?._id || postData?.id}
          postCreatorId={postData?.userId}
          onClose={() => setIsContributeModalOpen(false)}
          onSubmit={handleSubmitContribution}
        />
      )}
    </div>
  );
}