// src/lib/claudeDbService.js
import { connectToDatabase } from './mongodb';
import dbConnect from './mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import CommunityPost from '@/models/CommunityPost';
import Forum from '@/models/Forum';

/**
 * Service to safely query MongoDB for Claude AI
 * This provides controlled access to database information
 */
export const claudeDbService = {
  /**
   * Initialize database connections
   */
  async init() {
    try {
      // Connect to MongoDB using both direct client and mongoose
      await Promise.all([
        connectToDatabase(),
        dbConnect()
      ]);

      return true;
    } catch (error) {
      console.error('Error initializing Claude DB service:', error);
      return false;
    }
  },

  /**
   * Perform a comprehensive search across the database for a query
   * This follows the priority order: posts -> links -> comments
   * @param {string} query - Search terms
   */
  async comprehensiveSearch(query, limit = 10) {
    try {
      if (!query) return { posts: [], links: [], comments: [] };

      await this.init();

      // Create search regex for case-insensitive search
      const searchRegex = new RegExp(query, 'i');

      // 1. Search for posts
      const searchQuery = {
        $or: [
          { title: searchRegex },
          { content: searchRegex },
          { hashtags: searchRegex }
        ]
      };

      // Find matching posts
      const posts = await Post.find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Format post results
      const postResults = posts.map(post => ({
        id: post._id.toString(),
        title: post.title,
        content: post.content?.substring(0, 200) + (post.content?.length > 200 ? '...' : ''),
        username: post.username,
        hashtags: post.hashtags,
        createdAt: post.createdAt
      }));

      // 2. Find links (both creator and community) 
      const linkResults = [];

      // Search for links in all posts (not just the ones matching the query)
      const allPosts = await Post.find({})
        .limit(100) // Use a reasonable limit
        .lean();

      for (const post of allPosts) {
        // Find matching creator links
        if (post.creatorLinks && Array.isArray(post.creatorLinks)) {
          const matchingLinks = post.creatorLinks.filter(link =>
            (link.title && searchRegex.test(link.title)) ||
            (link.description && searchRegex.test(link.description)) ||
            (link.url && searchRegex.test(link.url))
          ).map(link => ({
            postId: post._id.toString(),
            postTitle: post.title,
            linkType: 'creator',
            title: link.title,
            url: link.url,
            description: link.description || '',
            votes: link.voteCount || link.votes || 0,
            contributorUsername: post.username
          }));

          if (matchingLinks.length > 0) {
            linkResults.push(...matchingLinks);
          }
        }

        // Find matching community links
        if (post.communityLinks && Array.isArray(post.communityLinks)) {
          const matchingLinks = post.communityLinks.filter(link =>
            (link.title && searchRegex.test(link.title)) ||
            (link.description && searchRegex.test(link.description)) ||
            (link.url && searchRegex.test(link.url))
          ).map(link => ({
            postId: post._id.toString(),
            postTitle: post.title,
            linkType: 'community',
            title: link.title,
            url: link.url,
            description: link.description || '',
            votes: link.votes || 0,
            contributorUsername: link.contributorUsername
          }));

          if (matchingLinks.length > 0) {
            linkResults.push(...matchingLinks);
          }
        }
      }

      // Return all results organized by type
      return {
        posts: postResults,
        links: linkResults,
        comments: [] // Keep this for now
      };
    } catch (error) {
      console.error('Error performing comprehensive search for Claude:', error);
      return { posts: [], links: [], comments: [] };
    }
  },

  /**
   * Find posts by search query terms
   * @param {string} query - Search terms
   * @param {number} limit - Maximum number of results to return
   */
  async searchPosts(query, limit = 5) {
    try {
      if (!query) return [];

      await this.init();

      // Create search criteria
      const searchRegex = new RegExp(query, 'i');
      const searchQuery = {
        $or: [
          { title: searchRegex },
          { content: searchRegex },
          { hashtags: searchRegex }
        ]
      };

      // Find matching posts
      const posts = await Post.find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Return simplified data
      return posts.map(post => ({
        id: post._id.toString(),
        title: post.title,
        content: post.content?.substring(0, 200) + (post.content?.length > 200 ? '...' : ''),
        username: post.username,
        hashtags: post.hashtags,
        createdAt: post.createdAt
      }));
    } catch (error) {
      console.error('Error searching posts for Claude:', error);
      return [];
    }
  },

  /**
   * Find links that match a query across posts
   * @param {string} query - Search terms
   * @param {number} limit - Maximum number of results to return
   */
  async searchLinks(query, limit = 10) {
    try {
      if (!query) return [];

      await this.init();

      const searchRegex = new RegExp(query, 'i');
      const linkResults = [];

      // Get a sample of recent posts to search through
      const posts = await Post.find({})
        .sort({ createdAt: -1 })
        .limit(50) // Look through a reasonable number of posts
        .lean();

      // Search for links in each post
      for (const post of posts) {
        // Search creator links
        if (post.creatorLinks && Array.isArray(post.creatorLinks)) {
          const matchingCreatorLinks = post.creatorLinks.filter(link =>
          (searchRegex.test(link.title) ||
            searchRegex.test(link.url) ||
            searchRegex.test(link.description || ''))
          ).map(link => ({
            postId: post._id.toString(),
            postTitle: post.title,
            type: 'creator',
            title: link.title,
            url: link.url,
            description: link.description || '',
            votes: link.voteCount || 0
          }));

          linkResults.push(...matchingCreatorLinks);
        }

        // Search community links
        if (post.communityLinks && Array.isArray(post.communityLinks)) {
          const matchingCommunityLinks = post.communityLinks.filter(link =>
          (searchRegex.test(link.title) ||
            searchRegex.test(link.url) ||
            searchRegex.test(link.description || ''))
          ).map(link => ({
            postId: post._id.toString(),
            postTitle: post.title,
            type: 'community',
            title: link.title,
            url: link.url,
            description: link.description || '',
            votes: link.votes || 0,
            contributorUsername: link.contributorUsername
          }));

          linkResults.push(...matchingCommunityLinks);
        }

        // Stop if we've reached our limit
        if (linkResults.length >= limit) {
          break;
        }
      }

      // Return results limited to requested number
      return linkResults.slice(0, limit);
    } catch (error) {
      console.error('Error searching links for Claude:', error);
      return [];
    }
  },

  /**
   * Find and summarize comments that match a query
   * @param {string} query - Search terms
   * @param {number} limit - Maximum number of results to return
   */
  async searchComments(query, limit = 10) {
    try {
      if (!query) return [];

      await this.init();

      const searchRegex = new RegExp(query, 'i');
      const commentResults = [];

      // Get posts - we'll search their comments
      const posts = await Post.find({})
        .sort({ createdAt: -1 })
        .limit(20) // Look through a reasonable number of posts
        .lean();

      // This function needs to be customized based on your comment structure
      // If you have a separate Comment model, you'd query that directly

      // Placeholder implementation - assumes comments are stored within posts
      for (const post of posts) {
        // If comments are stored in the post
        if (post.comments && Array.isArray(post.comments)) {
          const matchingComments = post.comments.filter(comment =>
            (comment.text && searchRegex.test(comment.text))
          ).map(comment => ({
            postId: post._id.toString(),
            postTitle: post.title,
            commentId: comment._id?.toString() || 'unknown',
            text: comment.text,
            username: comment.username || comment.user?.username || 'unknown',
            timestamp: comment.timestamp || comment.createdAt || new Date()
          }));

          if (matchingComments.length > 0) {
            commentResults.push(...matchingComments);
          }
        }
      }

      // Return results limited to requested number
      return commentResults.slice(0, limit);
    } catch (error) {
      console.error('Error searching comments for Claude:', error);
      return [];
    }
  },

  /**
   * Find a specific post by ID
   * @param {string} postId - The post ID to lookup
   */
  async getPostById(postId) {
    try {
      if (!postId) return null;

      await this.init();

      const post = await Post.findById(postId).lean();

      if (!post) return null;

      // Return relevant post data
      return {
        id: post._id.toString(),
        title: post.title,
        content: post.content,
        username: post.username,
        hashtags: post.hashtags,
        createdAt: post.createdAt,
        creatorLinks: post.creatorLinks?.map(link => ({
          title: link.title,
          url: link.url,
          description: link.description
        })) || [],
        communityLinks: post.communityLinks?.map(link => ({
          title: link.title,
          url: link.url,
          description: link.description,
          contributorUsername: link.contributorUsername
        })) || []
      };
    } catch (error) {
      console.error('Error getting post by ID for Claude:', error);
      return null;
    }
  },

  /**
   * Get user profile information by username
   * @param {string} username - Username to lookup
   */
  async getUserByUsername(username) {
    try {
      if (!username) return null;

      await this.init();

      // Find user with limited projection for privacy
      const user = await User.findOne(
        { username },
        {
          _id: 1,
          username: 1,
          name: 1,
          bio: 1,
          location: 1,
          website: 1,
          joinDate: 1,
          subscribers: 1,
          discussions: 1
        }
      ).lean();

      if (!user) return null;

      return {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        bio: user.bio,
        location: user.location,
        website: user.website,
        joinDate: user.joinDate,
        subscribers: user.subscribers,
        discussions: user.discussions
      };
    } catch (error) {
      console.error('Error getting user by username for Claude:', error);
      return null;
    }
  },

  /**
   * Find recent posts by a specific user
   * @param {string} username - Username to find posts for
   * @param {number} limit - Maximum number of posts to return
   */
  async getRecentPostsByUser(username, limit = 5) {
    try {
      if (!username) return [];

      await this.init();

      // Find posts by the user
      const posts = await Post.find({ username })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return posts.map(post => ({
        id: post._id.toString(),
        title: post.title,
        content: post.content?.substring(0, 150) + (post.content?.length > 150 ? '...' : ''),
        hashtags: post.hashtags,
        createdAt: post.createdAt
      }));
    } catch (error) {
      console.error('Error getting user posts for Claude:', error);
      return [];
    }
  },

  /**
   * Find posts with similar hashtags to a given post
   * @param {string} postId - The post ID to find related content for
   * @param {number} limit - Maximum number of related posts
   */
  async getRelatedPosts(postId, limit = 3) {
    try {
      if (!postId) return [];

      await this.init();

      // Get the original post
      const originalPost = await Post.findById(postId).lean();
      if (!originalPost || !originalPost.hashtags || originalPost.hashtags.length === 0) {
        return [];
      }

      // Find posts with similar hashtags, excluding the original
      const relatedPosts = await Post.find({
        _id: { $ne: postId },
        hashtags: { $in: originalPost.hashtags }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return relatedPosts.map(post => ({
        id: post._id.toString(),
        title: post.title,
        username: post.username,
        hashtags: post.hashtags,
        createdAt: post.createdAt
      }));
    } catch (error) {
      console.error('Error getting related posts for Claude:', error);
      return [];
    }
  },

  /**
   * Find top/trending posts across the platform
   * @param {number} limit - Maximum number of posts to return
   */
  async getTrendingPosts(limit = 5) {
    try {
      await this.init();

      // Find posts with most comments/activity
      // This is a simplistic approach - in production you'd want a more sophisticated trending algorithm
      const posts = await Post.find()
        .sort({ discussions: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      return posts.map(post => ({
        id: post._id.toString(),
        title: post.title,
        username: post.username,
        hashtags: post.hashtags,
        discussions: post.discussions,
        createdAt: post.createdAt
      }));
    } catch (error) {
      console.error('Error getting trending posts for Claude:', error);
      return [];
    }
  },

  /**
   * Find forums by topics/keywords
   * @param {string} topic - Topic to search for
   * @param {number} limit - Maximum number of forums to return
   */
  async searchForums(topic, limit = 3) {
    try {
      if (!topic) return [];

      await this.init();

      // Check if Forum model exists
      if (!Forum) return [];

      const searchRegex = new RegExp(topic, 'i');

      // Find forums matching the topic
      const forums = await Forum.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ]
      })
        .limit(limit)
        .lean();

      return forums.map(forum => ({
        id: forum._id.toString(),
        title: forum.title,
        description: forum.description,
        createdBy: forum.createdBy,
        postCount: forum.postCount || 0
      }));
    } catch (error) {
      console.error('Error searching forums for Claude:', error);
      return [];
    }
  }
};

export default claudeDbService;