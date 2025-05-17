// src/lib/analytics.js
import { track as vercelTrack } from '@vercel/analytics';

/**
 * Track a user event with Vercel Analytics
 * @param {string} eventName - Name of the event to track
 * @param {Object} properties - Additional properties to include with the event
 */
export function trackEvent(eventName, properties = {}) {
    // Track with Vercel Analytics
    vercelTrack(eventName, properties);

    // Log in development for debugging
    if (process.env.NODE_ENV === 'development') {
        console.log(`📊 [Analytics] ${eventName}`, properties);
    }
}

// Authentication Events
export const trackSignupCompleted = () => {
    trackEvent('signup_completed');
};

export const trackLogin = (method = 'email') => {
    trackEvent('login', { method });
};

// Content Creation Events
export const trackPostCreated = (postType) => {
    trackEvent('post_created', { type: postType });
};

export const trackCommentAdded = (postId) => {
    trackEvent('comment_added', { postId });
};

export const trackLinkContributed = (postId) => {
    trackEvent('link_contributed', { postId });
};

// Engagement Events
export const trackPostVoted = (postId, voteType) => {
    trackEvent('post_voted', { postId, type: voteType });
};

export const trackPostSaved = (postId, toPlaylist = true) => {
    trackEvent('post_saved', { postId, to_playlist: toPlaylist });
};

export const trackForumCreated = (forumName) => {
    trackEvent('forum_created', { name: forumName });
};

export const trackUserFollowed = (followedUserId) => {
    trackEvent('user_followed', { followedUserId });
};

// Feature Usage Events
export const trackSearchPerformed = (searchTerm) => {
    trackEvent('search_performed', {
        query_length: searchTerm?.length || 0,
        query: searchTerm // Be cautious with PII - consider if you need the actual query
    });
};

export const trackPlaylistCreated = (playlistName) => {
    trackEvent('playlist_created', { name: playlistName });
};

export const trackNotificationClicked = (notificationType) => {
    trackEvent('notification_clicked', { type: notificationType });
};